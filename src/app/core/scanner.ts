/**
 * Detector de lectores de código de barras de mano (USB / Bluetooth en modo teclado).
 * Un lector «escribe» el código como una ráfaga de teclas con muy poco tiempo entre una y otra y lo cierra con Enter;
 * una persona escribiendo es bastante más lenta. Si pasa más de `maxGapMs` entre teclas, la ráfaga se descarta.
 */
export class ScanBuffer {
  private buf = '';
  private last = 0;

  constructor(private readonly maxGapMs = 50, private readonly minLength = 4) {}

  /** Recibe una tecla con su instante en ms. Devuelve el código completo al llegar el Enter de una ráfaga válida, o null. */
  push(key: string, at: number): string | null {
    if (key === 'Enter') {
      const code = this.buf;
      this.buf = '';
      return code.length >= this.minLength ? code : null;
    }
    if (key.length !== 1) return null;            // Shift, Tab, flechas, etc. no cortan la ráfaga
    if (this.buf && at - this.last > this.maxGapMs) this.buf = '';
    this.buf += key;
    this.last = at;
    return null;
  }

  reset() { this.buf = ''; }
}

/** Pitido corto de confirmación (agudo = leído, grave = no encontrado). Silencioso si el navegador no deja audio. */
export function beep(ok: boolean): void {
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    const ctx = new Ctx(), osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = ok ? 1100 : 300;
    gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + (ok ? 0.09 : 0.25));
    osc.onended = () => ctx.close();
  } catch { /* sin audio */ }
}
