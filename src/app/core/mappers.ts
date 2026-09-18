import {
  Account, Budget, CashSession, Category, Cheque, CostCenter, Customer, Employee, Invoice, Movement, PartyEntry, PayMethod,
  PriceChange, Product, Purchase, Sale, Settings, Shift, StockMove, Supplier,
} from './models';

/**
 * Traduce lo que devuelve pos-api al modelo del front (ids como texto, `occurredAt` → `at`, enums en minúscula).
 * Funciones puras: se prueban sin red. El servidor es la fuente de verdad cuando `useApi` está activo.
 */
const s = (n: unknown): string => (n === null || n === undefined ? '' : String(n));
const id = (n: unknown): string | null => (n === null || n === undefined ? null : String(n));
const num = (n: unknown): number => Number(n ?? 0);

export const mapAccount = (a: any): Account => ({ id: s(a.id), name: a.name, type: String(a.type).toLowerCase() as Account['type'], color: a.color ?? '', notes: a.notes ?? '' });

export const mapMovement = (m: any): Movement => ({
  id: s(m.id), accountId: s(m.accountId), amount: num(m.amount), at: m.occurredAt,
  category: m.category ?? '', subcategory: m.subcategory ?? '', description: m.description ?? '',
  sourceType: m.sourceType ?? '', sourceId: m.sourceId ?? '', user: m.username ?? '',
});

export const mapCategory = (c: any): Category => ({
  id: s(c.id), name: c.name, emoji: c.emoji ?? '', color: c.color ?? '',
  subs: (c.subcategories ?? []).map((n: string) => ({ id: n, name: n })),
});

export const mapProduct = (p: any): Product => ({
  id: s(p.id), name: p.name, barcode: p.barcode ?? '', categoryId: id(p.categoryId), supplierId: id(p.supplierId),
  cost: num(p.cost), price: num(p.price), offer: num(p.offer), stock: num(p.stock), lowStock: num(p.lowStock),
  idealStock: num(p.idealStock), iva: num(p.iva), archived: !!p.archived,
  combo: (p.components ?? (Array.isArray(p.combo) ? p.combo : [])).map((c: any) => ({ productId: s(c.productId), qty: num(c.qty) })), createdAt: p.createdAt,
});

export const mapStockMove = (m: any): StockMove => ({
  id: s(m.id), productId: s(m.productId), at: m.occurredAt, prev: num(m.prev), delta: num(m.delta), result: num(m.result),
  reason: m.reason, ref: m.ref ?? '', user: m.username ?? '',
});

export const mapPriceChange = (c: any): PriceChange => ({
  id: s(c.id), productId: s(c.productId), at: c.occurredAt, field: c.field, prev: num(c.prev), next: num(c.next), user: c.username ?? '',
});

export const mapCustomer = (c: any): Customer => ({
  id: s(c.id), name: c.name, lastName: c.lastName ?? '', phone: c.phone ?? '', email: c.email ?? '',
  dni: c.dni ?? '', cuit: c.cuit ?? '', notes: c.notes ?? '', createdAt: c.createdAt ?? '',
});

export const mapSupplier = (c: any): Supplier => ({
  id: s(c.id), name: c.name, cuit: c.cuit ?? '', trade: c.trade ?? '', contact: c.contact ?? '', phone: c.phone ?? '',
  email: c.email ?? '', address: c.address ?? '', city: c.city ?? '', markup: num(c.markup), notes: c.notes ?? '', createdAt: c.createdAt ?? '',
});

export const mapPartyEntry = (e: any): PartyEntry => ({
  id: s(e.id), party: String(e.party).toLowerCase() as PartyEntry['party'], partyId: s(e.partyId), at: e.occurredAt,
  kind: e.kind, delta: num(e.delta), accountId: id(e.accountId), comment: e.comment ?? '', ref: e.ref ?? '', user: e.username ?? '',
});

/** El servidor devuelve cada fila del libro como `{ entry, balance }` (saldo corrido); el front recalcula el saldo. */
export const mapLedgerRow = (r: any): PartyEntry => mapPartyEntry(r?.entry ?? r);

const METHODS: Record<string, PayMethod> = { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta', CUENTA_CORRIENTE: 'Cuenta corriente' };
export const METHOD_TO_API: Record<PayMethod, string> = { 'Efectivo': 'EFECTIVO', 'Transferencia': 'TRANSFERENCIA', 'Tarjeta': 'TARJETA', 'Cuenta corriente': 'CUENTA_CORRIENTE' };
const lower = (v: unknown) => String(v ?? '').toLowerCase();
const hhmm = (v: unknown) => String(v ?? '').slice(0, 5);

export const mapSale = (x: any): Sale => ({
  id: s(x.id), number: num(x.number), at: x.occurredAt, seller: x.seller ?? '', customerId: id(x.customerId),
  lines: (x.lines ?? []).map((l: any) => ({ productId: s(l.productId), name: l.name, qty: num(l.qty), price: num(l.price), discountUnit: num(l.discountUnit), cost: num(l.cost), categoryId: id(l.categoryId) })),
  subtotal: num(x.subtotal), discountPct: num(x.discountPct), discountAmount: num(x.discountAmount), total: num(x.total),
  method: METHODS[x.method] ?? 'Efectivo', paid: !!x.paid, accountId: id(x.accountId), notes: x.notes ?? '', invoiced: !!x.invoiced, budgetId: id(x.budgetId),
} as Sale);

export const mapSession = (x: any): CashSession => ({
  id: s(x.id), accountId: s(x.accountId), user: x.username ?? '', openedAt: x.openedAt, openingBalance: num(x.openingBalance),
  previousClose: num(x.previousClose), notesOpen: x.notesOpen ?? '', closedAt: x.closedAt ?? null,
  expected: x.expected == null ? null : num(x.expected), real: x.real == null ? null : num(x.real), diff: x.diff == null ? null : num(x.diff),
  notesClose: x.notesClose ?? '', verified: !!x.verified, note: x.note ?? '',
});

export const mapPurchase = (x: any): Purchase => ({
  id: s(x.id), number: num(x.number), supplierId: s(x.supplierId), status: lower(x.status) as Purchase['status'],
  lines: (x.lines ?? []).map((l: any) => ({ productId: s(l.productId), name: l.name, qty: num(l.qty), cost: num(l.cost), prevCost: num(l.prevCost), received: num(l.received) })),
  total: num(x.total), createdAt: x.createdAt, receivedAt: x.receivedAt ?? null, paid: !!x.paid, name: x.name ?? '', user: x.username ?? '',
});

export const mapBudget = (x: any): Budget => ({
  id: s(x.id), number: num(x.number), customerId: id(x.customerId), createdAt: x.createdAt, expires: x.expires,
  lines: (x.lines ?? []).map((l: any) => ({ productId: s(l.productId), name: l.name, qty: num(l.qty), price: num(l.price) })),
  total: num(x.total), notes: x.notes ?? '', status: lower(x.status) as Budget['status'], user: x.username ?? '',
});

export const mapInvoice = (x: any): Invoice => ({ id: s(x.id), number: x.number, at: x.occurredAt, customerId: id(x.customerId), total: num(x.total), net: num(x.net), iva: num(x.iva), items: x.items ?? '' });

export const mapCheque = (x: any): Cheque => ({ id: s(x.id), kind: lower(x.kind) as Cheque['kind'], amount: num(x.amount), due: x.due, number: x.number ?? '', collected: !!x.collected, customerId: id(x.customerId), description: x.description ?? '' });

export const mapCostCenter = (x: any): CostCenter => ({
  id: s(x.id), name: x.name, allocation: lower(x.allocation) as CostCenter['allocation'],
  costs: (x.costs ?? []).map((c: any, i: number) => ({ id: s(c.id ?? `${x.id}-${i}`), name: c.name, monthly: num(c.monthly), notes: c.notes ?? '' })),
});

export const mapEmployee = (x: any): Employee => ({ id: s(x.id), name: x.name, lastName: x.lastName ?? '', email: x.email ?? '', role: lower(x.role) as Employee['role'], hired: x.hired });
export const mapShift = (x: any): Shift => ({ id: s(x.id), employeeId: s(x.employeeId), date: x.day, from: hhmm(x.clockIn), to: hhmm(x.clockOut), notes: x.notes ?? '' });

export const mapSettings = (x: any): Settings => ({
  businessName: x.businessName ?? '', arqueo: !!x.arqueo, alertDiff: num(x.alertDiff), createProductFromCash: !!x.createProductFromCash,
  hideStockFilter: !!x.hideStockFilter, cumulativeDiscounts: !!x.cumulativeDiscounts, sellerCommission: num(x.sellerCommission),
  transferDiscount: num(x.transferDiscount), defaultIva: num(x.defaultIva), markup: num(x.markup), hideOutOfStock: !!x.hideOutOfStock,
});
