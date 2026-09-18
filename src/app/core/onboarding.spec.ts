import { TestBed } from '@angular/core/testing';
import { Onboarding } from './onboarding';
import { Store } from './store';

describe('Onboarding (primeros pasos)', () => {
  let ob: Onboarding, store: Store;
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    store = TestBed.inject(Store); store.reset();
    ob = TestBed.inject(Onboarding);
  });

  it('arranca en 0 % y va avanzando con lo que se carga', () => {
    expect(ob.porcentaje()).toBe(0);
    const id = store.saveProduct({ name: 'A', price: 100 }, 5);
    expect(ob.tareas().find((t) => t.id === 'producto')!.hecha).toBeTrue();
    expect(ob.porcentaje()).toBe(20);
    store.registerSale({ customerId: null, lines: [{ productId: id, qty: 1 }], discountPct: 0, method: 'Efectivo', paid: true, notes: '', invoice: false });
    expect(ob.tareas().find((t) => t.id === 'venta')!.hecha).toBeTrue();
    expect(ob.porcentaje()).toBe(40);
  });

  it('hacer la primera venta queda bloqueado hasta cargar un producto', () => {
    expect(ob.tareas().find((t) => t.id === 'venta')!.bloqueada).toBeTrue();
    store.saveProduct({ name: 'A', price: 100 }, 1);
    expect(ob.tareas().find((t) => t.id === 'venta')!.bloqueada).toBeFalse();
  });

  it('configurar el POS se marca y se recuerda; los esenciales son 2', () => {
    expect(ob.esenciales().length).toBe(2);
    ob.marcarPosConfigurado();
    expect(ob.tareas().find((t) => t.id === 'pos')!.hecha).toBeTrue();
    expect(ob.esencialesHechas()).toBe(1);
  });
});
