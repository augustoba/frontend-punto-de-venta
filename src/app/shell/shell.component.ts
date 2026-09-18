import { Component, inject } from '@angular/core';
import { Api } from '../core/api';
import { Store } from '../core/store';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NAV } from '../nav';

/** Marco del panel: sidebar agrupado + topbar (réplica del layout de Envi). */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app">
      <aside class="sidebar">
        <div class="logo">Punto de venta</div>
        @for (g of nav; track g.title) {
          <h6>{{ g.title }}</h6>
          @for (i of g.items; track i.path) {
            <a [routerLink]="'/' + i.path" routerLinkActive="on">{{ i.label }}</a>
          }
        }
      </aside>
      <div class="main">
        <div class="topbar">
          <b>Mi negocio</b>
          <span [title]="api.online() ? 'Conectado a la API' : 'Sin conexión con la API: se usan los datos locales'">
            {{ api.online() ? '🟢 API' : api.online() === false ? '🟠 Local' : '…' }} &nbsp; Usuario
          </span>
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
}
