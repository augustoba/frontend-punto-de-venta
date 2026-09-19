import { ALL_ITEMS } from '../nav';
import { GUIAS, guiaVista, marcarGuiaVista, reiniciarGuias } from './guias';

describe('guías de primera visita', () => {
  beforeEach(() => localStorage.clear());

  it('cada guía corresponde a una pantalla real del menú y tiene pasos completos', () => {
    const rutas = ALL_ITEMS.map((i) => i.path);
    for (const [k, pasos] of Object.entries(GUIAS)) {
      expect(rutas).toContain(k);
      expect(pasos.length).toBeGreaterThan(0);
      pasos.forEach((p) => { expect(p.titulo.length).toBeGreaterThan(2); expect(p.texto.length).toBeGreaterThan(10); });
    }
  });

  it('las pantallas principales del menú tienen guía', () => {
    ['dashboard', 'ventas', 'stock', 'compras', 'cuentas', 'clientes', 'proveedores', 'ajustes'].forEach((k) => expect(GUIAS[k]).toBeDefined());
  });

  it('se muestra una sola vez y se puede reiniciar', () => {
    expect(guiaVista('ventas')).toBeFalse();
    marcarGuiaVista('ventas');
    expect(guiaVista('ventas')).toBeTrue();
    expect(guiaVista('stock')).toBeFalse();
    reiniciarGuias();
    expect(guiaVista('ventas')).toBeFalse();
  });
});
