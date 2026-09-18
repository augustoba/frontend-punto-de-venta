import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Store } from '../../core/store';
import { FdatePipe, FtimePipe } from '../../shared/format';
import { ModalComponent } from '../../shared/modal.component';

interface Wh { id: number; name: string; main: boolean; }
interface StockRow { productId: number; name: string; total: number; byWarehouse: Record<string, number>; }
interface Transfer { id: number; number: number; occurredAt: string; fromId: number; toId: number; username: string; notes: string; lines: { productId: number; name: string; qty: number }[]; }
interface Draft { fromId: number | null; toId: number | null; notes: string; lines: { productId: string; qty: number }[]; }

/** Depósitos y transferencias de stock (requiere la API: el stock por depósito vive en el servidor). */
@Component({
  selector: 'app-transferencias',
  imports: [FormsModule, ModalComponent, FdatePipe, FtimePipe],
  template: `
    <h1>Transferencias de stock</h1>
    <p class="sub">Seguí las transferencias de stock entre depósitos. El stock total no cambia: sólo dónde está.</p>

    @if (!store.remote()) {
      <div class="card" style="padding:20px">Esta pantalla necesita la conexión con la API. Iniciá el servidor y volvé a cargar la página.</div>
    } @else {
      <div class="toolbar">
        @for (w of depositos(); track w.id) { <span class="badge" [class.b-blue]="w.main">{{ w.main ? '★ ' : '' }}{{ w.name }}</span> }
        <span class="sp"></span>
        <button (click)="nuevoDeposito()">+ Nuevo depósito</button>
        <button class="cta" [disabled]="depositos().length < 2" (click)="abrir()">+ Nueva transferencia</button>
      </div>

      <h3>Stock por depósito</h3>
      <table>
        <tr><th>Producto</th>@for (w of depositos(); track w.id) { <th>{{ w.name }}</th> }<th>Total</th></tr>
        @for (r of stock(); track r.productId) {
          <tr><td><b>{{ r.name }}</b></td>@for (w of depositos(); track w.id) { <td>{{ r.byWarehouse[w.id] }}</td> }<td>{{ r.total }}</td></tr>
        } @empty { <tr><td [attr.colspan]="depositos().length + 2">Todavía no hay productos.</td></tr> }
      </table>

      <h3 style="margin-top:24px">Historial</h3>
      <table>
        <tr><th>Fecha</th><th>N°</th><th>Origen</th><th>Destino</th><th>Detalle</th><th>Usuario</th></tr>
        @for (t of transfers(); track t.id) {
          <tr><td>{{ t.occurredAt | fdate }} {{ t.occurredAt | ftime }}</td><td><b>T-{{ t.number }}</b></td><td>{{ nombre(t.fromId) }}</td><td>{{ nombre(t.toId) }}</td>
            <td>{{ resumen(t) }}</td><td>{{ t.username }}</td></tr>
        } @empty { <tr><td colspan="6">Todavía no hay transferencias.</td></tr> }
      </table>
    }
    @if (error()) { <div style="margin-top:12px;color:#8a1c1c">{{ error() }}</div> }

    @if (draft(); as d) {
      <app-modal title="Nueva transferencia" [width]="620" (closed)="draft.set(null)">
        <div class="row">
          <label class="grow">ORIGEN<select [(ngModel)]="d.fromId"><option [ngValue]="null">—</option>@for (w of depositos(); track w.id) { <option [ngValue]="w.id">{{ w.name }}</option> }</select></label>
          <label class="grow">DESTINO<select [(ngModel)]="d.toId"><option [ngValue]="null">—</option>@for (w of depositos(); track w.id) { <option [ngValue]="w.id">{{ w.name }}</option> }</select></label>
        </div>
        <h4>Productos</h4>
        @for (l of d.lines; track $index) {
          <div class="row" style="margin-bottom:6px">
            <select class="grow" [(ngModel)]="l.productId"><option value="">Elegí un producto</option>
              @for (p of productos(); track p.id) { <option [value]="p.id">{{ p.name }} (disp. {{ disponible(d.fromId, p.id) }})</option> }</select>
            <input type="number" min="1" style="width:90px" [(ngModel)]="l.qty" />
            <button type="button" (click)="d.lines.splice($index, 1)">✕</button>
          </div>
        }
        <button type="button" (click)="d.lines.push({ productId: '', qty: 1 })">+ Agregar producto</button>
        <label style="margin-top:12px;display:block">NOTAS<input [(ngModel)]="d.notes" /></label>
        @if (error()) { <div style="color:#8a1c1c;margin-top:8px">{{ error() }}</div> }
        <div class="mf"><button (click)="draft.set(null)">Cancelar</button><button class="cta" [disabled]="!valido(d)" (click)="guardar(d)">Transferir</button></div>
      </app-modal>
    }
    @if (depNuevo()) {
      <app-modal title="Nuevo depósito" [width]="420" (closed)="depNuevo.set(false)">
        <label>NOMBRE<input [(ngModel)]="depNombre" /></label>
        <div class="mf"><button (click)="depNuevo.set(false)">Cancelar</button><button class="cta" [disabled]="!depNombre.trim()" (click)="crearDeposito()">Crear</button></div>
      </app-modal>
    }
  `,
})
export class TransferenciasComponent {
  private readonly api = inject(Api);
  readonly store = inject(Store);
  readonly depositos = signal<Wh[]>([]);
  readonly stock = signal<StockRow[]>([]);
  readonly transfers = signal<Transfer[]>([]);
  readonly draft = signal<Draft | null>(null);
  readonly depNuevo = signal(false);
  readonly error = signal('');
  depNombre = '';
  readonly productos = computed(() => this.store.db().products.filter((p) => !p.archived && !p.combo.length));

  constructor() { this.cargar(); }

  private msg(e: any): string { return e?.error?.error ?? 'No se pudo completar la operación'; }

  async cargar() {
    if (!this.store.remote()) { setTimeout(() => this.store.remote() && this.cargar(), 1500); return; }
    try {
      const [d, s, t] = await Promise.all([this.api.get<Wh[]>('/api/warehouses'), this.api.get<StockRow[]>('/api/warehouses/stock'), this.api.get<Transfer[]>('/api/stock-transfers')]);
      this.depositos.set(d); this.stock.set(s); this.transfers.set(t);
    } catch (e) { this.error.set(this.msg(e)); }
  }

  nombre(id: number) { return this.depositos().find((w) => w.id === id)?.name ?? '—'; }
  resumen(t: Transfer) { return t.lines.map((l) => `${l.qty} × ${l.name}`).join(', '); }
  disponible(depositoId: number | null, productId: string): number | string {
    return depositoId == null ? '—' : (this.stock().find((r) => String(r.productId) === productId)?.byWarehouse[depositoId] ?? 0);
  }

  abrir() {
    const [a, b] = this.depositos();
    this.error.set('');
    this.draft.set({ fromId: a?.id ?? null, toId: b?.id ?? null, notes: '', lines: [{ productId: '', qty: 1 }] });
  }
  valido(d: Draft) { return !!d.fromId && !!d.toId && d.fromId !== d.toId && d.lines.length > 0 && d.lines.every((l) => l.productId && l.qty > 0); }

  async guardar(d: Draft) {
    this.error.set('');
    try {
      await this.api.post('/api/stock-transfers', { fromId: d.fromId, toId: d.toId, notes: d.notes, lines: d.lines.map((l) => ({ productId: Number(l.productId), qty: +l.qty })) });
      this.draft.set(null);
      await this.cargar();
    } catch (e) { this.error.set(this.msg(e)); }
  }

  nuevoDeposito() { this.depNombre = ''; this.error.set(''); this.depNuevo.set(true); }
  async crearDeposito() {
    this.error.set('');
    try { await this.api.post('/api/warehouses', { name: this.depNombre }); this.depNuevo.set(false); await this.cargar(); }
    catch (e) { this.error.set(this.msg(e)); }
  }
}
