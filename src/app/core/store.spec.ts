import { TestBed } from '@angular/core/testing';
import { Store } from './store';

/** Reglas de negocio del POS (réplica de la lógica de Envi). */
describe('Store', () => {
  let s: Store;
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    s = TestBed.inject(Store);
    s.reset();
  });

  const producto = (stock = 10, price = 1000, cost = 500) => s.saveProduct({ name: 'Prod', price, cost }, stock);

  it('vender descuenta stock, registra el ingreso en Caja y lo deja en el libro de stock', () => {
    const id = producto();
    const v = s.registerSale({ customerId: null, lines: [{ productId: id, qty: 2 }], discountPct: 0, method: 'Efectivo', paid: true, notes: '', invoice: false });
    expect(v.total).toBe(2000);
    expect(s.product(id)!.stock).toBe(8);
    expect(s.balanceOfAccount('a-caja')).toBe(2000);
    const last = s.db().stockMoves.at(-1)!;
    expect(last.reason).toBe('Venta en caja');
    expect(last.delta).toBe(-2);
  });

  it('se puede vender sin stock (queda negativo)', () => {
    const id = producto(0);
    s.registerSale({ customerId: null, lines: [{ productId: id, qty: 1 }], discountPct: 0, method: 'Efectivo', paid: true, notes: '', invoice: false });
    expect(s.product(id)!.stock).toBe(-1);
  });

  it('venta con "Está pago" apagado genera deuda del cliente y no mueve dinero', () => {
    const id = producto();
    const c = s.saveCustomer({ name: 'Clara' });
    const v = s.registerSale({ customerId: c, lines: [{ productId: id, qty: 1 }], discountPct: 0, method: 'Efectivo', paid: false, notes: '', invoice: false });
    expect(v.method).toBe('Cuenta corriente');
    expect(s.partyBalance('customer', c)).toBe(1000);
    expect(s.balanceOfAccount('a-caja')).toBe(0);
  });

  it('cuenta corriente sin cliente es un error', () => {
    const id = producto();
    expect(() => s.registerSale({ customerId: null, lines: [{ productId: id, qty: 1 }], discountPct: 0, method: 'Cuenta corriente', paid: false, notes: '', invoice: false })).toThrow();
  });

  it('descuento automático por transferencia', () => {
    s.updateSettings({ transferDiscount: 10 });
    const id = producto();
    const v = s.registerSale({ customerId: null, lines: [{ productId: id, qty: 1 }], discountPct: 0, method: 'Transferencia', paid: true, notes: '', invoice: false });
    expect(v.total).toBe(900);
    expect(s.balanceOfAccount('a-banco')).toBe(900);
  });

  it('cobro a un cliente baja la deuda e ingresa a la cuenta elegida', () => {
    const id = producto();
    const c = s.saveCustomer({ name: 'Clara' });
    s.registerSale({ customerId: c, lines: [{ productId: id, qty: 1 }], discountPct: 0, method: 'Efectivo', paid: false, notes: '', invoice: false });
    s.customerMovement(c, 'pago', 400, 'a-banco', '');
    expect(s.partyBalance('customer', c)).toBe(600);
    expect(s.balanceOfAccount('a-banco')).toBe(400);
  });

  it('apertura con saldo distinto genera diferencia; cierre compara esperado vs real', () => {
    s.openCash('a-caja', 5000, '');
    expect(s.balanceOfAccount('a-caja')).toBe(5000);
    s.addMovement({ accountId: 'a-caja', amount: -300, category: 'Otros gastos del local', subcategory: 'Insumos de limpieza', description: 'x' });
    expect(s.expectedClose()).toBe(4700);
    s.closeCash(4800, '');
    const ses = s.db().sessions[0];
    expect(ses.diff).toBe(100);
    expect(s.balanceOfAccount('a-caja')).toBe(4800);
    s.openCash('a-caja', 4800, '');           // sin diferencia: no crea asiento extra
    expect(s.db().movements.filter((m) => m.subcategory === 'Diferencia al abrir caja').length).toBe(1);
  });

  it('con arqueo activo no se puede vender con la caja cerrada', () => {
    s.updateSettings({ arqueo: true });
    expect(s.canSell()).toBeFalse();
    s.openCash('a-caja', 0, '');
    expect(s.canSell()).toBeTrue();
  });

  it('recibir una compra suma stock, actualiza costo y deja deuda si no está paga', () => {
    const id = producto(0, 1000, 500);
    const sup = s.saveSupplier({ name: 'Prov' });
    const oid = s.savePurchase(null, sup, [{ productId: id, name: 'Prod', qty: 5, cost: 600, prevCost: 500, received: 0 }], '');
    s.markOrdered(oid);
    s.receivePurchase(oid, false, null);
    expect(s.product(id)!.stock).toBe(5);
    expect(s.product(id)!.cost).toBe(600);
    expect(s.partyBalance('supplier', sup)).toBe(3000);
    expect(s.db().purchases[0].status).toBe('recibido');
  });

  it('recibir una compra paga egresa de la cuenta y no deja deuda', () => {
    const id = producto(0);
    const sup = s.saveSupplier({ name: 'Prov' });
    const oid = s.savePurchase(null, sup, [{ productId: id, name: 'Prod', qty: 2, cost: 100, prevCost: 100, received: 0 }], '');
    s.receivePurchase(oid, true, 'a-caja');
    expect(s.balanceOfAccount('a-caja')).toBe(-200);
    expect(s.partyBalance('supplier', sup)).toBe(0);
  });

  it('transferencia entre cuentas es neutra en el total', () => {
    s.addMovement({ accountId: 'a-caja', amount: 1000, category: 'Saldo inicial', subcategory: '', description: '' });
    s.transfer('a-caja', 'a-banco', 300, '');
    expect(s.balanceOfAccount('a-caja')).toBe(700);
    expect(s.balanceOfAccount('a-banco')).toBe(300);
  });

  it('un combo deriva su stock de los componentes y los descuenta al venderse', () => {
    const a = producto(10);
    const combo = s.saveProduct({ name: 'Combo', price: 1500, combo: [{ productId: a, qty: 2 }] });
    expect(s.stockOf(s.product(combo)!)).toBe(5);
    s.registerSale({ customerId: null, lines: [{ productId: combo, qty: 1 }], discountPct: 0, method: 'Efectivo', paid: true, notes: '', invoice: false });
    expect(s.product(a)!.stock).toBe(8);
  });

  it('anular una venta devuelve el stock y quita el asiento', () => {
    const id = producto();
    const v = s.registerSale({ customerId: null, lines: [{ productId: id, qty: 3 }], discountPct: 0, method: 'Efectivo', paid: true, notes: '', invoice: false });
    s.deleteSale(v.id);
    expect(s.product(id)!.stock).toBe(10);
    expect(s.balanceOfAccount('a-caja')).toBe(0);
  });

  it('actualización masiva de precios por porcentaje con redondeo', () => {
    const id = producto(1, 1000);
    s.bulkPrice([id], 'price', 'pct', 10, true);
    expect(s.product(id)!.price).toBe(1100);
    expect(s.db().priceChanges.length).toBe(1);
  });
});
