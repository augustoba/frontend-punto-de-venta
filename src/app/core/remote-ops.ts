import { Api } from './api';
import { Db } from './models';

/**
 * Operaciones de escritura del store contra pos-api. El nombre de cada una coincide con el método del `Store`
 * que reemplaza cuando el modo servidor está activo; después de cada llamada el store recarga todo desde la API.
 * Los ids del front son texto y los del servidor números: se convierten con `n`.
 */
export type Op = (api: Api, db: Db, ...args: any[]) => Promise<unknown>;
const n = (v: string | null | undefined): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const put = (api: Api, url: string, body: unknown) => api.put(url, body);

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

  // ----- ajustes -----
  updateSettings: (api, db, patch) => put(api, '/api/settings', { ...db.settings, ...patch }),
};
