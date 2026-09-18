import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, output, signal } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { beep } from '../core/scanner';
import { ModalComponent } from './modal.component';

/** Formatos de código de barras que se leen (los de productos de comercio) y modo exhaustivo. */
export function lectorHints(): Map<DecodeHintType, unknown> {
  return new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
}

/**
 * Lectura de códigos de barras con la cámara (celular, tablet o notebook). Queda abierta leyendo de corrido:
 * cada código se emite una vez (el mismo código repetido se ignora 2 s) y el padre responde con `mensaje`.
 * La cámara sólo funciona en HTTPS o en localhost.
 */
@Component({
  selector: 'app-camara-scanner',
  imports: [ModalComponent],
  template: `
    <app-modal title="Escanear con la cámara" [width]="480" (closed)="closed.emit()">
      <div style="position: relative; border-radius: 14px; overflow: hidden; background: #111; min-height: 220px">
        <video #video playsinline muted style="width: 100%; display: block; max-height: 60vh; object-fit: cover"></video>
        <div style="position: absolute; inset: 22% 10%; border: 2px solid rgba(255,255,255,.85); border-radius: 12px; box-shadow: 0 0 0 999px rgba(0,0,0,.28); pointer-events: none"></div>
      </div>
      @if (error()) {
        <p style="color: #8a1c1c; margin: 12px 0 0"><i class="fa-solid fa-triangle-exclamation"></i> {{ error() }}</p>
      } @else {
        <p class="sub" style="margin: 12px 0 0">{{ mensaje() || estado() }}</p>
      }
      <div class="mf"><button class="cta" (click)="closed.emit()">Listo</button></div>
    </app-modal>
  `,
})
export class CamaraScannerComponent implements AfterViewInit, OnDestroy {
  readonly codigo = output<string>();
  readonly closed = output<void>();
  /** Respuesta del padre al último código (p. ej. «✔ Alfajor agregado»). */
  readonly mensaje = input('');
  readonly estado = signal('Iniciando la cámara…');
  readonly error = signal('');
  @ViewChild('video', { static: true }) video!: ElementRef<HTMLVideoElement>;

  private controls?: IScannerControls;
  private destroyed = false;
  private lastCode = '';
  private lastAt = 0;

  async ngAfterViewInit() {
    if (!navigator.mediaDevices?.getUserMedia) { this.error.set('Este navegador no permite usar la cámara (hace falta HTTPS o localhost).'); return; }
    const reader = new BrowserMultiFormatReader(lectorHints(), { delayBetweenScanAttempts: 120 });
    try {
      const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, this.video.nativeElement, (result) => {
        if (!result) return;
        const code = result.getText(), now = Date.now();
        if (code === this.lastCode && now - this.lastAt < 2000) return;
        this.lastCode = code; this.lastAt = now;
        this.codigo.emit(code);
      });
      if (this.destroyed) controls.stop(); else { this.controls = controls; this.estado.set('Apuntá al código de barras: se lee solo.'); }
    } catch (e: any) {
      this.error.set(this.explicar(e));
    }
  }

  private explicar(e: any): string {
    switch (e?.name) {
      case 'NotAllowedError': case 'SecurityError': return 'No hay permiso para usar la cámara. Habilitala desde el candado de la barra de direcciones y volvé a abrir.';
      case 'NotFoundError': case 'OverconstrainedError': return 'No se encontró una cámara en este dispositivo.';
      case 'NotReadableError': return 'La cámara está siendo usada por otra aplicación.';
      default: return 'No se pudo iniciar la cámara.';
    }
  }

  ngOnDestroy() { this.destroyed = true; this.controls?.stop(); }
}

