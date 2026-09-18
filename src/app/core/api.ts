import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Cliente de la API (pos-api, puerto 8081; en desarrollo pasa por el proxy `/api`).
 * Un método por recurso; los módulos del store se van migrando de a uno a estas llamadas (F11b+).
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  /** true si la API responde; alimenta el indicador del topbar. */
  readonly online = signal<boolean | null>(null);

  private get<T>(url: string) { return firstValueFrom(this.http.get<T>(url)); }
  private post<T>(url: string, body: unknown = {}) { return firstValueFrom(this.http.post<T>(url, body)); }
  private put<T>(url: string, body: unknown) { return firstValueFrom(this.http.put<T>(url, body)); }

  /** Consulta liviana para saber si el backend está arriba. */
  async ping(): Promise<boolean> {
    try { await this.get('/api/settings'); this.online.set(true); return true; }
    catch { this.online.set(false); return false; }
  }

  // Tesorería
  accounts = () => this.get<any[]>('/api/accounts');
  movements = () => this.get<any[]>('/api/movements');
  addMovement = (m: unknown) => this.post('/api/movements', m);
  transfer = (t: unknown) => this.post('/api/transfers', t);
  categories = () => this.get<any[]>('/api/categories');
  // Catálogo
  products = () => this.get<any[]>('/api/products');
  saveProduct = (p: any) => (p.id ? this.put(`/api/products/${p.id}`, p) : this.post('/api/products', p));
  stockMoves = () => this.get<any[]>('/api/stock-moves');
  priceChanges = () => this.get<any[]>('/api/price-changes');
  // Personas
  customers = () => this.get<any[]>('/api/customers');
  suppliers = () => this.get<any[]>('/api/suppliers');
  // Ventas y caja
  sales = () => this.get<any[]>('/api/sales');
  registerSale = (s: unknown) => this.post('/api/sales', s);
  settings = () => this.get<any>('/api/settings');
  // Compras, facturación, finanzas
  purchases = () => this.get<any[]>('/api/purchases');
  budgets = () => this.get<any[]>('/api/budgets');
  invoices = () => this.get<any[]>('/api/invoices');
  cheques = () => this.get<any[]>('/api/cheques');
  costCenters = () => this.get<any[]>('/api/cost-centers');
  // Personal y reportes
  employees = () => this.get<any[]>('/api/employees');
  shifts = () => this.get<any[]>('/api/shifts');
  salesByMethod = () => this.get<any[]>('/api/reports/sales-by-method');
  productRanking = () => this.get<any[]>('/api/reports/product-ranking');
}
