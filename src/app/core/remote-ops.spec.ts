import { TestBed } from '@angular/core/testing';
import { REMOTE_OPS } from './remote-ops';
import { Store } from './store';

describe('operaciones remotas', () => {
  it('cada operación reemplaza un método real del store', () => {
    const store = TestBed.inject(Store) as any;
    for (const name of Object.keys(REMOTE_OPS)) expect(typeof store[name]).toBe('function', name);
  });
  it('sin modo servidor el store sigue operando en local', () => {
    localStorage.clear();
    const store = TestBed.inject(Store);
    store.reset();
    expect(store.remote()).toBeFalse();
    const id = store.saveProduct({ name: 'X', price: 10 }, 3);
    expect(store.product(id)!.stock).toBe(3);
  });
});
