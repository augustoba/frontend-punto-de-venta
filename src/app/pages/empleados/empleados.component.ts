import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ModalComponent } from '../../shared/modal.component';
import { FdatePipe } from '../../shared/format';
import { Store } from '../../core/store';

/** Empleados y horas trabajadas (réplica de Envi). */
@Component({
  selector: 'app-empleados',
  imports: [FormsModule, ModalComponent, FdatePipe],
  template: `
    @if (!horas) {
      <h1>Empleados</h1>
      <p class="sub">Controlá el equipo de cada sucursal, sus permisos y las horas trabajadas en el período.</p>
      <div class="kpis k3"><div class="kpi"><small>Empleados</small><strong>{{ store.db().employees.length + 1 }}</strong></div><div class="kpi"><small>Horas trabajadas</small><strong>{{ totalHoras() }} h</strong></div></div>
      <div class="toolbar"><span class="sp"></span><button class="cta" (click)="nuevo()">+ Crear empleado</button></div>
      <table><tr><th>Fecha de ingreso</th><th>Empleado</th><th>Rol</th><th>Horas acumuladas</th><th>Email</th></tr>
        <tr><td>—</td><td><span class="av">{{ store.db().user[0] }}</span><b>{{ store.db().user }}</b></td><td><span class="badge b-blue">♛ admin</span></td><td>—</td><td>—</td></tr>
        @for (e of store.db().employees; track e.id) { <tr><td>{{ e.hired | fdate }}</td><td><span class="av">{{ e.name[0] }}</span><b>{{ e.name }} {{ e.lastName }}</b></td><td><span class="badge" [class]="'badge ' + (e.role === 'admin' ? 'b-blue' : 'b-gray')">{{ e.role }}</span></td><td>{{ horasDe(e.id) }} h</td><td>{{ e.email }}</td></tr> }</table>
    } @else {
      <h1>Horas trabajadas</h1>
      <p class="sub">Controlá las horas que trabaja cada empleado.</p>
      <div class="toolbar"><span class="sp"></span><button class="cta" (click)="entrada()">+ Nueva entrada / salida</button></div>
      <table><tr><th>Fecha</th><th>Empleado</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Notas</th></tr>
        @for (s of turnos(); track s.id) { <tr><td>{{ s.date }}</td><td>{{ nombre(s.employeeId) }}</td><td>{{ s.from }}</td><td>{{ s.to }}</td><td>{{ dur(s.from, s.to) }} h</td><td>{{ s.notes }}</td></tr> }
        @empty { <tr><td colspan="6" class="empty">Todavía no cargaste horarios.</td></tr> }</table>
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
