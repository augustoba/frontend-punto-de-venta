import { BrowserMultiFormatReader } from '@zxing/browser';
import { lectorHints } from './camara-scanner.component';

// Codificación EAN-13 (para dibujar un código real y comprobar que el lector lo decodifica).
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function ean13(doce: string): string {
  const suma = [...doce].reduce((s, d, i) => s + +d * (i % 2 ? 3 : 1), 0);
  return doce + ((10 - (suma % 10)) % 10);
}

function dibujar(codigo: string): HTMLCanvasElement {
  const p = PARITY[+codigo[0]];
  let bits = '101';
  for (let i = 0; i < 6; i++) bits += (p[i] === 'L' ? L : G)[+codigo[i + 1]];
  bits += '01010';
  for (let i = 7; i < 13; i++) bits += R[+codigo[i]];
  bits += '101';
  const mod = 3, quiet = 30, c = document.createElement('canvas');
  c.width = bits.length * mod + quiet * 2; c.height = 140;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#000';
  [...bits].forEach((b, i) => { if (b === '1') x.fillRect(quiet + i * mod, 10, mod, 120); });
  return c;
}

describe('lectura de códigos de barras con la librería de la cámara', () => {
  it('decodifica un EAN-13 dibujado con la configuración de la caja', () => {
    const codigo = ean13('779089500099');
    const r = new BrowserMultiFormatReader(lectorHints()).decodeFromCanvas(dibujar(codigo));
    expect(r.getText()).toBe(codigo);
  });
});
