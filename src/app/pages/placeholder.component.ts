import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ALL_ITEMS } from '../nav';

/** Pantalla pendiente: muestra título y subtítulo de Envi hasta que se construya (ver docs/ROADMAP.md). */
@Component({
  selector: 'app-placeholder',
  template: `
    <h1>{{ item?.label }}</h1>
    <p class="sub">{{ item?.subtitle }}</p>
    <div class="card muted">Pantalla en construcción — se replica de la referencia Envi.</div>
  `,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly item = ALL_ITEMS.find((i) => i.path === this.route.snapshot.routeConfig?.path);
}
