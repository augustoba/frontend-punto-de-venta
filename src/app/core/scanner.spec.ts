import { ScanBuffer } from './scanner';

const tipear = (b: ScanBuffer, texto: string, gap: number, inicio = 1000): string | null => {
  let t = inicio, out: string | null = null;
  for (const c of texto) { out = b.push(c, t) ?? out; t += gap; }
  return out;
};

describe('lector de código de barras de mano', () => {
  it('una ráfaga rápida terminada en Enter devuelve el código', () => {
    const b = new ScanBuffer();
    expect(tipear(b, '7790895000997', 8)).toBeNull();
    expect(b.push('Enter', 1200)).toBe('7790895000997');
  });

  it('escribir a mano (lento) no se toma como lector', () => {
    const b = new ScanBuffer();
    tipear(b, '1234', 200);
    expect(b.push('Enter', 5000)).toBeNull();
  });

  it('una ráfaga corta (menos de 4 teclas) se ignora', () => {
    const b = new ScanBuffer();
    tipear(b, '12', 5);
    expect(b.push('Enter', 1100)).toBeNull();
  });

  it('el texto tipeado antes de la ráfaga no se mezcla con el código', () => {
    const b = new ScanBuffer();
    tipear(b, 'ab', 300, 0);                 // tipeo humano previo
    tipear(b, '5551234', 6, 5000);            // ráfaga del lector
    expect(b.push('Enter', 5100)).toBe('5551234');
  });

  it('Shift y otras teclas especiales no cortan la ráfaga y después queda limpio', () => {
    const b = new ScanBuffer();
    b.push('A', 0); b.push('Shift', 5); b.push('B', 10); b.push('C', 15); b.push('D', 20);
    expect(b.push('Enter', 25)).toBe('ABCD');
    expect(b.push('Enter', 30)).toBeNull();
  });
});
