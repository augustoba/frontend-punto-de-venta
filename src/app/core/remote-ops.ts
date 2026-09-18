import { Api } from './api';
import { Db } from './models';
import { METHOD_TO_API, mapSale } from './mappers';

/**
 * Operaciones de escritura del store contra pos-api. El nombre de cada una coincide con el método del `Store`
 * que reemplaza cuando el modo servidor está activo; después de cada llamada el store recarga todo desde la API.
 * Los ids del front son texto y los del servidor números: se convierten con `n`.
 */
export type Op = (api: Api, db: Db, ...args: any[]) => Promise<unknown>;
const n = (v: string | null | undefined): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const put = (api: Api, url: string, body: unknown) => api.put(url, body);
const day = (iso: string) => String(iso ?? '').slice(0, 10);
const up = (v: string) => String(v).toUpperCase();

const categoryBody = (db: Db, id: string, patch: { name?: string; emoji?: string; color?: string; subs?: string[] }) => {
  const c = db.categories.find((x) => x.id === id)!;
  return { name: patch.name ?? c.name, emoji: patch.emoji ?? c.emoji, color: patch.color ?? c.color, subcategories: patch.subs ?? c.subs.map((s) => s.name) };
};

export const REMOTE_OPS: Record<string, Op> = {
  // ----- tesorería -----
  addMovement: (api, _db, i) => api.post('/api/movements', { accountId: n(i.accountId), amount: i.amount, category: i.category, subcategory: i.subcategory, description: i.description, at: i.at }),
  transfer: (api, _db, from: string, to: string, amount: number, description: string) => api.post('/api/transfers', { fromId: n(from), toId: n(to), amount, description }),
  saveAccount: (api, _db, a, initial = 0) => {
    const body = { name: a.name, type: String(a.type ?? 'caja').toUpperCase(), color: a.color, notes: a.notes, initial };
    return a.id ? put(api, `/api/accounts/${a.id}`, body) : api.post('/api/accounts', body);
  },
  saveCategory: (api, db, c) => c.id
    ? put(api, `/api/categories/${c.id}`, categoryBody(db, c.id, c))
    : api.post('/api/categories', { name: c.name, emoji: c.emoji, color: c.color, subcategories: [] }),
  deleteCategory: (api, _db, id: string) => api.del(`/api/categories/${id}`),
  addSubcategory: (api, db, catId: string, name: string) => {
    const subs = db.categories.find((c) => c.id === catId)!.subs.map((s) => s.name);
    return put(api, `/api/categories/${catId}`, categoryBody(db, catId, { subs: [...subs, name] }));
  },
  deleteSubcategory: (api, db, catId: string, id: string) => {
    const subs = db.categories.find((c) => c.id === catId)!.subs.filter((s) => s.id !== id).map((s) => s.name);
    return put(api, `/api/categories/${catId}`, categoryBody(db, catId, { subs }));
  },

  // ----- catálogo -----
  saveProduct: (api, db, p, initialStock = 0) => {
    const cur = p.id ? db.products.find((x) => x.id === p.id) : undefined;
    const m = { ...cur, ...p };
    const data = {
      name: m.name, barcode: m.barcode ?? '', categoryId: n(m.categoryId), supplierId: n(m.supplierId), cost: m.cost ?? 0, price: m.price ?? 0,
      offer: m.offer ?? 0, lowStock: m.lowStock ?? 0, idealStock: m.idealStock ?? 0, iva: m.iva ?? 21,
      combo: (m.combo ?? []).map((c: any) => ({ productId: Number(c.productId), qty: c.qty })),
    };
    return p.id ? put(api, `/api/products/${p.id}`, data) : api.post('/api/products', { data, initialStock });
  },
  setStock: (api, _db, id: string, value: number) => put(api, `/api/products/${id}/stock`, { value }),
  archiveProducts: (api, _db, ids: string[], archived: boolean) => api.post('/api/products/archive', { ids: ids.map(Number), flag: archived }),
  deleteProducts: (api, _db, ids: string[]) => api.post('/api/products/delete', { ids: ids.map(Number), flag: false }),
  bulkPrice: (api, _db, ids: string[], target: 'price' | 'offer', mode: 'pct' | 'fijo', value: number, round: boolean) =>
    api.post('/api/products/bulk-price', { ids: ids.map(Number), offer: target === 'offer', percent: mode === 'pct', value, round }),

  // ----- personas -----
  saveCustomer: (api, _db, c) => (c.id ? put(api, `/api/customers/${c.id}`, c) : api.post('/api/customers', c)),
  saveSupplier: (api, _db, s) => (s.id ? put(api, `/api/suppliers/${s.id}`, s) : api.post('/api/suppliers', s)),
  customerMovement: (api, _db, id: string, kind: string, amount: number, accountId: string | null, comment: string) =>
    api.post(`/api/customers/${id}/movements`, { kind, amount, accountId: n(accountId), comment }),
  supplierMovement: (api, _db, id: string, kind: string, amount: number, accountId: string | null, comment: string) =>
    api.post(`/api/suppliers/${id}/movements`, { kind, amount, accountId: n(accountId), comment }),

  // ----- caja y ventas -----
  openCash: (api, _db, accountId: string, balance: number, notes: string) => api.post('/api/cash/open', { accountId: n(accountId), balance, notes }),
  closeCash: (api, _db, real: number, notes: string) => api.post('/api/cash/close', { real, notes }),
  setSessionVerified: (api, _db, id: string, verified: boolean) => put(api, `/api/cash/sessions/${id}/verified`, { verified }),
  setSessionNote: (api, _db, id: string, note: string) => put(api, `/api/cash/sessions/${id}/note`, { note }),
  registerSale: (api, _db, i) => api.post('/api/sales', {
    customerId: n(i.customerId), lines: i.lines.map((l: any) => ({ productId: Number(l.productId), qty: l.qty, price: l.price ?? null, discountUnit: l.discountUnit ?? null })),
    discountPct: i.discountPct, method: METHOD_TO_API[i.method as keyof typeof METHOD_TO_API], paid: i.paid, notes: i.notes, invoice: i.invoice,
    budgetId: n(i.budgetId), autoDiscount: i.autoDiscount ?? null, priceListId: i.priceListId ?? null,
  }),
  deleteSale: (api, _db, id: string) => api.del(`/api/sales/${id}`),
  createInvoice: (api, _db, customerId: string | null, items: string, total: number, ivaRate = 21) => api.post('/api/invoices', { customerId: n(customerId), items, total, ivaRate }),

  // ----- compras -----
  savePurchase: (api, _db, id: string | null, supplierId: string, lines: any[], name: string) => {
    const body = { supplierId: n(supplierId), lines: lines.map((l) => ({ productId: Number(l.productId), qty: l.qty, cost: l.cost })), name };
    return id ? put(api, `/api/purchases/${id}`, body) : api.post('/api/purchases', body);
  },
  markOrdered: (api, _db, id: string) => api.post(`/api/purchases/${id}/order`),
  receivePurchase: (api, _db, id: string, paid: boolean, accountId: string | null) => api.post(`/api/purchases/${id}/receive`, { paid, accountId: n(accountId) }),
  deletePurchase: (api, _db, id: string) => api.del(`/api/purchases/${id}`),

  // ----- presupuestos, cheques, centros de costos -----
  saveBudget: (api, _db, id: string | null, customerId: string | null, expires: string, lines: any[], notes: string) => {
    const body = { customerId: n(customerId), expires: day(expires), lines: lines.map((l) => ({ productId: Number(l.productId), name: l.name, qty: l.qty, price: l.price })), notes };
    return id ? put(api, `/api/budgets/${id}`, body) : api.post('/api/budgets', body);
  },
  setBudgetStatus: (api, _db, id: string, status: string) => put(api, `/api/budgets/${id}/status`, { status: up(status) }),
  deleteBudget: (api, _db, id: string) => api.del(`/api/budgets/${id}`),
  saveCheque: async (api, _db, c) => {
    const body = { kind: up(c.kind), amount: c.amount, due: day(c.due), customerId: n(c.customerId), description: c.description ?? '' };
    const saved = c.id ? await put(api, `/api/cheques/${c.id}`, body) : await api.post('/api/cheques', body);
    if (c.collected !== undefined && saved?.id) await put(api, `/api/cheques/${saved.id}/collected`, { collected: !!c.collected });
    return saved;
  },
  deleteCheque: (api, _db, id: string) => api.del(`/api/cheques/${id}`),
  saveCostCenter: (api, _db, name: string, allocation: string) => api.post('/api/cost-centers', { name, allocation: up(allocation) }),
  deleteCostCenter: (api, _db, id: string) => api.del(`/api/cost-centers/${id}`),
  addFixedCost: (api, _db, centerId: string, name: string, monthly: number, notes: string) => api.post(`/api/cost-centers/${centerId}/costs`, { name, monthly, notes }),
  deleteFixedCost: (api, db, centerId: string, id: string) => {
    const idx = db.costCenters.find((c) => c.id === centerId)?.costs.findIndex((f) => f.id === id) ?? -1;
    return idx < 0 ? Promise.resolve() : api.del(`/api/cost-centers/${centerId}/costs/${idx}`);
  },

  // ----- personal -----
  addEmployee: (api, _db, e) => api.post('/api/employees', { name: e.name, lastName: e.lastName, email: e.email, role: up(e.role), hired: day(e.hired) }),
  addShift: (api, _db, employeeId: string, date: string, from: string, to: string, notes: string) =>
    api.post('/api/shifts', { employeeId: n(employeeId), day: date, clockIn: from, clockOut: to, notes }),

  // ----- ajustes -----
  updateSettings: (api, db, patch) => put(api, '/api/settings', { ...db.settings, ...patch }),
};

/** Métodos del store que devuelven algo (id nuevo o la venta): en modo servidor devuelven una promesa con este resultado. */
export const REMOTE_RESULT: Record<string, (response: any, args: any[]) => unknown> = {
  saveProduct: (r, a) => String(r?.id ?? a[0]?.id ?? ''),
  saveCustomer: (r, a) => String(r?.id ?? a[0]?.id ?? ''),
  saveSupplier: (r, a) => String(r?.id ?? a[0]?.id ?? ''),
  savePurchase: (r) => String(r?.id ?? ''),
  saveBudget: (r) => String(r?.id ?? ''),
  registerSale: (r) => mapSale(r),
};
