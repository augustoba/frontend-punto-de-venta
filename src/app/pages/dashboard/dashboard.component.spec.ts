import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store } from '../../core/store';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard', () => {
  let store: Store, d: DashboardComponent;
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    store = TestBed.inject(Store); store.reset();
    d = TestBed.createComponent(DashboardComponent).componentInstance;
  });

  it('calcula ganancia bruta, egresos y ganancia neta del mes', () => {
    const id = store.saveProduct({ name: 'A', price: 1000, cost: 600 }, 10);
    store.registerSale({ customerId: null, lines: [{ productId: id, qty: 2 }], discountPct: 0, method: 'Efectivo', paid: true, notes: '', invoice: false });
    store.addMovement({ accountId: store.accounts()[0].id, amount: -300, category: 'Servicios', subcategory: 'Luz', description: 'Luz' });
    expect(d.hoyTotal()).toBe(2000);
    expect(d.gananciaBruta()).toBe(800);           // 2000 - 2*600
    expect(d.egresos()).toBe(300);
    expect(d.gananciaNeta()).toBe(500);
    expect(d.topProductos()[0].name).toBe('A');
  });

  it('alerta de stock cuando llega al mínimo y avisa márgenes bajos', () => {
    store.saveProduct({ name: 'B', price: 100, cost: 95, lowStock: 5 }, 3);
    expect(d.alertas().map((p) => p.name)).toContain('B');
    expect(d.margenesBajos().map((p) => p.name)).toContain('B');
  });

  it('un servicio no cuenta como producto ni da alerta de stock', () => {
    store.saveProduct({ name: 'Corte', price: 3000, cost: 0, service: true }, 0);
    expect(d.productos()).toBe(0);
    expect(d.alertas().length).toBe(0);
    expect(d.serviciosN()).toBe(1);
  });
});
