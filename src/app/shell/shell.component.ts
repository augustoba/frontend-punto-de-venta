import { Component, inject } from '@angular/core';
import { Api } from '../core/api';
import { Store } from '../core/store';
import { Auth } from '../core/auth';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NAV } from '../nav';

/** Marco del panel: sidebar agrupado + topbar (réplica del layout de Envi). */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="animated-bg" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="app">
      <aside class="sidebar">
        <div class="brand"><span class="mark"><i class="fa-solid fa-cash-register"></i></span><span>Punto de venta</span></div>
        @for (g of nav; track g.title) {
          <h6>{{ g.title }}</h6>
          @for (i of g.items; track i.path) {
            <a [routerLink]="'/' + i.path" routerLinkActive="on"><i class="fa-solid fa-{{ i.icon }}"></i>{{ i.label }}</a>
          }
        }
      </aside>
      <div class="main">
        <div class="topbar">
          <div class="biz">
            @if (store.settings().logo) { <img class="biz-logo" [src]="store.settings().logo" alt="Logo" /> }
            @else { <a class="biz-logo empty" routerLink="/ajustes" title="Subí tu logo en Ajustes">TU<br />LOGO</a> }
            <b>{{ store.settings().businessName || 'Mi negocio' }}</b>
          </div>
          <div class="who">
            <span [title]="api.online() ? 'Conectado a la API' : 'Sin conexión con la API: se usan los datos locales'" style="font-size:12px;font-weight:700;color:var(--text-soft)">
              <i class="fa-solid fa-circle" [style.color]="api.online() ? '#2aa66a' : api.online() === false ? '#e08a1e' : '#aaa'" style="font-size:8px;margin-right:5px"></i>{{ api.online() ? 'API' : api.online() === false ? 'Local' : '…' }}
            </span>
            <i class="fa-regular fa-bell" style="color:var(--text-soft)"></i>
            <span>{{ auth.session()?.username ?? 'Usuario' }}</span>
            <span class="avatar"><i class="fa-solid fa-user"></i></span>
            @if (auth.session()) { <button (click)="auth.logout()" title="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i> Salir</button> }
          </div>
        </div>
        @if (store.error()) {
          <div class="alert" style="margin:10px 20px;padding:10px 14px;border-radius:10px;background:#fde8e8;color:#8a1c1c">
            {{ store.error() }} <button (click)="store.error.set('')" style="float:right;border:0;background:none;cursor:pointer">✕</button>
          </div>
        }
        <router-outlet />
      </div>
    </div>
  `,
})
export class ShellComponent {
  readonly nav = NAV;
  readonly api = inject(Api);
  readonly store = inject(Store);
  readonly auth = inject(Auth);
}
