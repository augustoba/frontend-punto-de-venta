import { mapAccount, mapLedgerRow, mapCategory, mapMovement, mapPartyEntry, mapProduct, mapSale, mapShift, mapPurchase, mapCheque } from './mappers';

describe('mappers del servidor', () => {
  it('cuenta: id como texto y tipo en minúscula', () => {
    expect(mapAccount({ id: 3, name: 'Caja', type: 'CAJA', balance: 10 })).toEqual({ id: '3', name: 'Caja', type: 'caja', color: '', notes: '' });
  });
  it('movimiento: occurredAt → at y username → user', () => {
    const m = mapMovement({ id: 1, accountId: 2, amount: '150.50', occurredAt: '2026-09-18T10:00:00Z', username: 'ana' });
    expect(m.at).toBe('2026-09-18T10:00:00Z');
    expect(m.user).toBe('ana');
    expect(m.amount).toBe(150.5);
    expect(m.accountId).toBe('2');
  });
  it('categoría: las subcategorías pasan a objetos', () => {
    expect(mapCategory({ id: 1, name: 'Ventas', subcategories: ['Ventas del local'] }).subs).toEqual([{ id: 'Ventas del local', name: 'Ventas del local' }]);
  });
  it('producto: combo, ids nulos y números', () => {
    const p = mapProduct({ id: 9, name: 'Combo', categoryId: null, supplierId: 4, price: 100, iva: 21, stock: -2, combo: true, components: [{ productId: 5, qty: 2 }] });
    expect(p.categoryId).toBeNull();
    expect(p.supplierId).toBe('4');
    expect(p.stock).toBe(-2);
    expect(p.combo).toEqual([{ productId: '5', qty: 2 }]);
  });
  it('asiento de cuenta corriente: party en minúscula', () => {
    const e = mapPartyEntry({ id: 1, party: 'CUSTOMER', partyId: 7, delta: '25', accountId: null, occurredAt: 'x', kind: 'venta' });
    expect(e.party).toBe('customer');
    expect(e.accountId).toBeNull();
  });
  it('venta: medio de pago legible y líneas con costo congelado', () => {
    const v = mapSale({ id: 1, number: 5, occurredAt: 'x', method: 'CUENTA_CORRIENTE', paid: false, total: '200', lines: [{ productId: 2, name: 'A', qty: 2, price: '100', discountUnit: '0', cost: '60' }] });
    expect(v.method).toBe('Cuenta corriente');
    expect(v.lines[0].cost).toBe(60);
    expect(v.customerId).toBeNull();
  });
  it('fichaje: hora sin segundos', () => {
    expect(mapShift({ id: 1, employeeId: 2, day: '2026-09-18', clockIn: '09:00:00', clockOut: '13:30:00' })).toEqual({ id: '1', employeeId: '2', date: '2026-09-18', from: '09:00', to: '13:30', notes: '' });
  });
  it('compra y cheque: estados en minúscula', () => {
    expect(mapPurchase({ id: 1, supplierId: 3, status: 'RECIBIDO', lines: [] }).status).toBe('recibido');
    expect(mapCheque({ id: 1, kind: 'COBRAR', amount: 10 }).kind).toBe('cobrar');
  });
  it('libro de cuenta corriente: abre el envoltorio {entry, balance}', () => {
    const e = mapLedgerRow({ entry: { id: 2, party: 'CUSTOMER', partyId: 1, occurredAt: 'x', kind: 'pago', delta: '-300', accountId: 1 }, balance: '700' });
    expect(e.delta).toBe(-300);
    expect(e.partyId).toBe('1');
    expect(mapLedgerRow({ id: 3, party: 'SUPPLIER', partyId: 9, delta: 5, kind: 'compra' }).party).toBe('supplier');
  });
});
