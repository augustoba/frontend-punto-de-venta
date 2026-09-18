import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FdatePipe, FtimePipe, MoneyPipe, AvcolorPipe } from '../../shared/format';
import { Store } from '../../core/store';

/** Historial de stock (libro mayor), historial de precios y ajustes masivos de stock. */
@Component({
  selector: 'app-historiales',
  imports: [FormsModule, FdatePipe, FtimePipe, MoneyPipe, AvcolorPipe],
  template: `
    <h1>{{ titulo() }}</h1>
    <p class="sub">{{ subtitulo() }}</p>
    <div class="toolbar">
      <button (click)="filtros.set(!filtros())"><i class="fa-solid fa-filter"></i>Filtrar</button><span class="sp"></span>
      @if (buscando()) { <input class="search" placeholder="Buscar por producto" [ngModel]="q()" (ngModelChange)="q.set($event)" /> }
      @else { <button (click)="buscando.set(true)"><i class="fa-solid fa-magnifying-glass"></i>Buscar por producto</button> }
    </div>
    @if (filtros()) {
      <div class="card filtro-panel">
        <div class="field"><label>Producto</label><select [ngModel]="prod()" (ngModelChange)="prod.set($event)"><option value="">Todos los productos</option>@for (p of store.db().products; track p.id) { <option [value]="p.id">{{ p.name }}</option> }</select></div>
        @if (modo === 'stock') { <div class="field"><label>Tipo de movimiento</label><select [ngModel]="motivo()" (ngModelChange)="motivo.set($event)"><option value="">Todos los tipos</option><option>Creación de producto</option><option>Venta en caja</option><option>Compra recibida</option><option>Actualización manual</option></select></div> }
      </div>
    }

    @if (modo === 'stock') {
      <table><tr><th>Fecha</th><th class="c">Stock anterior</th><th class="c">Movimiento</th><th class="c">Stock resultante</th><th>Producto</th><th>Detalles</th></tr>
        @for (m of movs(); track m.id) {
          <tr><td><span class="datepill"><span class="av sm" [style.background]="m.user | avcolor">{{ m.user[0] }}</span>{{ m.at | fdate }} {{ m.at | ftime }}</span></td><td class="c"><span class="numpill">{{ m.prev }}</span></td>
            <td class="c"><span class="mov" [class.up]="m.delta > 0" [class.down]="m.delta < 0"><i class="fa-solid" [class.fa-angle-up]="m.delta > 0" [class.fa-angle-down]="m.delta < 0"></i>{{ abs(m.delta) }}</span></td><td class="c"><span class="numpill">{{ m.result }}</span></td>
            <td><span class="img-ph sm"><i class="fa-solid fa-bag-shopping"></i></span><b style="margin-left: 8px">{{ store.product(m.productId)?.name }}</b></td>
            <td><i class="fa-solid {{ icono(m.reason) }}" style="margin-right: 8px; color: var(--text-soft)"></i><b>{{ m.reason }}</b>@if (m.ref) { <br /><small class="muted" style="margin-left: 22px">{{ m.ref }}</small> }</td></tr>
        } @empty { <tr><td colspan="6" class="empty">Todavía no hay movimientos de stock.</td></tr> }</table>
      <div class="pager"><span>Mostrando {{ movs().length ? '1–' + movs().length : 0 }} de {{ movs().length }}</span></div>
    }
    @if (modo === 'precios') {
      <table><tr><th>Fecha</th><th>Producto</th><th>Campo</th><th class="right">Anterior</th><th class="right">Precio</th><th>Variación</th><th>Origen</th><th>Lista de precios</th></tr>
        @for (c of cambios(); track c.id) {
          <tr><td><span class="datepill"><span class="av sm" [style.background]="c.user | avcolor">{{ c.user[0] }}</span>{{ c.at | fdate }} {{ c.at | ftime }}</span></td>
            <td><span class="img-ph sm"><i class="fa-solid fa-bag-shopping"></i></span><b style="margin-left: 8px">{{ store.product(c.productId)?.name }}</b></td><td>{{ nombreCampo(c.field) }}</td><td class="right muted">{{ c.prev | money }}</td><td class="right"><b class="pos">{{ c.next | money }}</b></td>
            <td><span class="badge" [class]="'badge ' + (c.next > c.prev ? 'b-red' : 'b-green')">{{ variacion(c.prev, c.next) }}</span></td><td>Manual</td><td>Principal</td></tr>
        } @empty { <tr><td colspan="8" class="empty">Todavía no hay cambios de precio.</td></tr> }</table>
      <div class="pager"><span>Mostrando {{ cambios().length ? '1–' + cambios().length : 0 }} de {{ cambios().length }}</span></div>
    }
    @if (modo === 'ajustes') {
      <table><tr><th>Fecha</th><th>Tipo</th><th>Alcance</th><th>Productos afectados</th><th>Entradas</th><th>Salidas</th></tr>
        @for (a of ajustes(); track a.k) { <tr><td>{{ a.k }}</td><td>{{ a.tipo }}</td><td>Manual</td><td>{{ a.n }}</td><td class="pos">{{ a.ent }}</td><td class="neg">{{ a.sal }}</td></tr> }
        @empty { <tr><td colspan="6" class="empty">Todavía no se hizo ningún ajuste de stock</td></tr> }</table>
    }
  `,
})
export class HistorialesComponent {
  readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  readonly modo: 'stock' | 'precios' | 'ajustes' = ({ 'historial-stock': 'stock', 'historial-precios': 'precios', 'ajustes-stock': 'ajustes' } as const)[this.route.snapshot.routeConfig?.path as 'historial-stock'] ?? 'stock';
  abs = Math.abs;
  readonly prod = signal(this.route.snapshot.queryParamMap.get('p') ?? '');
  readonly motivo = signal('');
  readonly filtros = signal(false); readonly buscando = signal(false); readonly q = signal('');
  icono(r: string) { return { 'Creación de producto': 'fa-plus', 'Venta en caja': 'fa-cash-register', 'Compra recibida': 'fa-bag-shopping', 'Actualización manual': 'fa-pen', 'Ajuste masivo': 'fa-sliders' }[r] ?? 'fa-circle'; }
  private nombreCoincide(id: string) { const q = this.q().trim().toLowerCase(); return !q || (this.store.product(id)?.name ?? '').toLowerCase().includes(q); }
  titulo() { return { stock: 'Historial de stock', precios: 'Historial de precios', ajustes: 'Ajustes de stock' }[this.modo]; }
  subtitulo() { return { stock: 'Revisá todos los movimientos de stock de tus productos.', precios: 'Seguí cómo cambiaron los precios de tus productos.', ajustes: 'Revisá los ajustes manuales de stock: quién los hizo, cuándo y qué tocaron.' }[this.modo]; }
  readonly movs = computed(() => [...this.store.db().stockMoves].reverse().filter((m) => (!this.prod() || m.productId === this.prod()) && (!this.motivo() || m.reason === this.motivo()) && this.nombreCoincide(m.productId)));
  readonly cambios = computed(() => [...this.store.db().priceChanges].reverse().filter((c) => (!this.prod() || c.productId === this.prod()) && this.nombreCoincide(c.productId)));
  readonly ajustes = computed(() => {
    const m = new Map<string, { k: string; tipo: string; n: number; ent: number; sal: number }>();
    this.store.db().stockMoves.filter((s) => s.reason === 'Actualización manual' || s.reason === 'Ajuste masivo').forEach((s) => {
      const k = s.at.slice(0, 10); const x = m.get(k) ?? { k, tipo: s.reason, n: 0, ent: 0, sal: 0 }; x.n++; if (s.delta > 0) x.ent += s.delta; else x.sal += -s.delta; m.set(k, x);
    });
    return [...m.values()].reverse();
  });
  nombreCampo(f: string) { return { price: 'Precio de venta', cost: 'Costo', offer: 'Oferta' }[f as 'price']; }
  variacion(a: number, b: number) { return a ? `${b > a ? '+' : ''}${(((b - a) / a) * 100).toFixed(1)}%` : 'nuevo'; }
}
