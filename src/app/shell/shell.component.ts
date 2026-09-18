import { Component, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { Store } from '../core/store';
import { Onboarding } from '../core/onboarding';
import { NAV, NavItem } from '../nav';

/** Un renglón del menú: un ítem suelto o un grupo desplegable (Historial, Empleados, Listas y catálogos). */
type Entry = { kind: 'item'; item: NavItem } | { kind: 'group'; group: string; icon: string; items: NavItem[] };
type GroupEntry = Extract<Entry, { kind: 'group' }>;
const GRUPO_ICONO: Record<string, string> = { Historial: 'clock-rotate-left', Empleados: 'users', 'Listas y catálogos': 'list-check' };

const KEY_COLAPSADO = 'pos-sidebar-colapsado';
function leerColapsado(): boolean { try { return localStorage.getItem(KEY_COLAPSADO) === '1'; } catch { return false; } }

/** Marco del panel: sidebar agrupado y colapsable + topbar + pie (réplica del layout de Envi). */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="animated-bg" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="app" [class.collapsed]="colapsado()">
      <aside class="sidebar">
        <button class="collapse-btn" (click)="alternarSidebar()" [title]="colapsado() ? 'Expandir menú' : 'Contraer menú'"><i class="fa-solid" [class.fa-chevron-left]="!colapsado()" [class.fa-chevron-right]="colapsado()"></i></button>
        <div class="brand"><span class="mark"><svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><path d="M11 13h14l-1.5 12h-11z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M15 13a3 3 0 0 1 6 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="9" r="3.2" fill="#eeb37a"/></svg></span><span class="t">Punto de venta</span></div>
        @for (s of secciones; track s.title) {
          <h6>{{ s.title }}</h6>
          @for (e of s.entries; track $index) {
            @if (e.kind === 'item') {
              <a [routerLink]="'/' + e.item.path" routerLinkActive="on" [title]="e.item.label"><i class="fa-solid fa-{{ e.item.icon }}"></i><span class="t">{{ e.item.label }}</span></a>
            } @else {
              <button class="grp" [class.on]="activo(e.items)" (click)="alternar(e.group)" [title]="e.group">
                <i class="fa-solid fa-{{ e.icon }}"></i><span class="t">{{ e.group }}</span><i class="fa-solid fa-chevron-down chev t" [class.up]="abierto(e)"></i>
              </button>
              @if (abierto(e)) {
                @for (i of e.items; track i.path) {
                  <a class="sub" [routerLink]="'/' + i.path" routerLinkActive="on" [title]="i.label"><i class="fa-solid fa-{{ i.icon }}"></i><span class="t">{{ i.label }}</span></a>
                }
              }
            }
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
          @if (ob.porcentaje() < 100) {
            <a class="cfg-pill" routerLink="/primeros-pasos" title="Terminá de configurar tu negocio"><i class="fa-solid fa-rocket"></i>Configuración {{ ob.porcentaje() }}%<span class="cfg-bar"><i [style.width.%]="ob.porcentaje()"></i></span><i class="fa-solid fa-arrow-right"></i></a>
          }
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
    <a class="ayuda-fab" routerLink="/primeros-pasos" title="Ayuda: primeros pasos" aria-label="Ayuda"><i class="fa-solid fa-life-ring"></i></a>
    <footer class="foot"><span>{{ anio }} © Todos los derechos reservados</span><span>·</span><span>{{ store.settings().businessName || 'Punto de venta' }}</span></footer>
  `,
})
export class ShellComponent {
  readonly api = inject(Api);
  readonly store = inject(Store);
  readonly auth = inject(Auth);
  readonly ob = inject(Onboarding);
  private readonly router = inject(Router);
  readonly anio = new Date().getFullYear();

  readonly colapsado = signal(leerColapsado());
  private readonly url = signal(this.router.url);
  private readonly manual = signal<Record<string, boolean>>({});

  /** El menú agrupado como en Envi: los ítems con `group` se juntan en un desplegable. */
  readonly secciones = NAV.map((g) => {
    const entries: Entry[] = [];
    for (const item of g.items) {
      if (!item.group) { entries.push({ kind: 'item', item }); continue; }
      const prev = entries.find((e): e is GroupEntry => e.kind === 'group' && e.group === item.group);
      if (prev) prev.items.push(item); else entries.push({ kind: 'group', group: item.group, icon: GRUPO_ICONO[item.group] ?? 'folder', items: [item] });
    }
    return { title: g.title, entries };
  });

  constructor() {
    effect(() => document.documentElement.style.setProperty('--biz', this.store.settings().businessColor || '#eeb37a'));
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => this.url.set(e.urlAfterRedirects));
  }

  /** Un grupo está abierto si el usuario lo abrió o si la pantalla actual es una de sus hijas. */
  activo(items: NavItem[]): boolean { return items.some((i) => this.url().startsWith('/' + i.path)); }
  abierto(e: { group: string; items: NavItem[] }): boolean { const m = this.manual()[e.group]; return m ?? this.activo(e.items); }
  alternar(g: string) {
    const e = this.secciones.flatMap((s) => s.entries).find((x): x is GroupEntry => x.kind === 'group' && x.group === g)!;
    this.manual.update((m) => ({ ...m, [g]: !this.abierto(e) }));
  }

  alternarSidebar() {
    this.colapsado.update((v) => !v);
    try { localStorage.setItem(KEY_COLAPSADO, this.colapsado() ? '1' : '0'); } catch { /* sin storage */ }
  }
}
