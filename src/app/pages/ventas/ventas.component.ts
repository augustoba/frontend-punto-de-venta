import { Component, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

interface Venta {
  fecha: string;
  hora: string;
  vendedor: string;
  cliente: string | null;
  total: number;
  medio: 'Efectivo' | 'Transferencia' | 'Tarjeta de Débito/Crédito' | 'Cuenta corriente';
  productos: number;
}

/**
 * Pantalla Ventas (réplica de Envi /sales). Por ahora con datos de muestra;
 * se conecta al backend en la parte siguiente (ver docs/ROADMAP.md).
 */
@Component({
  selector: 'app-ventas',
  imports: [CurrencyPipe],
  template: `
    <h1>Ventas</h1>
    <p class="sub">Creá, editá y monitoreá las ventas de tu negocio.</p>

    <small class="muted">VENTAS DE HOY</small>
    <div class="kpis" style="margin-top: 6px">
      <div class="kpi"><small>Ventas</small><strong>{{ hoy().length }}</strong><br /><span class="muted">Hoy</span></div>
      <div class="kpi">
        <small>Monto vendido</small><strong>{{ montoHoy() | currency: 'ARS' : '$ ' : '1.2-2' }}</strong><br /><span class="muted">Hoy</span>
      </div>
      <div class="kpi">
        <small>Medios de pago · {{ hoy().length }} ventas</small>
        <span class="muted">{{ resumenMedios() }}</span>
      </div>
    </div>

    <div class="toolbar">
      <input placeholder="🔍 Buscar..." style="width: 270px" (input)="buscar.set($any($event.target).value)" />
      <button>Filtrar</button><span class="sp"></span><button>⟳</button><button>⭳</button>
      <button class="cta">+ Nueva venta</button>
    </div>

    <table>
      <tr><th>Fecha</th><th>Vendedor</th><th>Cliente</th><th>Total</th><th>Medio de pago</th><th>Detalle</th></tr>
      @for (v of filtradas(); track $index) {
        <tr>
          <td><b>{{ v.fecha }}</b><br /><small class="muted">{{ v.hora }}</small></td>
          <td><span class="av">{{ v.vendedor[0].toUpperCase() }}</span>{{ v.vendedor }}</td>
          <td>
            @if (v.cliente) { <span class="av">{{ v.cliente[0] }}</span>{{ v.cliente }} }
            @else { <span class="av" style="background: var(--avatar-gray)">?</span><span class="muted">Sin definir</span> }
          </td>
          <td>{{ v.total | currency: 'ARS' : '$ ' : '1.2-2' }}</td>
          <td><span class="badge" [class]="'badge ' + claseMedio(v.medio)">{{ v.medio }}</span></td>
          <td>{{ v.productos }} prod.</td>
        </tr>
      } @empty {
        <tr><td colspan="6" class="muted" style="text-align: center">No se encontraron ventas</td></tr>
      }
    </table>
    <div class="pager"><span>Mostrando {{ filtradas().length }} de {{ ventas.length }}</span></div>
  `,
})
export class VentasComponent {
  readonly ventas: Venta[] = [
    { fecha: '18/09/26', hora: '14:05', vendedor: 'juan perez', cliente: 'Clara López', total: 1000, medio: 'Cuenta corriente', productos: 1 },
    { fecha: '18/09/26', hora: '14:03', vendedor: 'juan perez', cliente: null, total: 2400, medio: 'Efectivo', productos: 1 },
    { fecha: '17/09/26', hora: '13:45', vendedor: 'juan perez', cliente: 'José Pérez', total: 2400, medio: 'Transferencia', productos: 1 },
    { fecha: '15/09/26', hora: '13:45', vendedor: 'juan perez', cliente: 'Jorge García', total: 7000, medio: 'Tarjeta de Débito/Crédito', productos: 1 },
  ];
  readonly buscar = signal('');
  readonly filtradas = computed(() => {
    const q = this.buscar().trim().toLowerCase();
    return q ? this.ventas.filter((v) => (v.cliente ?? '').toLowerCase().includes(q) || v.vendedor.includes(q)) : this.ventas;
  });
  readonly hoy = computed(() => this.ventas.filter((v) => v.fecha === '18/09/26'));
  readonly montoHoy = computed(() => this.hoy().reduce((s, v) => s + v.total, 0));
  readonly resumenMedios = computed(() => {
    const h = this.hoy();
    const por = new Map<string, number>();
    h.forEach((v) => por.set(v.medio, (por.get(v.medio) ?? 0) + 1));
    return [...por].map(([m, n]) => `${m} ${Math.round((n / h.length) * 100)}%`).join(' · ') || '—';
  });

  claseMedio(m: Venta['medio']): string {
    return { Efectivo: 'b-green', Transferencia: 'b-blue', 'Tarjeta de Débito/Crédito': 'b-amber', 'Cuenta corriente': 'b-gray' }[m];
  }
}
