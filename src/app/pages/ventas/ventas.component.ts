import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmptyGuideComponent } from '../../shared/empty-guide.component';
import { ModalComponent } from '../../shared/modal.component';
import { AvcolorPipe, FdatePipe, FtimePipe, MoneyPipe, fdate } from '../../shared/format';
import { Store } from '../../core/store';
import { Sale } from '../../core/models';

/** Ventas (réplica de Envi /sales): KPIs del día, filtros, tabla, detalle y anulación. */
@Component({
  selector: 'app-ventas',
  imports: [FormsModule, RouterLink, ModalComponent, MoneyPipe, FdatePipe, FtimePipe, AvcolorPipe, EmptyGuideComponent],
  template: `
    <h1>Ventas</h1>
    <p class="sub">Creá, editá y monitoreá las ventas de tu negocio.</p>

    <small class="muted">VENTAS DE HOY</small>
    <div class="kpis k3" style="margin-top: 6px">
      <div class="kpi"><small>Ventas</small><strong>{{ hoy().length }}</strong><br /><span class="muted">Hoy</span></div>
      <div class="kpi"><small>Monto vendido</small><strong>{{ montoHoy() | money }}</strong><br /><span class="muted">Hoy</span></div>
      <div class="kpi">
        <small>Medios de pago · {{ hoy().length }} ventas</small>
        <div class="bar">@for (m of medios(); track m.nombre) { <i [style.flex]="m.n" [style.background]="m.color"></i> }</div>
        <div class="legend">@for (m of medios(); track m.nombre) { <span><i class="dot" [style.background]="m.color"></i>{{ m.nombre }} {{ pct(m.n) }}%</span> } @empty { <span>—</span> }</div>
      </div>
    </div>

    <div class="toolbar">
      <input placeholder="Buscar..." [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <button (click)="filtros.set(!filtros())"><i class="fa-solid fa-filter"></i>Filtrar</button><span class="sp"></span>
      <button class="iconbtn" (click)="refrescar()" title="Actualizar"><i class="fa-solid fa-rotate-right"></i></button>
      <button class="iconbtn" (click)="exportar()" title="Exportar CSV"><i class="fa-solid fa-download"></i></button>
      <a class="btn cta" routerLink="/caja" style="display: inline-grid; place-items: center; text-decoration: none"><span><i class="fa-solid fa-plus"></i>Nueva venta</span></a>
    </div>
    @if (filtros()) {
      <div class="card" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px">
        <div class="field"><label>Desde</label><input type="date" [ngModel]="desde()" (ngModelChange)="desde.set($event)" /></div>
        <div class="field"><label>Hasta</label><input type="date" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" /></div>
        <div class="field"><label>Cliente</label><select [ngModel]="fCliente()" (ngModelChange)="fCliente.set($event)"><option value="">Todos</option>@for (c of store.customers(); track c.id) {<option [value]="c.id">{{ c.name }} {{ c.lastName }}</option>}</select></div>
        <div class="field"><label>Medio de pago</label><select [ngModel]="fMedio()" (ngModelChange)="fMedio.set($event)"><option value="">Todos</option><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Cuenta corriente</option></select></div>
      </div>
    }

    <table>
      <tr><th>Fecha</th><th>Vendedor</th><th>Cliente</th><th>Total</th><th>Medio de pago</th><th>Detalle</th><th></th></tr>
      @for (v of filtradas(); track v.id) {
        <tr>
          <td><b>{{ v.at | fdate }}</b><br /><small class="muted">{{ v.at | ftime }}</small></td>
          <td><span class="av" [style.background]="v.seller | avcolor">{{ v.seller[0] }}</span><b>{{ v.seller }}</b></td>
          <td>@if (v.customerId) { <span class="av round" [style.background]="store.customerName(v.customerId) | avcolor">{{ store.customerName(v.customerId)[0] }}</span>{{ store.customerName(v.customerId) }} } @else { <span class="av round" style="background: var(--avatar-gray)">?</span><span class="muted">Sin definir</span> }</td>
          <td><b>{{ v.total | money }}</b></td>
          <td><span class="pay {{ pagoClase(v.method) }}"><i class="fa-solid {{ pagoIcono(v.method) }}"></i>{{ v.method }}</span></td>
          <td>{{ v.lines.length }} prod.<br /><a class="link" (click)="detalle.set(v)">Ver más<i class="fa-solid fa-chevron-down"></i></a></td>
          <td class="right"><div class="menu"><button class="x" (click)="menu.set(menu() === v.id ? '' : v.id)">⋮</button>
            @if (menu() === v.id) { <div class="pop"><button (click)="detalle.set(v); menu.set('')">Ver detalle</button><button (click)="facturar(v); menu.set('')">Generar factura</button><button class="danger" (click)="anular(v); menu.set('')">Eliminar</button></div> }</div></td>
        </tr>
      } @empty {
        <tr><td colspan="7" class="empty">@if (!store.db().sales.length) { <app-empty-guide icon="cart-shopping" titulo="Hacé tu primera venta" texto="Abrí la caja registradora, cargá productos y cobrá. Tus ventas van a aparecer acá." cta="Ir a la caja" link="/caja" /> } @else { No hay ventas que coincidan con los filtros. }</td></tr>
      }
    </table>
    <div class="pager"><span>Mostrando {{ filtradas().length }} de {{ store.db().sales.length }}</span></div>

    @if (detalle(); as v) {
      <app-modal [title]="'Detalles de venta #' + v.number" [width]="640" (closed)="detalle.set(null)">
        <div class="kpi" style="background: #e8e8f5"><small>Total de la venta</small><strong>{{ v.total | money }}</strong> <span class="badge" [class]="'badge ' + (v.paid ? 'b-green' : 'b-amber')" style="float: right">{{ v.paid ? 'Cobrada' : 'Pendiente de cobro' }}</span></div>
        <div class="grid2" style="margin: 12px 0">
          <div><small class="muted">CLIENTE</small><br />{{ store.customerName(v.customerId) }}</div><div><small class="muted">VENDEDOR</small><br />{{ v.seller }}</div>
          <div><small class="muted">FECHA Y HORA</small><br />{{ v.at | fdate }} {{ v.at | ftime }}</div><div><small class="muted">MEDIO DE PAGO</small><br /><span class="badge" [class]="'badge ' + clase(v)">{{ v.method }}</span></div>
        </div>
        <table style="background: none"><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Desc.</th><th class="right">Subtotal</th></tr>
          @for (l of v.lines; track $index) { <tr><td>{{ l.name }}</td><td>{{ l.price | money }}</td><td>×{{ l.qty }}</td><td>{{ l.discountUnit ? (l.discountUnit | money) : '-' }}</td><td class="right">{{ (l.price - l.discountUnit) * l.qty | money }}</td></tr> }
        </table>
        <div class="right" style="margin-top: 8px">Subtotal {{ v.subtotal | money }}<br />Descuento ({{ v.discountPct }}%) − {{ v.discountAmount | money }}<br /><b style="font-size: 20px">Total {{ v.total | money }}</b></div>
        @if (v.notes) { <p class="muted">Notas: {{ v.notes }}</p> }
        <div class="mf"><button class="cta" (click)="detalle.set(null)">Aceptar</button></div>
      </app-modal>
    }
  `,
})
export class VentasComponent {
  readonly store = inject(Store);
  readonly q = signal('');
  readonly filtros = signal(false);
  readonly desde = signal(''); readonly hasta = signal('');
  readonly fCliente = signal(''); readonly fMedio = signal('');
  readonly detalle = signal<Sale | null>(null);
  readonly menu = signal('');

  private esHoy(iso: string) { return fdate(iso) === fdate(new Date().toISOString()); }
  readonly hoy = computed(() => this.store.db().sales.filter((v) => this.esHoy(v.at)));
  readonly montoHoy = computed(() => this.hoy().reduce((s, v) => s + v.total, 0));
  private readonly colores: Record<string, string> = { Efectivo: 'var(--success)', Transferencia: 'var(--accent-blue)', Tarjeta: 'var(--accent-amber)', 'Cuenta corriente': '#a267ac' };
  readonly medios = computed(() => {
    const por = new Map<string, number>();
    this.hoy().forEach((v) => por.set(v.method, (por.get(v.method) ?? 0) + 1));
    return [...por].map(([nombre, n]) => ({ nombre, n, color: this.colores[nombre] }));
  });
  readonly resumen = computed(() => { const t = this.hoy().length; return this.medios().map((m) => `${m.nombre} ${Math.round((m.n / t) * 100)}%`).join(' · ') || '—'; });

  readonly filtradas = computed(() => {
    const q = this.q().trim().toLowerCase();
    return [...this.store.db().sales].reverse().filter((v) =>
      (!q || this.store.customerName(v.customerId).toLowerCase().includes(q) || v.seller.toLowerCase().includes(q)) &&
      (!this.desde() || v.at.slice(0, 10) >= this.desde()) && (!this.hasta() || v.at.slice(0, 10) <= this.hasta()) &&
      (!this.fCliente() || v.customerId === this.fCliente()) && (!this.fMedio() || v.method === this.fMedio()));
  });
  pct(n: number): number { const t = this.hoy().length; return t ? Math.round((n / t) * 100) : 0; }
  pagoClase(m: string): string { return { Efectivo: 'pay-cash', Transferencia: 'pay-transf', Tarjeta: 'pay-card', 'Cuenta corriente': 'pay-cc' }[m] ?? 'pay-card'; }
  pagoIcono(m: string): string { return { Efectivo: 'fa-money-bill-wave', Transferencia: 'fa-right-left', Tarjeta: 'fa-credit-card', 'Cuenta corriente': 'fa-wallet' }[m] ?? 'fa-circle'; }
  refrescar() { if (this.store.remote()) this.store.sync(); }
  clase(v: Sale): string { return { Efectivo: 'b-green', Transferencia: 'b-blue', Tarjeta: 'b-amber', 'Cuenta corriente': 'b-gray' }[v.method]; }
  facturar(v: Sale) { if (!v.invoiced) { this.store.createInvoice(v.customerId, v.lines.map((l) => l.name).join(', '), v.total); this.store.db.update((d) => { const c = structuredClone(d); const s = c.sales.find((x) => x.id === v.id); if (s) s.invoiced = true; return c; }); } }
  anular(v: Sale) { if (confirm(`¿Eliminar la venta #${v.number}? Se devuelve el stock y se quitan sus asientos.`)) this.store.deleteSale(v.id); }
  exportar() {
    const filas = [['N°', 'Fecha', 'Cliente', 'Total', 'Medio'], ...this.filtradas().map((v) => [v.number, v.at, this.store.customerName(v.customerId), v.total, v.method])];
    const url = URL.createObjectURL(new Blob([filas.map((r) => r.join(';')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ventas.csv'; a.click(); URL.revokeObjectURL(url);
  }
}
