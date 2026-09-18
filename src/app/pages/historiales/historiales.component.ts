import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FdatePipe, FtimePipe, MoneyPipe } from '../../shared/format';
import { Store } from '../../core/store';

/** Historial de stock (libro mayor), historial de precios y ajustes masivos de stock. */
@Component({
  selector: 'app-historiales',
  imports: [FormsModule, FdatePipe, FtimePipe, MoneyPipe],
  template: `
    <h1>{{ titulo() }}</h1>
    <p class="sub">{{ subtitulo() }}</p>
    <div class="toolbar">
      <select [ngModel]="prod()" (ngModelChange)="prod.set($event)"><option value="">Todos los productos</option>@for (p of store.db().products; track p.id) { <option [value]="p.id">{{ p.name }}</option> }</select>
      @if (modo === 'stock') { <select [ngModel]="motivo()" (ngModelChange)="motivo.set($event)"><option value="">Todos los tipos</option><option>Creación de producto</option><option>Venta en caja</option><option>Compra recibida</option><option>Actualización manual</option></select> }
    </div>

    @if (modo === 'stock') {
      <table><tr><th>Fecha</th><th>Stock anterior</th><th>Movimiento</th><th>Stock resultante</th><th>Producto</th><th>Detalles</th></tr>
        @for (m of movs(); track m.id) {
          <tr><td><span class="av">{{ m.user[0] }}</span>{{ m.at | fdate }} {{ m.at | ftime }}</td><td><span class="badge b-gray">{{ m.prev }}</span></td>
            <td><span class="badge" [class]="'badge ' + (m.delta > 0 ? 'b-green' : 'b-red')">{{ m.delta > 0 ? '▲' : '▼' }} {{ abs(m.delta) }}</span></td><td><span class="badge b-gray">{{ m.result }}</span></td>
            <td>{{ store.product(m.productId)?.name }}</td><td><b>{{ m.reason }}</b>@if (m.ref) { <br /><small class="muted">{{ m.ref }}</small> }</td></tr>
        } @empty { <tr><td colspan="6" class="empty">Todavía no hay movimientos de stock.</td></tr> }</table>
    }
    @if (modo === 'precios') {
      <table><tr><th>Fecha</th><th>Producto</th><th>Campo</th><th class="right">Anterior</th><th class="right">Nuevo</th><th>Variación</th><th>Responsable</th></tr>
        @for (c of cambios(); track c.id) {
          <tr><td>{{ c.at | fdate }} {{ c.at | ftime }}</td><td>{{ store.product(c.productId)?.name }}</td><td>{{ nombreCampo(c.field) }}</td><td class="right">{{ c.prev | money }}</td><td class="right">{{ c.next | money }}</td>
            <td><span class="badge" [class]="'badge ' + (c.next > c.prev ? 'b-red' : 'b-green')">{{ variacion(c.prev, c.next) }}</span></td><td>{{ c.user }}</td></tr>
        } @empty { <tr><td colspan="7" class="empty">Todavía no hay cambios de precio.</td></tr> }</table>
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
  titulo() { return { stock: 'Historial de stock', precios: 'Historial de precios', ajustes: 'Ajustes de stock' }[this.modo]; }
  subtitulo() { return { stock: 'Revisá todos los movimientos de stock de tus productos.', precios: 'Seguí cómo cambiaron los precios de tus productos.', ajustes: 'Revisá los ajustes manuales de stock: quién los hizo, cuándo y qué tocaron.' }[this.modo]; }
  readonly movs = computed(() => [...this.store.db().stockMoves].reverse().filter((m) => (!this.prod() || m.productId === this.prod()) && (!this.motivo() || m.reason === this.motivo())));
  readonly cambios = computed(() => [...this.store.db().priceChanges].reverse().filter((c) => !this.prod() || c.productId === this.prod()));
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
