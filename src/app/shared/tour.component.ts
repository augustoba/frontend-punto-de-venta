import { AfterViewInit, Component, HostListener, input, output, signal } from '@angular/core';

export interface TourStep { titulo: string; texto: string; /** Selector CSS del elemento a resaltar; sin él, el paso va centrado. */ selector?: string; }

/** Recorrido guiado: oscurece la pantalla, resalta un elemento por paso y muestra un globo con Atrás / Siguiente / Entendido. */
@Component({
  selector: 'app-tour',
  template: `
    <div class="tour-back" [class.sin-foco]="!rect()" (click)="cerrar()"></div>
    @if (rect(); as r) { <div class="tour-ring" [style.top.px]="r.top - 6" [style.left.px]="r.left - 6" [style.width.px]="r.width + 12" [style.height.px]="r.height + 12"></div> }
    <div class="tour-pop" [style.top.px]="pos().top" [style.left.px]="pos().left" role="dialog" aria-live="polite">
      <button class="x" (click)="cerrar()" aria-label="Cerrar">×</button>
      <b>{{ paso().titulo }}</b>
      <p>{{ paso().texto }}</p>
      <div class="tour-foot"><small>{{ idx() + 1 }} de {{ steps().length }}</small>
        <span>@if (idx() > 0) { <button (click)="atras()">Atrás</button> }
          <button class="cta" (click)="siguiente()">{{ idx() === steps().length - 1 ? 'Entendido' : 'Siguiente' }}</button></span></div>
    </div>
  `,
})
export class TourComponent implements AfterViewInit {
  readonly steps = input.required<TourStep[]>();
  readonly closed = output<void>();
  readonly idx = signal(0);
  readonly rect = signal<DOMRect | null>(null);
  readonly pos = signal({ top: 120, left: 120 });

  paso() { return this.steps()[this.idx()]; }
  ngAfterViewInit() { this.ubicar(); }
  @HostListener('window:resize') ubicar() {
    setTimeout(() => {
      const sel = this.paso().selector, el = sel ? document.querySelector(sel) as HTMLElement | null : null;
      const W = 320, H = 190, vw = window.innerWidth, vh = window.innerHeight;
      if (!el) { this.rect.set(null); this.pos.set({ top: Math.max(20, vh / 2 - H / 2), left: Math.max(20, vw / 2 - W / 2) }); return; }
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect(); this.rect.set(r);
      const debajo = r.bottom + 16 + H < vh;
      const top = debajo ? r.bottom + 16 : Math.max(16, r.top - H - 16);
      this.pos.set({ top, left: Math.min(Math.max(16, r.left), vw - W - 16) });
    }, 30);
  }
  siguiente() { if (this.idx() >= this.steps().length - 1) { this.cerrar(); return; } this.idx.update((i) => i + 1); this.ubicar(); }
  atras() { this.idx.update((i) => Math.max(0, i - 1)); this.ubicar(); }
  cerrar() { this.closed.emit(); }
  @HostListener('window:keydown.escape') esc() { this.cerrar(); }
}
