import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ModalComponent } from '../../shared/modal.component';
import { Store } from '../../core/store';
import { Settings } from '../../core/models';

type Tipo = 'switch' | 'numero' | 'texto' | 'select' | 'estado';
interface Opcion {
  k?: keyof Settings; icon: string; titulo: string; desc: string; tipo: Tipo; sufijo?: string;
  opciones?: [string, string][];
  /** Funciones que todavía no están construidas: se muestran, pero desactivadas y rotuladas. */
  pronto?: boolean;
  /** Para `estado`: texto de la insignia y, si hay, hacia dónde lleva. */
  estado?: string; enlace?: string;
}
interface Grupo { titulo: string; sub: string; items: Opcion[]; }
const TABS: { id: string; label: string; grupos: Grupo[] }[] = [
  { id: 'negocio', label: 'Mi negocio', grupos: [] },
  { id: 'caja', label: 'Ventas y caja', grupos: [
    { titulo: 'Caja', sub: 'Apertura, cierre y uso diario de la caja.', items: [
      { k: 'arqueo', icon: 'cash-register', titulo: 'Arqueo de caja', desc: 'Cada empleado abre y cierra su caja, y lo registrado se compara con lo contado.', tipo: 'switch' },
      { k: 'alertDiff', icon: 'bell', titulo: 'Alerta de diferencia', desc: 'Diferencias menores a este valor no se marcan como error.', tipo: 'numero', sufijo: '$' },
      { k: 'createProductFromCash', icon: 'plus', titulo: 'Crear productos desde la caja', desc: 'Si un producto no está cargado, se da de alta en plena venta.', tipo: 'switch' },
      { k: 'hideStockFilter', icon: 'filter', titulo: 'Ocultar el filtro de stock', desc: 'El buscador de caja arranca sin ese filtro.', tipo: 'switch' }] },
    { titulo: 'Ventas', sub: 'Valores con los que arranca cada venta.', items: [
      { k: 'cumulativeDiscounts', icon: 'tags', titulo: 'Descuentos acumulativos', desc: 'Los descuentos por producto se suman al de la venta.', tipo: 'switch' },
      { k: 'transferDiscount', icon: 'right-left', titulo: 'Descuento automático por transferencia', desc: 'Porcentaje que se aplica solo al cobrar por transferencia (0 = desactivado).', tipo: 'numero', sufijo: '%' },
      { k: 'cashShipping', icon: 'truck-fast', titulo: 'Envíos en la caja', desc: 'Cargá los datos de envío al crear la venta.', tipo: 'switch', pronto: true },
      { k: 'sellerCommission', icon: 'percent', titulo: 'Comisión del vendedor', desc: 'Porcentaje sobre el precio de venta. Se puede ajustar en cada venta.', tipo: 'numero', sufijo: '%' }] },
    { titulo: 'Comprobantes e impresión', sub: 'Qué pasa con el comprobante al cerrar una venta y en qué formato sale.', items: [
      { k: 'receiptAction', icon: 'receipt', titulo: 'Al cerrar una venta', desc: 'Qué se hace con el comprobante apenas se cobra.', tipo: 'select', opciones: [['nada', 'No hacer nada'], ['imprimir', 'Imprimir el comprobante'], ['preguntar', 'Preguntar cada vez']] },
      { k: 'receiptFormat', icon: 'print', titulo: 'Formato del comprobante', desc: 'El tamaño de papel con el que se imprime desde la caja.', tipo: 'select', opciones: [['ticket80', 'Ticket 80 mm'], ['ticket58', 'Ticket 58 mm'], ['a4', 'Hoja A4']] },
      { k: 'receiptQuality', icon: 'sliders', titulo: 'Calidad del ticket', desc: 'La baja engrosa el texto y se lee mejor.', tipo: 'select', opciones: [['normal', 'Normal'], ['baja', 'Baja (texto más grueso)']] },
      { k: 'exchangeTicket', icon: 'gift', titulo: 'Ticket de cambio', desc: 'Las ventas se pueden marcar como para regalo y salen con un cupón de cambio sin precios.', tipo: 'switch' }] }] },
  { id: 'productos', label: 'Productos y stock', grupos: [
    { titulo: 'Catálogo y precios', sub: 'Cómo se cargan tus productos y con qué valores arranca cada uno nuevo.', items: [
      { k: 'services', icon: 'briefcase', titulo: 'Servicios', desc: 'Suma la solapa Servicios al catálogo, además de los productos.', tipo: 'switch', pronto: true },
      { k: 'productImages', icon: 'image', titulo: 'Imágenes de productos', desc: 'Permite cargarle una foto a cada producto y mostrarla en la app.', tipo: 'switch' },
      { k: 'weightSales', icon: 'weight-scale', titulo: 'Venta por peso', desc: 'Vendé por kilo, no solo por unidad.', tipo: 'switch', pronto: true },
      { k: 'markup', icon: 'arrow-trend-up', titulo: 'Remarcación', desc: 'Se aplica sobre el costo para sugerir el precio.', tipo: 'numero', sufijo: '%' },
      { k: 'defaultIva', icon: 'percent', titulo: 'IVA', desc: 'La alícuota que se propone al cargar un producto; se cambia en cada uno.', tipo: 'numero', sufijo: '%' }] },
    { titulo: 'Stock', sub: 'Disponibilidad, depósitos y trazabilidad por lote.', items: [
      { k: 'hideOutOfStock', icon: 'eye-slash', titulo: 'Ocultar productos sin stock', desc: 'No aparecen en los listados, pero los ves al filtrar.', tipo: 'switch' },
      { icon: 'warehouse', titulo: 'Depósitos', desc: 'Stock por depósito dentro de cada sucursal.', tipo: 'estado', estado: 'Activo · administrar', enlace: '/transferencias' },
      { icon: 'barcode', titulo: 'Trazabilidad por lote', desc: 'Habilita lotes, producción y el reporte de recall.', tipo: 'estado', estado: 'No disponible' }] }] },
  { id: 'finanzas', label: 'Finanzas', grupos: [
    { titulo: 'Facturación', sub: 'Quién emite tus comprobantes fiscales.', items: [
      { icon: 'file-invoice', titulo: 'Emisores de factura', desc: 'Todavía no configuraste la facturación.', tipo: 'estado', estado: 'Configurar facturación' }] },
    { titulo: 'Bancos y monedas', sub: 'Conciliación de tus cuentas y precios en otras monedas.', items: [
      { k: 'bankReconciliation', icon: 'scale-balanced', titulo: 'Conciliación bancaria', desc: 'Compara tus movimientos contra los saldos del banco.', tipo: 'switch', pronto: true },
      { k: 'multiCurrency', icon: 'coins', titulo: 'Múltiples monedas', desc: 'Habilita listas de precios en otras monedas.', tipo: 'switch', pronto: true }] }] },
];

const COLORES = ['#cfd2dc', '#c5c9f0', '#d9c6ee', '#b9e3d4', '#eeb37a'];

/** Ajustes (réplica de Envi): Mi negocio, Ventas y caja, Productos y stock y Finanzas. Todo se guarda al instante. */
@Component({
  selector: 'app-ajustes',
  imports: [FormsModule, RouterLink, ModalComponent],
  template: `
    <h1>Ajustes</h1>
    <p class="sub">Configurá cómo funciona tu negocio dentro de la app.</p>
    <div class="tabs">@for (t of tabs; track t.id) { <span [class.on]="tab() === t.id" style="cursor: pointer" (click)="tab.set(t.id)">{{ t.label }}</span> }</div>

    @if (tab() === 'negocio') {
      <h3 style="margin-bottom: 0">Datos del negocio</h3><p class="sub" style="margin-top: 2px">Identidad y referencia horaria de toda la cuenta.</p>
      <div class="card set-row" style="margin-bottom: 20px">
        <span class="set-ic"><i class="fa-solid fa-link"></i></span>
        <div class="grow"><b>Tu link de acceso</b><br /><small class="muted">Con este link vos y tu equipo entran al sistema.</small></div>
        <span class="muted">{{ host }}</span>
        <button class="iconbtn plain" (click)="copiar()" [title]="copiado() ? 'Copiado' : 'Copiar link'"><i class="fa-solid" [class.fa-copy]="!copiado()" [class.fa-check]="copiado()"></i></button>
      </div>

      <h3 style="margin-bottom: 0">Tus sucursales</h3><p class="sub" style="margin-top: 2px">Identidad, contacto y ubicación de cada sucursal.</p>
      <div class="card sucursal">
        <label class="logo-pick" title="Subir logo">
          @if (val('logo')) { <img [src]="val('logo')" alt="Logo" /> } @else { <span class="tile" [style.background]="val('businessColor')">TU LOGO</span> }
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="subirLogo($event)" />
        </label>
        <div class="grow">
          <div class="row" style="gap: 8px">
            @if (editandoNombre()) {
              <input [ngModel]="val('businessName')" (ngModelChange)="set('businessName', $event)" (keyup.enter)="editandoNombre.set(false)" (blur)="editandoNombre.set(false)" style="height: 32px; max-width: 260px" />
            } @else {
              <b style="font-size: 16px">{{ val('businessName') || 'Mi negocio' }}</b>
            }
            <button class="iconbtn plain" (click)="editandoNombre.set(true)" title="Editar nombre"><i class="fa-solid fa-pen-to-square"></i></button>
          </div>
          <small class="muted" style="letter-spacing: .06em; font-weight: 800">COLOR DEL NEGOCIO</small>
          <div class="swatches">@for (c of colores; track c) { <button class="sw-dot" [style.background]="c" [class.sel]="val('businessColor') === c" (click)="set('businessColor', c)" [title]="c"></button> }</div>
          @if (logoError()) { <div style="color: #8a1c1c; margin-top: 6px">{{ logoError() }}</div> }
        </div>
        @if (val('logo')) { <button (click)="set('logo', '')">Quitar logo</button> }
        <button class="pillbtn blue" (click)="contactoOpen.set(true)"><i class="fa-solid fa-address-card"></i>Contacto y ubicación</button>
      </div>

      <h3>Datos</h3>
      <div class="card row" style="gap: 12px"><div class="grow"><b>Restablecer datos</b><br /><small class="muted">Borra los datos guardados en este navegador (el modo sin conexión). Los datos del servidor no se tocan.</small></div><button class="neg" (click)="reset()">Restablecer</button></div>
    } @else {
      @for (g of actual().grupos; track g.titulo) {
        <h3 style="margin-bottom: 0">{{ g.titulo }}</h3><p class="sub" style="margin-top: 2px">{{ g.sub }}</p>
        <div class="card" style="padding: 0; margin-bottom: 18px">
          @for (o of g.items; track o.titulo) {
            <div class="set-row" style="border-top: 1px solid var(--divider-row)">
              <span class="set-ic"><i class="fa-solid fa-{{ o.icon }}"></i></span>
              <div class="grow"><b>{{ o.titulo }}</b>@if (o.pronto) { <span class="badge b-gray" style="margin-left: 8px">Próximamente</span> }<br /><small class="muted">{{ o.desc }}</small></div>
              @switch (o.tipo) {
                @case ('switch') { <span class="sw" [class.on]="!o.pronto && val(o.k!)" [style.opacity]="o.pronto ? .45 : 1" [style.cursor]="o.pronto ? 'not-allowed' : 'pointer'" (click)="!o.pronto && set(o.k!, !val(o.k!))"></span> }
                @case ('numero') { <input type="number" style="width: 110px" [ngModel]="val(o.k!)" (ngModelChange)="set(o.k!, +$event || 0)" /><span class="muted">{{ o.sufijo }}</span> }
                @case ('texto') { <input style="width: 240px" [ngModel]="val(o.k!)" (ngModelChange)="set(o.k!, $event)" /> }
                @case ('select') { <select style="min-width: 190px" [ngModel]="val(o.k!)" (ngModelChange)="set(o.k!, $event)">@for (op of o.opciones!; track op[0]) { <option [value]="op[0]">{{ op[1] }}</option> }</select> }
                @case ('estado') {
                  @if (o.enlace) { <a class="pillbtn blue" [routerLink]="o.enlace" style="text-decoration: none">{{ o.estado }}</a> }
                  @else if (o.titulo === 'Emisores de factura') { <button class="pillbtn blue" (click)="factOpen.set(true)">{{ o.estado }}</button> }
                  @else { <span class="badge b-gray">{{ o.estado }}</span> }
                }
              }
            </div>
          }
        </div>
      }
    }

    @if (contactoOpen()) {
      <app-modal title="Contacto y ubicación" [width]="480" (closed)="contactoOpen.set(false)">
        <div class="field"><label>Dirección</label><input [ngModel]="val('address')" (ngModelChange)="set('address', $event)" /></div>
        <div class="field" style="margin-top: 8px"><label>Ciudad</label><input [ngModel]="val('city')" (ngModelChange)="set('city', $event)" /></div>
        <div class="grid2" style="margin-top: 8px"><div class="field"><label>Teléfono</label><input [ngModel]="val('phone')" (ngModelChange)="set('phone', $event)" /></div>
          <div class="field"><label>Email de contacto</label><input [ngModel]="val('contactEmail')" (ngModelChange)="set('contactEmail', $event)" /></div></div>
        <p class="sub">Se guardan al instante y salen en los comprobantes.</p>
        <div class="mf"><button class="cta" (click)="contactoOpen.set(false)">Listo</button></div>
      </app-modal>
    }
    @if (factOpen()) {
      <app-modal title="Facturación" [width]="460" (closed)="factOpen.set(false)">
        <p>La emisión fiscal real (ARCA) todavía no está integrada. Por ahora se emiten <b>facturas de prueba</b>, sin validez fiscal, desde Ventas o desde el cobro en la caja.</p>
        <div class="mf"><button class="cta" (click)="factOpen.set(false)">Entendido</button></div>
      </app-modal>
    }
  `,
})
export class AjustesComponent {
  readonly store = inject(Store);
  readonly tabs = TABS;
  readonly colores = COLORES;
  readonly host = typeof location !== 'undefined' ? location.host : '';
  readonly tab = signal('negocio');
  readonly editandoNombre = signal(false);
  readonly contactoOpen = signal(false);
  readonly factOpen = signal(false);
  readonly copiado = signal(false);
  readonly logoError = signal('');
  actual() { return TABS.find((t) => t.id === this.tab())!; }
  val(k: keyof Settings): any { return this.store.settings()[k]; }
  set(k: keyof Settings, v: any) { this.store.updateSettings({ [k]: v } as Partial<Settings>); }

  copiar() {
    navigator.clipboard?.writeText(location.origin).then(() => { this.copiado.set(true); setTimeout(() => this.copiado.set(false), 1800); }, () => undefined);
  }

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
  reset() { if (confirm('¿Borrar los datos de este navegador? No se puede deshacer.')) this.store.reset(); }
}
