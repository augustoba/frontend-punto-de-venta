import { Injectable, computed, inject, signal } from '@angular/core';
import { Store } from './store';

export interface Tarea {
  id: string; esencial: boolean; icon: string; titulo: string; desc: string; cta: string; link: string;
  hecha: boolean; bloqueada: boolean;
}
const KEY_POS = 'pos-onb-pos-configurado';

/** Avance de la puesta en marcha del negocio: alimenta «Primeros pasos» y la píldora «Configuración %» del encabezado. */
@Injectable({ providedIn: 'root' })
export class Onboarding {
  private readonly store = inject(Store);
  private readonly posOk = signal(this.leer());

  private leer(): boolean { try { return localStorage.getItem(KEY_POS) === '1'; } catch { return false; } }
  /** Se marca al entrar a configurar el punto de venta (Ajustes › Ventas y caja). */
  marcarPosConfigurado() { this.posOk.set(true); try { localStorage.setItem(KEY_POS, '1'); } catch { /* sin storage */ } }

  readonly tareas = computed<Tarea[]>(() => {
    const d = this.store.db(), s = d.settings;
    const tieneProducto = d.products.some((p) => !p.archived);
    return [
      { id: 'producto', esencial: true, icon: 'box-open', titulo: 'Agregá tu primer producto', desc: 'Empezá con un nombre, precio y stock. Los demás detalles pueden esperar.', cta: 'Agregar producto', link: '/stock', hecha: tieneProducto, bloqueada: false },
      { id: 'pos', esencial: true, icon: 'cash-register', titulo: 'Configurá tu Punto de Venta', desc: 'Elegí qué herramientas querés ver y usar: arqueo de caja, comprobantes, descuentos.', cta: 'Configurar POS', link: '/ajustes', hecha: this.posOk(), bloqueada: false },
      { id: 'venta', esencial: false, icon: 'cart-shopping', titulo: 'Hacé tu primera venta', desc: tieneProducto ? 'Abrí la caja y cobrá tu primera venta.' : 'Primero agregá un producto.', cta: 'Ir a la caja', link: '/caja', hecha: d.sales.length > 0, bloqueada: !tieneProducto },
      { id: 'datos', esencial: false, icon: 'sliders', titulo: 'Completá los datos del negocio', desc: 'Dirección, teléfono y logo: salen en tus comprobantes.', cta: 'Completar datos', link: '/ajustes', hecha: !!(s.address && s.phone) || !!s.logo, bloqueada: false },
      { id: 'proveedor', esencial: false, icon: 'truck', titulo: 'Cargá tu primer proveedor', desc: 'Con proveedores podés registrar compras y reponer stock.', cta: 'Agregar proveedor', link: '/proveedores', hecha: d.suppliers.length > 0, bloqueada: false },
    ];
  });
  readonly esenciales = computed(() => this.tareas().filter((t) => t.esencial));
  readonly esencialesHechas = computed(() => this.esenciales().filter((t) => t.hecha).length);
  readonly hechas = computed(() => this.tareas().filter((t) => t.hecha).length);
  readonly porcentaje = computed(() => Math.round((this.hechas() / this.tareas().length) * 100));
}
