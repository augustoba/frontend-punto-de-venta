import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '../../core/store';
import { Settings } from '../../core/models';

interface Opcion { k: keyof Settings; icon: string; titulo: string; desc: string; tipo: 'switch' | 'numero' | 'texto'; sufijo?: string; }
const TABS: { id: string; label: string; grupos: { titulo: string; sub: string; items: Opcion[] }[] }[] = [
  { id: 'negocio', label: 'Mi negocio', grupos: [{ titulo: 'Datos del negocio', sub: 'Identidad de toda la cuenta.', items: [
    { k: 'businessName', icon: '🏪', titulo: 'Nombre del negocio', desc: 'Se muestra en el encabezado, los tickets y los comprobantes.', tipo: 'texto' }] }] },
  { id: 'caja', label: 'Ventas y caja', grupos: [
    { titulo: 'Caja', sub: 'Apertura, cierre y uso diario de la caja.', items: [
      { k: 'arqueo', icon: '▤', titulo: 'Arqueo de caja', desc: 'Cada empleado abre y cierra su caja, y lo registrado se compara con lo contado.', tipo: 'switch' },
      { k: 'alertDiff', icon: '🔔', titulo: 'Alerta de diferencia', desc: 'Diferencias menores a este valor no se marcan como error.', tipo: 'numero', sufijo: '$' },
      { k: 'createProductFromCash', icon: '＋', titulo: 'Crear productos desde la caja', desc: 'Si un producto no está cargado, se da de alta en plena venta.', tipo: 'switch' },
      { k: 'hideStockFilter', icon: '▼', titulo: 'Ocultar el filtro de stock', desc: 'El buscador de caja arranca sin ese filtro.', tipo: 'switch' }] },
    { titulo: 'Ventas', sub: 'Valores con los que arranca cada venta.', items: [
      { k: 'cumulativeDiscounts', icon: '🏷', titulo: 'Descuentos acumulativos', desc: 'Los descuentos por producto se suman al de la venta.', tipo: 'switch' },
      { k: 'transferDiscount', icon: '⇄', titulo: 'Descuento automático por transferencia', desc: 'Porcentaje que se aplica solo al cobrar por transferencia (0 = desactivado).', tipo: 'numero', sufijo: '%' },
      { k: 'sellerCommission', icon: '%', titulo: 'Comisión del vendedor', desc: 'Porcentaje sobre el precio de venta, informativo en los reportes.', tipo: 'numero', sufijo: '%' }] }] },
  { id: 'productos', label: 'Productos y stock', grupos: [
    { titulo: 'Catálogo y precios', sub: 'Con qué valores arranca cada producto nuevo.', items: [
      { k: 'markup', icon: '↗', titulo: 'Remarcación', desc: 'Se aplica sobre el costo para sugerir el precio.', tipo: 'numero', sufijo: '%' },
      { k: 'defaultIva', icon: '%', titulo: 'IVA', desc: 'La alícuota que se propone al cargar un producto.', tipo: 'numero', sufijo: '%' }] },
    { titulo: 'Stock', sub: 'Disponibilidad y trazabilidad.', items: [
      { k: 'hideOutOfStock', icon: '👁', titulo: 'Ocultar productos sin stock', desc: 'No aparecen en los listados, pero los ves al filtrar.', tipo: 'switch' }] }] },
];

/** Ajustes (réplica de Envi): negocio, ventas y caja, productos y stock. Todo se guarda al instante. */
@Component({
  selector: 'app-ajustes',
  imports: [FormsModule],
  template: `
    <h1>Ajustes</h1>
    <p class="sub">Configurá cómo funciona tu negocio dentro de la app.</p>
    <div class="tabs">@for (t of tabs; track t.id) { <span [class.on]="tab() === t.id" style="cursor: pointer" (click)="tab.set(t.id)">{{ t.label }}</span> }</div>
    @for (g of actual().grupos; track g.titulo) {
      <h3 style="margin-bottom: 0">{{ g.titulo }}</h3><p class="sub" style="margin-top: 2px">{{ g.sub }}</p>
      <div class="card" style="padding: 0; margin-bottom: 16px">
        @for (o of g.items; track o.k) {
          <div class="row" style="padding: 14px 16px; border-top: 1px solid var(--divider-row)">
            <span style="width: 32px; height: 32px; border-radius: 8px; background: var(--accent-blue-bg); display: grid; place-items: center">{{ o.icon }}</span>
            <div class="grow"><b>{{ o.titulo }}</b><br /><small class="muted">{{ o.desc }}</small></div>
            @switch (o.tipo) {
              @case ('switch') { <span class="sw" [class.on]="val(o.k)" (click)="set(o.k, !val(o.k))"></span> }
              @case ('numero') { <input type="number" style="width: 110px" [ngModel]="val(o.k)" (ngModelChange)="set(o.k, +$event || 0)" /><span class="muted">{{ o.sufijo }}</span> }
              @case ('texto') { <input style="width: 240px" [ngModel]="val(o.k)" (ngModelChange)="set(o.k, $event)" /> }
            }
          </div>
        }
      </div>
    }
    @if (tab() === 'negocio') {
      <h3 style="margin-bottom: 0">Logo</h3><p class="sub" style="margin-top: 2px">Aparece en el encabezado junto al nombre del negocio. PNG, JPG o WebP; se reduce solo a 256 px.</p>
      <div class="card row" style="gap: 16px; margin-bottom: 16px">
        @if (val('logo')) { <img class="biz-logo" [src]="val('logo')" alt="Logo" style="width: 72px; height: 72px" /> }
        @else { <div class="biz-logo empty" style="width: 72px; height: 72px">TU<br />LOGO</div> }
        <div class="grow">
          <b>Logo del negocio</b><br /><small class="muted">Elegí una imagen cuadrada o con fondo transparente para que se vea mejor.</small>
          @if (logoError()) { <div style="color: #8a1c1c; margin-top: 6px">{{ logoError() }}</div> }
        </div>
        <label class="cta" style="cursor: pointer; padding: 9px 16px; border-radius: 10px">Subir logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="subirLogo($event)" /></label>
        @if (val('logo')) { <button (click)="set('logo', '')">Quitar</button> }
      </div>
      <h3>Datos</h3>
      <div class="card row" style="gap: 12px"><div class="grow"><b>Restablecer datos</b><br /><small class="muted">Borra todo lo cargado en este navegador (productos, ventas, cuentas) y vuelve al estado inicial.</small></div><button class="neg" (click)="reset()">Restablecer</button></div>
    }
  `,
})
export class AjustesComponent {
  readonly store = inject(Store);
  readonly tabs = TABS;
  readonly tab = signal('negocio');
  actual() { return TABS.find((t) => t.id === this.tab())!; }
  val(k: keyof Settings): any { return this.store.settings()[k]; }
  set(k: keyof Settings, v: any) { this.store.updateSettings({ [k]: v } as Partial<Settings>); }
  readonly logoError = signal('');
  /** Lee la imagen, la reduce a 256 px (lado mayor) y la guarda como data URL en los ajustes. */
  subirLogo(ev: Event) {
    const input = ev.target as HTMLInputElement, file = input.files?.[0];
    input.value = '';
    this.logoError.set('');
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { this.logoError.set('El archivo debe ser una imagen PNG, JPG o WebP.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 256 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        this.set('logo', c.toDataURL('image/png'));
      };
      img.onerror = () => this.logoError.set('No se pudo leer la imagen.');
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }
  reset() { if (confirm('¿Borrar todos los datos de este navegador? No se puede deshacer.')) this.store.reset(); }
}
