import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ModalComponent } from '../../shared/modal.component';
import { AvcolorPipe, FdatePipe } from '../../shared/format';
import { Store } from '../../core/store';

/** Empleados y horas trabajadas (réplica de Envi). */
@Component({
  selector: 'app-empleados',
  imports: [FormsModule, ModalComponent, FdatePipe, AvcolorPipe],
  template: `
    @if (!horas) {
      <h1>Empleados</h1>
      <p class="sub">Controlá el equipo de cada sucursal, sus permisos y las horas trabajadas en el período.</p>
      <div class="kpis c2">
        <div class="kpi ic-users"><small>Empleados</small><strong>{{ store.db().employees.length + 1 }}</strong></div>
        <div class="kpi ic-hours"><small>Horas trabajadas</small><strong>{{ totalHoras() }} h</strong><br /><span class="muted" style="font-size: 11px">{{ periodo() }}</span></div>
      </div>
      <div class="toolbar"><input class="search" placeholder="Buscar por nombre, rol o email" [ngModel]="q()" (ngModelChange)="q.set($event)" />
        <button><i class="fa-solid fa-filter"></i>Filtrar</button><span class="sp"></span>
        <button class="iconbtn" (click)="refrescar()" title="Actualizar"><i class="fa-solid fa-rotate-right"></i></button>
        <button class="cta" (click)="nuevo()"><i class="fa-solid fa-plus"></i>Crear empleado</button></div>
      <table><tr><th>Fecha de ingreso</th><th>Empleado</th><th>Rol</th><th>Horas acumuladas</th><th>Última actividad</th><th>Email</th><th></th></tr>
        @if (coincide(store.db().user, 'admin', '')) {
          <tr><td class="muted">—</td><td><span class="av" [style.background]="store.db().user | avcolor">{{ store.db().user[0] }}</span><b>{{ store.db().user }}</b></td><td><span class="rol admin"><i class="fa-solid fa-crown"></i>admin</span></td><td class="muted">—</td><td class="muted">—</td><td class="muted">—</td><td></td></tr>
        }
        @for (e of filtrados(); track e.id) {
          <tr><td><b>{{ e.hired | fdate }}</b></td><td><span class="av" [style.background]="e.name | avcolor">{{ e.name[0] }}</span><b>{{ e.name }} {{ e.lastName }}</b></td>
            <td><span class="rol" [class.admin]="e.role === 'admin'">@if (e.role === 'admin') { <i class="fa-solid fa-crown"></i> }{{ e.role }}</span></td>
            <td>{{ horasDe(e.id) }} h</td><td>{{ ultima(e.id) }}</td>
            <td>@if (e.email) { <i class="fa-regular fa-envelope" style="margin-right: 6px; color: var(--text-label)"></i>{{ e.email }} } @else { <span class="muted">—</span> }</td>
            <td class="right"><i class="fa-solid fa-ellipsis-vertical" style="margin: 0; color: var(--text-soft)"></i></td></tr>
        }
      </table>
      <div class="pager"><span>Mostrando {{ store.db().employees.length + 1 }} de {{ store.db().employees.length + 1 }}</span></div>
    } @else {
      <h1>Horas trabajadas</h1>
      <p class="sub">Controlá las horas que trabaja cada empleado.</p>
      <div class="toolbar"><input class="search" placeholder="Buscar..." [ngModel]="q()" (ngModelChange)="q.set($event)" /><span class="sp"></span>
        <button class="iconbtn" (click)="refrescar()" title="Actualizar"><i class="fa-solid fa-rotate-right"></i></button>
        <button class="cta" (click)="entrada()"><i class="fa-solid fa-plus"></i>Nueva entrada / salida</button></div>
      @if (turnos().length) {
        <table><tr><th>Fecha</th><th>Empleado</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Notas</th></tr>
          @for (s of turnos(); track s.id) { <tr><td><b>{{ s.date }}</b></td><td><span class="av" [style.background]="nombre(s.employeeId) | avcolor">{{ nombre(s.employeeId)[0] }}</span>{{ nombre(s.employeeId) }}</td><td>{{ s.from }}</td><td>{{ s.to }}</td><td><b>{{ dur(s.from, s.to) }} h</b></td><td>{{ s.notes }}</td></tr> }</table>
      } @else {
        <div class="empty-hero">
          <div class="hero-card">
            <svg viewBox="0 0 520 300" role="img" aria-label="Horarios">
              <path d="M70 150c-30-60 10-120 80-110s110-30 170 0 150 20 150 100-40 110-120 120-130 40-190 0S100 210 70 150z" fill="#17a9cf"/>
              <ellipse cx="60" cy="150" rx="34" ry="62" fill="#17a9cf" opacity=".9"/><ellipse cx="455" cy="230" rx="22" ry="34" fill="#17a9cf" opacity=".85"/>
              <text x="265" y="95" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="800" font-size="40" fill="#1b1b2f">HORARIOS</text>
              <circle cx="345" cy="175" r="70" fill="#f6efe6" stroke="#2b2b45" stroke-width="10"/>
              <g stroke="#2b2b45" stroke-width="5" stroke-linecap="round"><path d="M345 175V130M345 175l30 18"/></g>
              <g fill="#2b2b45"><circle cx="345" cy="115" r="3"/><circle cx="345" cy="235" r="3"/><circle cx="285" cy="175" r="3"/><circle cx="405" cy="175" r="3"/></g>
              <rect x="150" y="205" width="160" height="70" rx="10" fill="#fff"/><circle cx="210" cy="180" r="30" fill="#f2d3b3"/><path d="M180 178c0-30 60-30 60 0v25h-60z" fill="#2b2b45"/>
              <rect x="395" y="225" width="70" height="55" rx="6" fill="#fff" stroke="#2b2b45" stroke-width="4"/>
            </svg>
            <p><b>Llevá el registro de horas trabajadas</b><br /><small class="muted">De este modo podés usar nuestra liquidación de sueldos automática</small></p>
          </div>
          <button class="cta" (click)="entrada()"><i class="fa-solid fa-plus"></i>Nueva entrada / salida</button>
        </div>
      }
    }

    @if (form(); as f) {
      <app-modal title="Nuevo empleado" [width]="560" (closed)="form.set(null)">
        <div class="grid2"><div class="field"><label>Nombre</label><input [(ngModel)]="f['name']" /></div><div class="field"><label>Apellido</label><input [(ngModel)]="f['lastName']" /></div>
          <div class="field"><label>Email (opcional)</label><input [(ngModel)]="f['email']" /></div><div class="field"><label>Rol</label><select [(ngModel)]="f['role']"><option value="vendedor">Vendedor</option><option value="admin">Admin</option></select></div>
          <div class="field"><label>Fecha de ingreso</label><input type="date" [(ngModel)]="f['hired']" /></div></div>
        <div class="mf"><button (click)="form.set(null)">Cancelar</button><button class="cta" [disabled]="!f['name']?.trim()" (click)="guardar(f)">Guardar</button></div>
      </app-modal>
    }
    @if (turno(); as t) {
      <app-modal title="Nueva entrada / salida" [width]="480" (closed)="turno.set(null)">
        <div class="field"><label>Empleado</label><select [(ngModel)]="t['emp']"><option value="">—</option><option value="__yo">{{ store.db().user }}</option>@for (e of store.db().employees; track e.id) { <option [value]="e.id">{{ e.name }} {{ e.lastName }}</option> }</select></div>
        <div class="grid2" style="margin-top: 8px"><div class="field"><label>Fecha</label><input type="date" [(ngModel)]="t['date']" /></div><div></div>
          <div class="field"><label>Entrada</label><input type="time" [(ngModel)]="t['from']" /></div><div class="field"><label>Salida</label><input type="time" [(ngModel)]="t['to']" /></div></div>
        <div class="field" style="margin-top: 8px"><label>Notas</label><input [(ngModel)]="t['notes']" placeholder="Opcional" /></div>
        @if (t['from'] && t['to'] && t['to'] <= t['from']) { <span class="note bad">La salida debe ser posterior a la entrada.</span> }
        <div class="mf"><button (click)="turno.set(null)">Cancelar</button><button class="cta" [disabled]="!t['emp'] || !t['from'] || !t['to'] || t['to'] <= t['from']" (click)="guardarTurno(t)">Aceptar</button></div>
      </app-modal>
    }
  `,
})
export class EmpleadosComponent {
  readonly q = signal('');
  refrescar() { if (this.store.remote()) this.store.sync(); }
  coincide(...campos: string[]): boolean { const q = this.q().trim().toLowerCase(); return !q || campos.some((c) => c.toLowerCase().includes(q)); }
  filtrados() { return this.store.db().employees.filter((e) => this.coincide(e.name, e.lastName, e.role, e.email)); }
  periodo(): string { const h = new Date(), i = new Date(h.getFullYear(), h.getMonth(), 1); const f = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`; return `${f(i)} al ${f(h)}`; }
  /** Última actividad = el último fichaje registrado, en días. */
  ultima(id: string): string {
    const fechas = this.store.db().shifts.filter((s) => s.employeeId === id).map((s) => s.date).sort();
    if (!fechas.length) return '—';
    const dias = Math.floor((Date.now() - new Date(fechas[fechas.length - 1] + 'T12:00:00').getTime()) / 86400000);
    return dias <= 0 ? 'hoy' : dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
  }
  readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  readonly horas = this.route.snapshot.routeConfig?.path === 'horas';
  readonly form = signal<any>(null); readonly turno = signal<any>(null);
  readonly turnos = computed(() => [...this.store.db().shifts].reverse());
  nombre(id: string) { if (id === '__yo') return this.store.db().user; const e = this.store.db().employees.find((x) => x.id === id); return e ? `${e.name} ${e.lastName}` : '—'; }
  dur(a: string, b: string): number { const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number); return Math.round(((h2 * 60 + m2 - (h1 * 60 + m1)) / 60) * 100) / 100; }
  horasDe(id: string): number { return this.store.db().shifts.filter((s) => s.employeeId === id).reduce((t, s) => t + this.dur(s.from, s.to), 0); }
  totalHoras(): number { return this.store.db().shifts.reduce((t, s) => t + this.dur(s.from, s.to), 0); }
  nuevo() { this.form.set({ name: '', lastName: '', email: '', role: 'vendedor', hired: new Date().toISOString().slice(0, 10) }); }
  guardar(f: any) { this.store.addEmployee({ name: f.name.trim(), lastName: f.lastName, email: f.email, role: f.role, hired: f.hired }); this.form.set(null); }
  entrada() { this.turno.set({ emp: '', date: new Date().toISOString().slice(0, 10), from: '', to: '', notes: '' }); }
  guardarTurno(t: any) { this.store.addShift(t.emp, t.date, t.from, t.to, t.notes); this.turno.set(null); }
}
