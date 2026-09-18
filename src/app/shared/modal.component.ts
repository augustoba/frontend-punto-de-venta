import { Component, input, output } from '@angular/core';

/** Modal genérico (backdrop + tarjeta). El contenido y los botones van dentro con <ng-content>. */
@Component({
  selector: 'app-modal',
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="modal" [style.max-width.px]="width()" (click)="$event.stopPropagation()">
        <div class="mh"><h3>{{ title() }}</h3><button class="x" type="button" (click)="closed.emit()" aria-label="Cerrar">✕</button></div>
        <ng-content />
      </div>
    </div>
  `,
})
export class ModalComponent {
  readonly title = input('');
  readonly width = input(560);
  readonly closed = output<void>();
}
