import { Injectable, computed, effect, signal } from '@angular/core';
import {
  Account, Allocation, Budget, BudgetLine, CashSession, Category, Cheque, CostCenter, Customer, Db, Employee,
  Iso, Movement, PartyEntry, PartyKind, PayMethod, Product, Purchase, PurchaseLine, Sale, SaleLine, Settings,
  StockReason, Supplier,
} from './models';

const KEY = 'pos-db-v1';
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const nowIso = (): Iso => new Date().toISOString();

const cat = (id: string, name: string, emoji: string, color: string, subs: string[] = []): Category => ({
  id, name, emoji, color, subs: subs.map((s, i) => ({ id: `${id}-${i}`, name: s })),
});

/** Categorías de base (las mismas que trae Envi). Las de caja son usadas por los asientos automáticos. */
const DEFAULT_CATEGORIES: Category[] = [
  cat('c-ventas', 'Ventas', '🛒', '#a267ac', ['Ventas del local']),
  cat('c-transportes', 'Transportes', '🚗', '#f4a340', ['Combustible vehículos', 'Mantenimiento de vehículos', 'Servicios de flete y envíos']),
  cat('c-admin', 'Servicios Administrativos y Financieros', '💳', '#1f5fb0', ['Comisiones de tarjetas', 'Honorarios contables', 'Servicios y gastos bancarios']),
  cat('c-servicios', 'Servicios', '📡', '#2cbfa5', ['Agua', 'Electricidad', 'Gas', 'Internet y telefonía', 'Software y licencias']),
  cat('c-seguros', 'Seguros', '💰', '#e5476b', ['Seguro local', 'Seguro empleados', 'Seguro otros']),
  cat('c-saldo', 'Saldo inicial', '🤝', '#8fc24a', []),
  cat('c-proveedores', 'Proveedores', '🚚', '#ef7c3a', ['Compra a proveedores']),
  cat('c-personal', 'Personal', '👤', '#5aa9e6', ['Capacitaciones', 'Comisiones de ventas']),
  cat('c-otros', 'Otros gastos del local', '💡', '#f2c531', ['Insumos de limpieza', 'Mantenimiento del local', 'Servicios de limpieza']),
  cat('c-marketing', 'Marketing y publicidad', '📰', '#d970c0', ['Publicidad Online', 'Publicidad Offline']),
  cat('c-impuestos', 'Impuestos', '💸', '#666666', ['IVA', 'Ingresos brutos', 'Monotributo']),
  cat('c-empleados', 'Empleados', '👥', '#1f8fa8', ['Sueldos empleados']),
  cat('c-cc', 'Cuentas corrientes', '🤝', '#6fc2a5', ['Cuenta corriente clientes', 'Cuenta corriente proveedores']),
  cat('c-consumibles', 'Consumibles', '📦', '#8a8f3c', ['Bolsas y Packaging', 'Papelería y librería']),
  cat('c-alquileres', 'Alquileres', '🏢', '#aaaaaa', ['Alquiler del local']),
  cat('c-ajustes', 'Ajustes y diferencias de caja', '💰', '#e0921a',
    ['Diferencia al abrir caja', 'Diferencia al cerrar caja', 'Diferencias de caja', 'Transferencia entre cuentas propias']),
];

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'Mi negocio', arqueo: false, alertDiff: 2000, createProductFromCash: true, hideStockFilter: false,
  cumulativeDiscounts: false, sellerCommission: 10, transferDiscount: 0, defaultIva: 21, markup: 40, hideOutOfStock: false,
};

function emptyDb(): Db {
  return {
    v: 1, seq: {}, settings: { ...DEFAULT_SETTINGS }, user: 'Administrador',
    categories: structuredClone(DEFAULT_CATEGORIES), products: [], customers: [], suppliers: [],
    accounts: [
      { id: 'a-caja', name: 'Caja', type: 'caja', color: '#8fc24a', notes: '' },
      { id: 'a-banco', name: 'Banco', type: 'banco', color: '#5aa9e6', notes: '' },
    ],
    movements: [], party: [], sales: [], stockMoves: [], priceChanges: [], sessions: [], purchases: [], budgets: [],
    cheques: [], costCenters: [], invoices: [], employees: [], shifts: [],
  } as unknown as Db;
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Db;
      if (d?.v === 1) return d;
    }
  } catch { /* storage bloqueado o corrupto: arranca vacío */ }
  return emptyDb();
}

export interface SaleInput {
  customerId: string | null;
  lines: { productId: string; qty: number; price?: number; discountUnit?: number }[];
  discountPct: number;
  method: PayMethod;
  paid: boolean;
  notes: string;
  invoice: boolean;
  budgetId?: string | null;
  autoDiscount?: boolean;   // si false, no aplica el descuento automático por medio de pago
}

@Injectable({ providedIn: 'root' })
export class Store {
  readonly db = signal<Db>(load());

  constructor() {
    effect(() => {
      try { localStorage.setItem(KEY, JSON.stringify(this.db())); } catch { /* sin storage */ }
    });
  }

  // ---------- utilidades ----------
  private mut<T>(fn: (d: Db) => T): T {
    let out!: T;
    this.db.update((d) => { const n = structuredClone(d); out = fn(n); return n; });
    return out;
  }
  private nextSeq(d: Db, kind: string): number { d.seq[kind] = (d.seq[kind] ?? 0) + 1; return d.seq[kind]; }
  private newId(d: Db, kind: string): string { return `${kind}${this.nextSeq(d, kind)}`; }
  reset(): void { this.db.set(emptyDb()); }

  // ---------- consultas ----------
  readonly settings = computed(() => this.db().settings);
  readonly accounts = computed(() => this.db().accounts);
  readonly categories = computed(() => this.db().categories);
  readonly customers = computed(() => this.db().customers);
  readonly suppliers = computed(() => this.db().suppliers);

  /** Stock efectivo: los combos lo derivan de sus componentes. */
  stockOf(p: Product, d: Db = this.db()): number {
    if (!p.combo.length) return p.stock;
    return Math.min(...p.combo.map((c) => {
      const comp = d.products.find((x) => x.id === c.productId);
      return comp ? Math.floor(this.stockOf(comp, d) / (c.qty || 1)) : 0;
    }));
  }
  product(id: string | null): Product | undefined { return id ? this.db().products.find((p) => p.id === id) : undefined; }
  customer(id: string | null): Customer | undefined { return id ? this.db().customers.find((c) => c.id === id) : undefined; }
  supplier(id: string | null): Supplier | undefined { return id ? this.db().suppliers.find((c) => c.id === id) : undefined; }
  account(id: string | null): Account | undefined { return id ? this.db().accounts.find((c) => c.id === id) : undefined; }
  customerName(id: string | null): string {
    const c = this.customer(id); return c ? `${c.name} ${c.lastName}`.trim() : 'Consumidor final';
  }
  balanceOfAccount(id: string): number { return r2(this.db().movements.filter((m) => m.accountId === id).reduce((s, m) => s + m.amount, 0)); }
  partyBalance(kind: PartyKind, id: string): number {
    return r2(this.db().party.filter((e) => e.party === kind && e.partyId === id).reduce((s, e) => s + e.delta, 0));
  }
  totalReceivable(): number { return r2(this.db().customers.reduce((s, c) => s + Math.max(0, this.partyBalance('customer', c.id)), 0)); }
  totalPayable(): number { return r2(this.db().suppliers.reduce((s, c) => s + Math.max(0, this.partyBalance('supplier', c.id)), 0)); }
  openSession(): CashSession | undefined { return this.db().sessions.find((s) => !s.closedAt); }
  canSell(): boolean { return !this.db().settings.arqueo || !!this.openSession(); }
  private firstAccount(d: Db, type: 'caja' | 'banco'): Account { return d.accounts.find((a) => a.type === type) ?? d.accounts[0]; }

  // ---------- libro de movimientos de dinero ----------
  private pushMovement(d: Db, m: Omit<Movement, 'id' | 'at' | 'user'> & { at?: Iso }): Movement {
    const mv: Movement = { ...m, id: this.newId(d, 'm'), at: m.at ?? nowIso(), user: d.user } as Movement;
    d.movements.push(mv); return mv;
  }
  addMovement(i: { accountId: string; amount: number; category: string; subcategory: string; description: string; at?: Iso }): void {
    this.mut((d) => { this.pushMovement(d, { ...i, sourceType: 'manual', sourceId: '' }); });
  }
  transfer(fromId: string, toId: string, amount: number, description: string): void {
    this.mut((d) => {
      const to = d.accounts.find((a) => a.id === toId)?.name ?? '', from = d.accounts.find((a) => a.id === fromId)?.name ?? '';
      const base = { category: 'Ajustes y diferencias de caja', subcategory: 'Transferencia entre cuentas propias', sourceType: 'transferencia', sourceId: '' };
      this.pushMovement(d, { ...base, accountId: toId, amount: r2(amount), description: description || `← Transferido desde ${from}` });
      this.pushMovement(d, { ...base, accountId: fromId, amount: r2(-amount), description: description || `→ Transferido a ${to}` });
    });
  }
  saveAccount(a: Partial<Account> & { name: string }, initial = 0): void {
    this.mut((d) => {
      if (a.id) { const x = d.accounts.find((y) => y.id === a.id); if (x) Object.assign(x, a); return; }
      const acc: Account = { id: this.newId(d, 'a'), type: 'caja', color: '#8fc24a', notes: '', ...a } as Account;
      d.accounts.push(acc);
      if (initial) this.pushMovement(d, { accountId: acc.id, amount: r2(initial), category: 'Saldo inicial', subcategory: '', description: 'Saldo inicial', sourceType: 'saldo', sourceId: '' });
    });
  }

  // ---------- caja: apertura, cierre, arqueo ----------
  openCash(accountId: string, newBalance: number, notes: string): void {
    this.mut((d) => {
      if (d.sessions.some((s) => !s.closedAt)) return;
      const last = [...d.sessions].reverse().find((s) => s.accountId === accountId && s.closedAt);
      const previousClose = last?.real ?? 0;
      const diff = r2(newBalance - previousClose);
      if (diff !== 0) this.pushMovement(d, { accountId, amount: diff, category: 'Ajustes y diferencias de caja', subcategory: 'Diferencia al abrir caja', description: 'Diferencia de apertura de caja', sourceType: 'apertura', sourceId: '' });
      d.sessions.push({
        id: this.newId(d, 's'), accountId, user: d.user, openedAt: nowIso(), openingBalance: r2(newBalance), previousClose,
        notesOpen: notes, closedAt: null, expected: null, real: null, diff: null, notesClose: '', verified: false, note: '',
      });
    });
  }
  /** Saldo esperado al cerrar = saldo de la cuenta según el libro. */
  expectedClose(): number { const s = this.openSession(); return s ? this.balanceOfAccount(s.accountId) : 0; }
  closeCash(real: number, notes: string): void {
    this.mut((d) => {
      const s = d.sessions.find((x) => !x.closedAt); if (!s) return;
      const expected = r2(d.movements.filter((m) => m.accountId === s.accountId).reduce((t, m) => t + m.amount, 0));
      const diff = r2(real - expected);
      if (diff !== 0) this.pushMovement(d, { accountId: s.accountId, amount: diff, category: 'Ajustes y diferencias de caja', subcategory: 'Diferencia al cerrar caja', description: 'Diferencia de cierre de caja', sourceType: 'cierre', sourceId: s.id });
      Object.assign(s, { closedAt: nowIso(), expected, real: r2(real), diff, notesClose: notes });
    });
  }
  setSessionVerified(id: string, v: boolean): void { this.mut((d) => { const s = d.sessions.find((x) => x.id === id); if (s) s.verified = v; }); }
  setSessionNote(id: string, note: string): void { this.mut((d) => { const s = d.sessions.find((x) => x.id === id); if (s) s.note = note; }); }

  // ---------- productos y stock ----------
  saveProduct(p: Partial<Product> & { name: string }, initialStock = 0): string {
    return this.mut((d) => {
      if (p.id) {
        const x = d.products.find((y) => y.id === p.id); if (!x) return p.id;
        for (const f of ['price', 'cost', 'offer'] as const) {
          if (p[f] !== undefined && p[f] !== x[f]) d.priceChanges.push({ id: this.newId(d, 'pc'), productId: x.id, at: nowIso(), field: f, prev: x[f], next: p[f]!, user: d.user });
        }
        Object.assign(x, p); return x.id;
      }
      const np: Product = {
        id: this.newId(d, 'p'), barcode: '', categoryId: null, supplierId: null, cost: 0, price: 0, offer: 0, stock: 0,
        lowStock: 0, idealStock: 0, iva: d.settings.defaultIva, archived: false, combo: [], createdAt: nowIso(), ...p,
      } as Product;
      np.stock = 0; d.products.push(np);
      if (initialStock) this.moveStock(d, np, initialStock, 'Creación de producto', '');
      return np.id;
    });
  }
  private moveStock(d: Db, p: Product, delta: number, reason: StockReason, ref: string): void {
    if (!delta) return;
    const prev = p.stock; p.stock = prev + delta;
    d.stockMoves.push({ id: this.newId(d, 'sm'), productId: p.id, at: nowIso(), prev, delta, result: p.stock, reason, ref, user: d.user });
  }
  setStock(id: string, value: number): void {
    this.mut((d) => { const p = d.products.find((x) => x.id === id); if (p) this.moveStock(d, p, value - p.stock, 'Actualización manual', ''); });
  }
  archiveProducts(ids: string[], archived: boolean): void { this.mut((d) => d.products.forEach((p) => { if (ids.includes(p.id)) p.archived = archived; })); }
  deleteProducts(ids: string[]): void { this.mut((d) => { d.products = d.products.filter((p) => !ids.includes(p.id)); }); }
  bulkPrice(ids: string[], target: 'price' | 'offer', mode: 'pct' | 'fijo', value: number, round: boolean): void {
    this.mut((d) => d.products.forEach((p) => {
      if (!ids.includes(p.id)) return;
      const prev = p[target]; if (target === 'offer' && !prev) return;
      let next = mode === 'pct' ? prev * (1 + value / 100) : prev + value;
      next = round ? Math.round(next) : r2(next);
      if (next !== prev) { d.priceChanges.push({ id: this.newId(d, 'pc'), productId: p.id, at: nowIso(), field: target, prev, next, user: d.user }); p[target] = Math.max(0, next); }
    }));
  }

  // ---------- ventas ----------
  /** Reglas: descuento automático por transferencia, deuda si no está pago, asiento en la cuenta, baja de stock. */
  registerSale(i: SaleInput): Sale {
    return this.mut((d) => {
      const lines: SaleLine[] = i.lines.map((l) => {
        const p = d.products.find((x) => x.id === l.productId)!;
        const base = l.price ?? (p.offer > 0 ? p.offer : p.price);
        return { productId: p.id, name: p.name, qty: l.qty, price: r2(base), discountUnit: r2(l.discountUnit ?? 0), cost: p.combo.length ? r2(p.combo.reduce((t, c) => t + (d.products.find((x) => x.id === c.productId)?.cost ?? 0) * c.qty, 0)) : p.cost, categoryId: p.categoryId };
      });
      const subtotal = r2(lines.reduce((s, l) => s + (l.price - l.discountUnit) * l.qty, 0));
      let pct = i.discountPct;
      if (i.autoDiscount !== false && i.method === 'Transferencia' && d.settings.transferDiscount > 0 && (!pct || !d.settings.cumulativeDiscounts)) pct = Math.max(pct, d.settings.transferDiscount);
      const discountAmount = r2(subtotal * (pct / 100));
      const total = r2(subtotal - discountAmount);
      const onAccount = i.method === 'Cuenta corriente' || !i.paid;
      if (onAccount && !i.customerId) throw new Error('Para dejar la venta a cuenta corriente elegí un cliente.');
      const method: PayMethod = onAccount ? 'Cuenta corriente' : i.method;
      const number = this.nextSeq(d, 'sale');
      const sale: Sale = {
        id: `v${number}`, number, at: nowIso(), seller: d.user, customerId: i.customerId, lines, subtotal, discountPct: pct,
        discountAmount, total, method, paid: !onAccount, accountId: null, notes: i.notes, invoiced: i.invoice, budgetId: i.budgetId ?? null,
      };
      // stock
      for (const l of lines) {
        const p = d.products.find((x) => x.id === l.productId)!;
        if (p.combo.length) p.combo.forEach((c) => { const comp = d.products.find((x) => x.id === c.productId); if (comp) this.moveStock(d, comp, -c.qty * l.qty, 'Venta en caja', `Venta #${number}`); });
        else this.moveStock(d, p, -l.qty, 'Venta en caja', `Venta #${number}`);
      }
      // dinero / deuda
      if (onAccount) {
        d.party.push({ id: this.newId(d, 'pe'), party: 'customer', partyId: i.customerId!, at: sale.at, kind: 'venta', delta: total, accountId: null, comment: `Venta #${number}`, ref: sale.id, user: d.user });
      } else {
        const acc = method === 'Efectivo' ? (d.sessions.find((s) => !s.closedAt)?.accountId ?? this.firstAccount(d, 'caja').id) : this.firstAccount(d, 'banco').id;
        sale.accountId = acc;
        this.pushMovement(d, { accountId: acc, amount: total, category: 'Ventas', subcategory: 'Ventas del local', description: `Venta #${number}`, sourceType: 'venta', sourceId: sale.id });
      }
      if (i.invoice) this.pushInvoice(d, sale);
      if (i.budgetId) { const b = d.budgets.find((x) => x.id === i.budgetId); if (b) b.status = 'vendido'; }
      d.sales.push(sale);
      return sale;
    });
  }
  private pushInvoice(d: Db, s: Sale): void {
    const net = r2(s.total / 1.21);
    d.invoices.push({ id: this.newId(d, 'f'), number: `0001-${String(this.nextSeq(d, 'inv')).padStart(6, '0')}`, at: s.at, customerId: s.customerId, total: s.total, net, iva: r2(s.total - net), items: s.lines.map((l) => l.name).join(', ') });
  }
  createInvoice(customerId: string | null, items: string, total: number, ivaRate = 21): void {
    this.mut((d) => {
      const net = r2(total / (1 + ivaRate / 100));
      d.invoices.push({ id: this.newId(d, 'f'), number: `0001-${String(this.nextSeq(d, 'inv')).padStart(6, '0')}`, at: nowIso(), customerId, total: r2(total), net, iva: r2(total - net), items });
    });
  }
  deleteSale(id: string): void {
    this.mut((d) => {
      const s = d.sales.find((x) => x.id === id); if (!s) return;
      for (const l of s.lines) { const p = d.products.find((x) => x.id === l.productId); if (p) (p.combo.length ? p.combo.forEach((c) => { const comp = d.products.find((x) => x.id === c.productId); if (comp) this.moveStock(d, comp, c.qty * l.qty, 'Actualización manual', `Anulación venta #${s.number}`); }) : this.moveStock(d, p, l.qty, 'Actualización manual', `Anulación venta #${s.number}`)); }
      d.movements = d.movements.filter((m) => !(m.sourceType === 'venta' && m.sourceId === s.id));
      d.party = d.party.filter((e) => e.ref !== s.id);
      d.sales = d.sales.filter((x) => x.id !== id);
    });
  }

  // ---------- cuentas corrientes ----------
  customerMovement(customerId: string, kind: 'pago' | 'devolucion' | 'deuda', amount: number, accountId: string | null, comment: string): void {
    this.mut((d) => {
      const delta = kind === 'pago' ? -amount : amount;
      d.party.push({ id: this.newId(d, 'pe'), party: 'customer', partyId: customerId, at: nowIso(), kind, delta: r2(delta), accountId: kind === 'deuda' ? null : accountId, comment, ref: '', user: d.user });
      if (kind !== 'deuda' && accountId) {
        const name = d.customers.find((c) => c.id === customerId); const who = name ? `${name.name} ${name.lastName}`.trim() : '';
        this.pushMovement(d, { accountId, amount: kind === 'pago' ? r2(amount) : r2(-amount), category: 'Cuentas corrientes', subcategory: 'Cuenta corriente clientes', description: `${kind === 'pago' ? 'Cobro de' : 'Devolución a'} ${who}`, sourceType: 'cc-cliente', sourceId: customerId });
      }
    });
  }
  supplierMovement(supplierId: string, kind: 'pago' | 'compra' | 'nota_credito' | 'ajuste', amount: number, accountId: string | null, comment: string): void {
    this.mut((d) => {
      const delta = kind === 'compra' || kind === 'ajuste' ? amount : -amount;
      d.party.push({ id: this.newId(d, 'pe'), party: 'supplier', partyId: supplierId, at: nowIso(), kind, delta: r2(delta), accountId: kind === 'pago' ? accountId : null, comment, ref: '', user: d.user });
      if (kind === 'pago' && accountId) {
        const s = d.suppliers.find((x) => x.id === supplierId);
        this.pushMovement(d, { accountId, amount: r2(-amount), category: 'Proveedores', subcategory: 'Compra a proveedores', description: `Pago a ${s?.name ?? ''}`, sourceType: 'cc-proveedor', sourceId: supplierId });
      }
    });
  }
  saveCustomer(c: Partial<Customer> & { name: string }): string {
    return this.mut((d) => {
      if (c.id) { const x = d.customers.find((y) => y.id === c.id); if (x) Object.assign(x, c); return c.id; }
      const n: Customer = { id: this.newId(d, 'cu'), lastName: '', phone: '', email: '', dni: '', cuit: '', notes: '', createdAt: nowIso(), ...c } as Customer;
      d.customers.push(n); return n.id;
    });
  }
  saveSupplier(s: Partial<Supplier> & { name: string }): string {
    return this.mut((d) => {
      if (s.id) { const x = d.suppliers.find((y) => y.id === s.id); if (x) Object.assign(x, s); return s.id; }
      const n: Supplier = { id: this.newId(d, 'su'), cuit: '', trade: '', contact: '', phone: '', email: '', address: '', city: '', markup: 0, notes: '', createdAt: nowIso(), ...s } as Supplier;
      d.suppliers.push(n); return n.id;
    });
  }

  // ---------- compras ----------
  savePurchase(id: string | null, supplierId: string, lines: PurchaseLine[], name: string): string {
    return this.mut((d) => {
      const total = r2(lines.reduce((s, l) => s + l.qty * l.cost, 0));
      if (id) { const p = d.purchases.find((x) => x.id === id); if (p) Object.assign(p, { lines, total, name, supplierId }); return id; }
      const number = this.nextSeq(d, 'pur');
      const p: Purchase = { id: `o${number}`, number, supplierId, status: 'borrador', lines, total, createdAt: nowIso(), receivedAt: null, paid: false, name, user: d.user };
      d.purchases.push(p); return p.id;
    });
  }
  markOrdered(id: string): void { this.mut((d) => { const p = d.purchases.find((x) => x.id === id); if (p && p.status === 'borrador') p.status = 'pedido'; }); }
  /** Recepción: sube el stock, actualiza el costo y deja deuda con el proveedor si no está pago. */
  receivePurchase(id: string, paid: boolean, accountId: string | null): void {
    this.mut((d) => {
      const p = d.purchases.find((x) => x.id === id); if (!p || p.status === 'recibido') return;
      for (const l of p.lines) {
        const prod = d.products.find((x) => x.id === l.productId); if (!prod) continue;
        this.moveStock(d, prod, l.qty, 'Compra recibida', `Compra P-${p.number}`);
        if (prod.cost !== l.cost) { d.priceChanges.push({ id: this.newId(d, 'pc'), productId: prod.id, at: nowIso(), field: 'cost', prev: prod.cost, next: l.cost, user: d.user }); prod.cost = l.cost; }
        l.received = l.qty;
      }
      Object.assign(p, { status: 'recibido', receivedAt: nowIso(), paid });
      const sup = d.suppliers.find((s) => s.id === p.supplierId);
      if (paid && accountId) this.pushMovement(d, { accountId, amount: -p.total, category: 'Proveedores', subcategory: 'Compra a proveedores', description: `Compra P-${p.number} · ${sup?.name ?? ''}`, sourceType: 'compra', sourceId: p.id });
      else d.party.push({ id: this.newId(d, 'pe'), party: 'supplier', partyId: p.supplierId, at: nowIso(), kind: 'compra', delta: p.total, accountId: null, comment: `Compra P-${p.number}`, ref: p.id, user: d.user });
    });
  }
  deletePurchase(id: string): void { this.mut((d) => { d.purchases = d.purchases.filter((p) => p.id !== id || p.status === 'recibido'); }); }

  // ---------- presupuestos ----------
  saveBudget(id: string | null, customerId: string | null, expires: Iso, lines: BudgetLine[], notes: string): string {
    return this.mut((d) => {
      const total = r2(lines.reduce((s, l) => s + l.qty * l.price, 0));
      if (id) { const b = d.budgets.find((x) => x.id === id); if (b) Object.assign(b, { customerId, expires, lines, total, notes }); return id; }
      const number = this.nextSeq(d, 'bud');
      const b: Budget = { id: `b${number}`, number, customerId, createdAt: nowIso(), expires, lines, total, notes, status: 'activo', user: d.user };
      d.budgets.push(b); return b.id;
    });
  }
  setBudgetStatus(id: string, s: Budget['status']): void { this.mut((d) => { const b = d.budgets.find((x) => x.id === id); if (b) b.status = s; }); }
  deleteBudget(id: string): void { this.mut((d) => { d.budgets = d.budgets.filter((b) => b.id !== id); }); }

  // ---------- cheques, centros de costos, categorías, empleados ----------
  saveCheque(c: Partial<Cheque> & { amount: number; due: Iso; kind: 'cobrar' | 'pagar' }): void {
    this.mut((d) => {
      if (c.id) { const x = d.cheques.find((y) => y.id === c.id); if (x) Object.assign(x, c); return; }
      d.cheques.push({ id: this.newId(d, 'ch'), number: '#' + String(2000 + d.cheques.length + 1).padStart(5, '0'), collected: false, customerId: null, description: '', ...c } as Cheque);
    });
  }
  deleteCheque(id: string): void { this.mut((d) => { d.cheques = d.cheques.filter((c) => c.id !== id); }); }
  saveCostCenter(name: string, allocation: Allocation): void { this.mut((d) => { d.costCenters.push({ id: this.newId(d, 'cc'), name, allocation, costs: [] }); }); }
  deleteCostCenter(id: string): void { this.mut((d) => { d.costCenters = d.costCenters.filter((c) => c.id !== id); }); }
  addFixedCost(centerId: string, name: string, monthly: number, notes: string): void {
    this.mut((d) => { const c = d.costCenters.find((x) => x.id === centerId); if (c) c.costs.push({ id: this.newId(d, 'fc'), name, monthly: r2(monthly), notes }); });
  }
  deleteFixedCost(centerId: string, id: string): void { this.mut((d) => { const c = d.costCenters.find((x) => x.id === centerId); if (c) c.costs = c.costs.filter((f) => f.id !== id); }); }
  saveCategory(c: { id?: string; name: string; emoji: string; color: string }): void {
    this.mut((d) => {
      if (c.id) { const x = d.categories.find((y) => y.id === c.id); if (x) Object.assign(x, c); return; }
      d.categories.push({ id: this.newId(d, 'cat'), subs: [], ...c });
    });
  }
  deleteCategory(id: string): void { this.mut((d) => { d.categories = d.categories.filter((c) => c.id !== id); }); }
  addSubcategory(catId: string, name: string): void { this.mut((d) => { d.categories.find((c) => c.id === catId)?.subs.push({ id: this.newId(d, 'sub'), name }); }); }
  deleteSubcategory(catId: string, id: string): void { this.mut((d) => { const c = d.categories.find((x) => x.id === catId); if (c) c.subs = c.subs.filter((s) => s.id !== id); }); }
  addEmployee(e: Omit<Employee, 'id'>): void { this.mut((d) => { d.employees.push({ id: this.newId(d, 'em'), ...e }); }); }
  addShift(employeeId: string, date: string, from: string, to: string, notes: string): void {
    this.mut((d) => { d.shifts.push({ id: this.newId(d, 'sh'), employeeId, date, from, to, notes }); });
  }
  updateSettings(patch: Partial<Settings>): void { this.mut((d) => { Object.assign(d.settings, patch); }); }
}
