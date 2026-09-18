import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../shared/modal.component';
import { FdatePipe, FtimePipe, MoneyPipe } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { CashSession } from '../../core/models';

/** Cierres de caja (réplica de Envi): turnos, diferencias por empleado, verificación. Ver ANALISIS_caja.md */
@Component({
  selector: 'app-cierres',
  imports: [FormsModule, ModalComponent, MoneyPipe, FdatePipe, FtimePipe],
  template: `
    <h1>Cierres de caja</h1>
    <p class="sub">Consultá los cierres de caja de cada turno.</p>
    <div class="toolbar"><input class="search" placeholder="Buscar..." style="width: 240px" [ngModel]="q()" (ngModelChange)="q.set($event)" /><span class="sp"></span>
      <button (click)="difs.set(true)">≡ Diferencias por empleado</button>
      <span class="link" (click)="alertaOpen.set(true)">🔔 Configurar alerta de diferencia</span></div>
    @if (!store.settings().arqueo) { <p class="note info">El arqueo de caja está desactivado. Activalo en Ajustes › Ventas y caja para abrir y cerrar la caja en cada turno.</p> }
    <table>
      <tr><th>Caja / turno</th><th>Apertura de caja</th><th>Cierre de caja</th><th>Comentarios</th></tr>
      @for (s of lista(); track s.id) {
        <tr>
          <td><b>{{ store.account(s.accountId)?.name }}</b><br /><span class="av">{{ s.user[0] }}</span>{{ s.user }}<br />{{ s.openedAt | fdate }}<br /><button style="height: 28px; margin-top: 4px" (click)="ver.set(s)">≡ Ver movimientos</button></td>
          <td>Hora {{ s.openedAt | fdate }} {{ s.openedAt | ftime }}<br />Saldo {{ s.openingBalance | money }}</td>
          <td>@if (s.closedAt) { Hora {{ s.closedAt | fdate }} {{ s.closedAt | ftime }}<br />Saldo {{ s.real | money }}
                @if (s.diff) { <br />Diferencia: <b [class]="s.diff > 0 ? 'pos' : 'neg'">{{ s.diff > 0 ? '+' : '-' }} {{ abs(s.diff) | money }}</b> @if (abs(s.diff) > store.settings().alertDiff) { <span class="badge b-red">Supera la alerta</span> } } }
              @else { <i class="muted">Caja sin cerrar</i> }</td>
          <td><span class="link" (click)="nota(s)">+ {{ s.note ? 'Editar notas' : 'Agregar notas' }}</span>@if (s.note) { <br /><small class="muted">{{ s.note }}</small> }<br />
            <label class="row"><span class="sw" [class.on]="s.verified" (click)="store.setSessionVerified(s.id, !s.verified)"></span> <span class="badge" [class]="'badge ' + (s.verified ? 'b-green' : 'b-red')">{{ s.verified ? 'Sí' : 'No' }}</span> Verificado</label></td>
        </tr>
      } @empty { <tr><td colspan="4" class="empty">Todavía no hay cierres de caja.</td></tr> }
    </table>
    <div class="pager"><span>Mostrando {{ lista().length }} de {{ store.db().sessions.length }}</span></div>

    @if (ver(); as s) {
      <app-modal title="Detalle de movimientos de caja" [width]="620" (closed)="ver.set(null)">
        <div class="row" style="justify-content: space-between"><div><small class="muted">SALDO INICIAL</small><br /><b style="font-size: 20px">{{ s.openingBalance | money }}</b></div>
          <div><small class="muted">TOTAL INGRESOS</small><br /><b class="pos" style="font-size: 20px">{{ tot(s, 1) | money }}</b></div><div><small class="muted">TOTAL EGRESOS</small><br /><b class="neg" style="font-size: 20px">{{ tot(s, -1) | money }}</b></div></div>
        <table style="background: none; margin-top: 10px">
          @for (m of movs(s); track m.id) { <tr><td>{{ m.at | ftime }}</td><td>{{ m.description }}</td><td class="right" [class]="m.amount >= 0 ? 'right pos' : 'right neg'">{{ m.amount | money }}</td></tr> }
          @empty { <tr><td class="empty">No se encontraron movimientos</td></tr> }
        </table>
      </app-modal>
    }
    @if (difs()) {
      <app-modal title="Resumen diferencias de caja" [width]="560" (closed)="difs.set(false)">
        <table style="background: none"><tr><th>Empleado</th><th>Cant. diferencias</th><th>Total diferencias</th><th>Promedio por cierre</th></tr>
          @for (r of porEmpleado(); track r.user) { <tr><td><span class="av">{{ r.user[0] }}</span>{{ r.user }}</td><td>{{ r.n }}</td><td>{{ r.total | money }}</td><td>{{ r.prom | money }}</td></tr> }
          @empty { <tr><td colspan="4" class="empty">Sin cierres con diferencia.</td></tr> }</table>
      </app-modal>
    }
    @if (alertaOpen()) {
      <app-modal title="Alerta de diferencia" [width]="420" (closed)="alertaOpen.set(false)">
        <p class="muted">Las diferencias menores a este valor no se marcan como error.</p>
        <div class="field"><label>Monto ($)</label><input type="number" [(ngModel)]="alerta" /></div>
        <div class="mf"><button (click)="alertaOpen.set(false)">Cancelar</button><button class="cta" (click)="store.updateSettings({ alertDiff: +alerta || 0 }); alertaOpen.set(false)">Aceptar</button></div>
      </app-modal>
    }
  `,
})
export class CierresComponent {
  readonly store = inject(Store);
  abs = Math.abs;
  readonly q = signal(''); readonly ver = signal<CashSession | null>(null); readonly difs = signal(false); readonly alertaOpen = signal(false);
  alerta = this.store.settings().alertDiff;
  readonly lista = computed(() => {
    const q = this.q().trim().toLowerCase();
    return [...this.store.db().sessions].reverse().filter((s) => !q || s.user.toLowerCase().includes(q) || (this.store.account(s.accountId)?.name ?? '').toLowerCase().includes(q));
  });
  movs(s: CashSession) {
    return this.store.db().movements.filter((m) => m.accountId === s.accountId && m.at >= s.openedAt && (!s.closedAt || m.at <= s.closedAt) && m.sourceType !== 'apertura');
  }
  tot(s: CashSession, sign: 1 | -1): number { return r2(Math.abs(this.movs(s).filter((m) => Math.sign(m.amount) === sign).reduce((t, m) => t + m.amount, 0))); }
  nota(s: CashSession) { const n = prompt('Notas del cierre', s.note); if (n !== null) this.store.setSessionNote(s.id, n); }
  readonly porEmpleado = computed(() => {
    const m = new Map<string, { n: number; total: number; cierres: number }>();
    this.store.db().sessions.filter((s) => s.closedAt).forEach((s) => {
      const x = m.get(s.user) ?? { n: 0, total: 0, cierres: 0 }; x.cierres++; if (s.diff) { x.n++; x.total += Math.abs(s.diff); } m.set(s.user, x);
    });
    return [...m].filter(([, v]) => v.n).map(([user, v]) => ({ user, n: v.n, total: r2(v.total), prom: r2(v.total / v.cierres) }));
  });
}
