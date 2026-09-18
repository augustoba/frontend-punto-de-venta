import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { Store } from '../../core/store';

/** Inicio de sesión. Si la API no responde ofrece seguir en modo local. */
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-wrap" style="min-height:100vh;display:grid;place-items:center;padding:20px">
      <form class="card" style="width:min(380px,100%);padding:28px;display:grid;gap:14px" (ngSubmit)="entrar()">
        <div style="text-align:center"><h1 style="margin:0">Punto de venta</h1><p class="sub" style="margin:6px 0 0">Iniciá sesión para continuar</p></div>
        <label>USUARIO<input name="u" [(ngModel)]="usuario" autocomplete="username" autofocus /></label>
        <label>CONTRASEÑA<input name="p" type="password" [(ngModel)]="clave" autocomplete="current-password" /></label>
        @if (error()) { <div style="color:#8a1c1c;background:#fde8e8;border-radius:10px;padding:8px 12px">{{ error() }}</div> }
        <button class="cta" type="submit" [disabled]="cargando() || !usuario || !clave">{{ cargando() ? 'Entrando…' : 'Entrar' }}</button>
        @if (api.online() === false) {
          <p class="sub" style="text-align:center;margin:0">No hay conexión con la API. <a href="#" (click)="$event.preventDefault(); local()">Seguir en modo local</a></p>
        }
      </form>
    </div>
  `,
})
export class LoginComponent {
  readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  usuario = '';
  clave = '';
  readonly error = signal('');
  readonly cargando = signal(false);

  constructor() { this.api.ping(); }

  async entrar() {
    this.error.set(''); this.cargando.set(true);
    try {
      await this.auth.login(this.usuario.trim(), this.clave);
      this.store.setUser(this.auth.session()!.username);
      await this.store.connect();
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error.set(e?.status === 0 ? 'No hay conexión con la API' : (e?.error?.error ?? 'No se pudo iniciar sesión'));
    } finally { this.cargando.set(false); }
  }

  local() { this.router.navigateByUrl('/'); }
}
