import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Db } from './models';
import {
  mapAccount, mapBudget, mapCategory, mapCheque, mapCostCenter, mapCustomer, mapEmployee, mapInvoice, mapMovement, mapLedgerRow,
  mapPriceChange, mapProduct, mapPurchase, mapSale, mapSession, mapSettings, mapShift, mapStockMove, mapSupplier,
} from './mappers';

/** Trae todo de pos-api y lo deja con la forma del `Db` que ya usan las pantallas. */
@Injectable({ providedIn: 'root' })
export class Remote {
  private readonly http = inject(HttpClient);
  private get<T = any[]>(url: string): Promise<T> { return firstValueFrom(this.http.get<T>(url)); }

  /** El servidor lista los cheques por tipo: se piden los dos. */
  private async chequesAll(): Promise<any[]> {
    const [cobrar, pagar] = await Promise.all([this.get('/api/cheques?kind=COBRAR'), this.get('/api/cheques?kind=PAGAR')]);
    return [...cobrar, ...pagar];
  }

  /** Devuelve el Db completo desde el servidor, o lanza si la API no responde. */
  async load(base: Pick<Db, 'v' | 'seq' | 'user'>): Promise<Db> {
    const [accounts, movements, categories, products, stockMoves, priceChanges, customers, suppliers, sales, sessions, purchases, budgets, invoices, cheques, costCenters, employees, shifts, settings] =
      await Promise.all([
        this.get('/api/accounts'), this.get('/api/movements'), this.get('/api/categories'), this.get('/api/products'),
        this.get('/api/stock-moves'), this.get('/api/price-changes'), this.get('/api/customers'), this.get('/api/suppliers'),
        this.get('/api/sales'), this.get('/api/cash/sessions'), this.get('/api/purchases'), this.get('/api/budgets'),
        this.get('/api/invoices'), this.chequesAll(), this.get('/api/cost-centers'), this.get('/api/employees'),
        this.get('/api/shifts'), this.get<any>('/api/settings'),
      ]);
    const custList = customers.map(mapCustomer), suppList = suppliers.map(mapSupplier);
    // La cuenta corriente sólo se expone por persona: se piden los libros en paralelo.
    const ledgers = await Promise.all([
      ...custList.map((c) => this.get(`/api/customers/${c.id}/ledger`).then((r) => r.map(mapLedgerRow))),
      ...suppList.map((s) => this.get(`/api/suppliers/${s.id}/ledger`).then((r) => r.map(mapLedgerRow))),
    ]);
    return {
      ...base,
      settings: mapSettings(settings), categories: categories.map(mapCategory), products: products.map(mapProduct),
      customers: custList, suppliers: suppList, accounts: accounts.map(mapAccount), movements: movements.map(mapMovement),
      party: ledgers.flat(), sales: sales.map(mapSale), stockMoves: stockMoves.map(mapStockMove), priceChanges: priceChanges.map(mapPriceChange),
      sessions: sessions.map(mapSession), purchases: purchases.map(mapPurchase), budgets: budgets.map(mapBudget),
      cheques: cheques.map(mapCheque), costCenters: costCenters.map(mapCostCenter), invoices: invoices.map(mapInvoice),
      employees: employees.map((e: any) => mapEmployee(e.employee ?? e)), shifts: shifts.map(mapShift),
    };
  }
}
