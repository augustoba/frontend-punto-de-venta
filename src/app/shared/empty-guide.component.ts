import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Estado vacío que guía a la acción: ícono, título, explicación y un botón principal (a una ruta o con evento). */
@Component({
  selector: 'app-empty-guide',
  imports: [RouterLink],
  template: `
    <div class="eg">
      <span class="eg-ic"><i class="fa-solid fa-{{ icon() }}"></i></span>
      <b>{{ titulo() }}</b>
      <p>{{ texto() }}</p>
      @if (cta()) {
        @if (link()) { <a class="cta btn" [routerLink]="link()" style="text-decoration: none; display: inline-grid; place-items: center">{{ cta() }}<i class="fa-solid fa-arrow-right" style="margin: 0 0 0 8px"></i></a> }
        @else { <button class="cta" (click)="accion.emit()">{{ cta() }}<i class="fa-solid fa-arrow-right" style="margin: 0 0 0 8px"></i></button> }
      }
      @if (cta2()) { <button (click)="accion2.emit()" style="margin-left: 8px">{{ cta2() }}</button> }
    </div>
  `,
})
export class EmptyGuideComponent {
  readonly icon = input('box-open');
  readonly titulo = input('');
  readonly texto = input('');
  readonly cta = input('');
  readonly link = input('');
  readonly cta2 = input('');
  readonly accion = output<void>();
  readonly accion2 = output<void>();
}
