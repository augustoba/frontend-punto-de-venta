import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Onboarding } from '../../core/onboarding';

/** Primeros pasos: asistente de puesta en marcha con avance (2 esenciales + 3 recomendados). */
@Component({
  selector: 'app-primeros-pasos',
  imports: [RouterLink],
  template: `
    <div class="pp">
      <small class="pp-label">PRIMEROS PASOS</small>
      <h1>¿Por dónde querés empezar?</h1>
      <p class="sub">Preparé lo esencial a tu ritmo. Siempre podés volver para continuar.</p>
      <div class="pp-prog"><span>{{ ob.esencialesHechas() }} de {{ ob.esenciales().length }} esenciales</span><div class="bar"><i [style.flex]="ob.esencialesHechas()" style="background: var(--success)"></i><i [style.flex]="ob.esenciales().length - ob.esencialesHechas()" style="background: transparent"></i></div></div>

      <div class="pp-grid2">
        @for (t of ob.esenciales(); track t.id) {
          <div class="card pp-big" [class.hecha]="t.hecha">
            <div><b>{{ t.titulo }}</b><p class="sub">{{ t.desc }}</p></div>
            <span class="pp-art"><i class="fa-solid fa-{{ t.icon }}"></i></span>
            @if (t.hecha) { <span class="pp-ok"><i class="fa-solid fa-circle-check"></i>Listo</span> }
            @else { <a class="cta btn" [routerLink]="t.link" (click)="alTocar(t.id)" style="text-decoration: none; display: inline-grid; place-items: center">{{ t.cta }}<i class="fa-solid fa-arrow-right" style="margin: 0 0 0 8px"></i></a> }
          </div>
        }
      </div>
      <div class="pp-grid3">
        @for (t of resto(); track t.id) {
          <a class="card pp-small" [class.hecha]="t.hecha" [class.bloq]="t.bloqueada" [routerLink]="t.bloqueada ? null : t.link">
            <span class="pp-ic"><i class="fa-solid" [class]="t.hecha ? 'fa-circle-check' : 'fa-' + t.icon"></i></span>
            <div class="grow"><b>{{ t.titulo }}</b><br /><small class="muted">{{ t.desc }}</small></div>
            <i class="fa-solid fa-arrow-right muted" style="margin: 0"></i>
          </a>
        }
      </div>
    </div>
  `,
})
export class PrimerosPasosComponent {
  readonly ob = inject(Onboarding);
  resto() { return this.ob.tareas().filter((t) => !t.esencial); }
  alTocar(id: string) { if (id === 'pos') this.ob.marcarPosConfigurado(); }
}
