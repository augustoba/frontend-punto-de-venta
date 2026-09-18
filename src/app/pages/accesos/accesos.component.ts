import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';

interface UserRow { id: number; username: string; role: 'ADMIN' | 'VENDEDOR'; active: boolean; }

/** Accesos: cambiar la propia contraseña y, siendo admin, crear usuarios y activarlos/desactivarlos. */
@Component({
  selector: 'app-accesos',
  imports: [FormsModule],
  template: `
    <h1>Accesos</h1>
    <p class="sub">Tu contraseña y los usuarios que pueden iniciar sesión en el punto de venta.</p>

    <div class="card" style="padding:20px;margin-bottom:20px;max-width:460px;display:grid;gap:12px">
      <b>Cambiar mi contraseña</b>
      <label>CONTRASEÑA ACTUAL<input type="password" name="c" [(ngModel)]="actual" autocomplete="current-password" /></label>
      <label>NUEVA CONTRASEÑA (MÍNIMO 6)<input type="password" name="n" [(ngModel)]="nueva" autocomplete="new-password" /></label>
      <button class="cta" [disabled]="!actual || nueva.length < 6" (click)="cambiar()">Guardar contraseña</button>
      @if (mensaje()) { <span class="sub">{{ mensaje() }}</span> }
    </div>

    @if (auth.isAdmin()) {
      <div class="toolbar"><b>Usuarios</b><span class="sp"></span></div>
      <table>
        <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr>
        @for (u of usuarios(); track u.id) {
          <tr><td><b>{{ u.username }}</b></td><td>{{ u.role === 'ADMIN' ? 'Administrador' : 'Vendedor' }}</td>
            <td><span class="badge" [class.b-blue]="u.active">{{ u.active ? 'Activo' : 'Desactivado' }}</span></td>
            <td><button (click)="activar(u)">{{ u.active ? 'Desactivar' : 'Activar' }}</button></td></tr>
        }
      </table>
      <div class="card" style="padding:20px;margin-top:20px;max-width:460px;display:grid;gap:12px">
        <b>Crear usuario</b>
        <label>USUARIO<input name="nu" [(ngModel)]="nuevo.username" autocomplete="off" /></label>
        <label>CONTRASEÑA (MÍNIMO 6)<input type="password" name="np" [(ngModel)]="nuevo.password" autocomplete="new-password" /></label>
        <label>ROL<select name="nr" [(ngModel)]="nuevo.role"><option value="VENDEDOR">Vendedor</option><option value="ADMIN">Administrador</option></select></label>
        <button class="cta" [disabled]="!nuevo.username.trim() || nuevo.password.length < 6" (click)="crear()">Crear usuario</button>
      </div>
    }
    @if (error()) { <div style="margin-top:12px;color:#8a1c1c">{{ error() }}</div> }
  `,
})
export class AccesosComponent {
  private readonly api = inject(Api);
  readonly auth = inject(Auth);
  readonly usuarios = signal<UserRow[]>([]);
  readonly mensaje = signal('');
  readonly error = signal('');
  actual = '';
  nueva = '';
  nuevo = { username: '', password: '', role: 'VENDEDOR' as UserRow['role'] };

  constructor() { this.cargar(); }

  private msg(e: any): string { return e?.error?.error ?? 'No se pudo completar la operación'; }
  async cargar() { if (this.auth.isAdmin()) try { this.usuarios.set(await this.api.get<UserRow[]>('/api/users')); } catch (e) { this.error.set(this.msg(e)); } }

  async cambiar() {
    this.error.set(''); this.mensaje.set('');
    try { await this.api.put('/api/auth/password', { current: this.actual, next: this.nueva }); this.mensaje.set('Contraseña actualizada.'); this.actual = ''; this.nueva = ''; }
    catch (e) { this.error.set(this.msg(e)); }
  }

  async crear() {
    this.error.set('');
    try { await this.api.post('/api/users', this.nuevo); this.nuevo = { username: '', password: '', role: 'VENDEDOR' }; await this.cargar(); }
    catch (e) { this.error.set(this.msg(e)); }
  }

  async activar(u: UserRow) {
    this.error.set('');
    try { await this.api.put(`/api/users/${u.id}/active`, { active: !u.active }); await this.cargar(); }
    catch (e) { this.error.set(this.msg(e)); }
  }
}
