import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../shared/modal.component';
import { FdatePipe, FtimePipe, MoneyPipe } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { Purchase, PurchaseLine } from '../../core/models';

/** Compras y pedidos (réplica de Envi): asistente de 3 pasos, Borrador → Pedido → Recibido. Ver ANALISIS_facturas_compras.md */
@Component({
  selector: 'app-compras',
  imports: [FormsModule, ModalComponent, MoneyPipe, FdatePipe, FtimePipe],
  template: `
    @if (vista() === 'lista') {
      <h1>Compras y pedidos</h1>
      <p class="sub">Registrá las compras a proveedores y seguí sus pedidos.</p>
      <small class="muted">COMPRAS DE ESTE MES</small>
      <div class="kpis k3" style="margin-top: 6px">
        <div class="kpi"><small>Pedidos abiertos</small><strong>{{ abiertos() }}</strong><br /><span class="muted">Este mes</span></div>
        <div class="kpi"><small>Monto comprado</small><strong>{{ montoMes() | money }}</strong><br /><span class="muted">Este mes</span></div>
        <div class="kpi"><small>Estado de la cartera · {{ store.db().purchases.length }} pedidos</small>
          <div class="bar"><i [style.flex]="n('recibido')" style="background: var(--success)"></i><i [style.flex]="n('pedido')" style="background: var(--accent-blue)"></i><i [style.flex]="n('borrador')" style="background: #bbb"></i></div>
          <span class="muted">Recibido {{ n('recibido') }} · Pedido {{ n('pedido') }} · Borrador {{ n('borrador') }}</span></div>
      </div>
      <div class="toolbar"><span class="sp"></span><button class="cta" (click)="nuevo()">Crear pedido</button></div>
      <table>
        <tr><th>Fecha</th><th>Pedido</th><th>Proveedor</th><th>Creado por</th><th class="right">Total</th><th>Estado</th></tr>
        @for (p of lista(); track p.id) {
          <tr style="cursor: pointer" (click)="abrir(p.id)"><td>{{ p.createdAt | fdate }} {{ p.createdAt | ftime }}</td><td><b>P-{{ p.number }}</b></td>
            <td><span class="av">{{ (store.supplier(p.supplierId)?.name ?? '?')[0] }}</span>{{ store.supplier(p.supplierId)?.name }}</td><td>{{ p.user }}</td><td class="right">{{ p.total | money }}</td>
            <td><span class="badge" [class]="'badge ' + clase(p.status)">{{ etiqueta(p.status) }}</span></td></tr>
        } @empty { <tr><td colspan="6" class="empty">Todavía no hay pedidos. Creá el primero con «Crear pedido».</td></tr> }
      </table>
    }

    @if (vista() === 'nuevo') {
      <div class="row" style="margin-bottom: 8px"><button (click)="vista.set('lista')">‹ Volver al listado</button></div>
      <h1>Crear pedido a proveedor</h1>
      <p class="sub">Cargá los productos, revisá los costos y descargá el pedido para enviárselo al proveedor. El stock se toca recién en la recepción.</p>
      <div class="card row" style="margin-bottom: 12px; gap: 24px">
        <span class="badge" [class]="'badge ' + (paso() === 1 ? 'b-blue' : 'b-gray')">① Proveedor</span><span class="badge" [class]="'badge ' + (paso() === 2 ? 'b-blue' : 'b-gray')">② Productos</span><span class="badge" [class]="'badge ' + (paso() === 3 ? 'b-blue' : 'b-gray')">③ Resumen y descarga</span>
        <span class="grow"></span><span class="muted">{{ lineas.length }} líneas · {{ totalLineas() | money }}</span></div>

      @if (paso() === 1) {
        <div class="grid2">
          <div class="card"><small class="muted">ELEGÍ EL PROVEEDOR</small>
            <input placeholder="🔍 Buscar proveedor por nombre, contacto o CUIT" style="width: 100%; margin: 8px 0" [ngModel]="qProv()" (ngModelChange)="qProv.set($event)" />
            @for (s of proveedores(); track s.id) {
              <div class="card" style="margin-bottom: 6px; cursor: pointer" [style.border-color]="s.id === provId ? 'var(--accent-blue)' : ''" (click)="provId = s.id">
                <span class="av">{{ s.name[0] }}</span><b>{{ s.name }}</b> @if (s.id === provId) { <span class="badge sel" style="float: right">Elegido</span> }<br /><small class="muted">{{ s.contact }} {{ s.phone }}</small></div>
            } @empty { <p class="muted">No hay proveedores.</p> }
            <div class="card" style="border-style: dashed; text-align: center; cursor: pointer" (click)="provNuevo = !provNuevo">+ Crear proveedor</div>
            @if (provNuevo) { <div class="row" style="margin-top: 8px"><input class="grow" placeholder="Razón social" [(ngModel)]="provNombre" /><button class="cta" [disabled]="!provNombre.trim()" (click)="provId = store.saveSupplier({ name: provNombre.trim() }); provNombre = ''; provNuevo = false">Crear</button></div> }</div>
          <div class="card"><small class="muted">DATOS QUE VAN AL PDF</small>
            @if (store.supplier(provId); as s) { <div class="grid2" style="margin-top: 8px"><div><small class="muted">RAZÓN SOCIAL</small><br /><b>{{ s.name }}</b></div><div><small class="muted">CUIT</small><br /><b>{{ s.cuit || '—' }}</b></div><div><small class="muted">CONTACTO</small><br /><b>{{ s.contact || '—' }}</b></div><div><small class="muted">TELÉFONO</small><br /><b>{{ s.phone || '—' }}</b></div><div><small class="muted">EMAIL</small><br /><b>{{ s.email || '—' }}</b></div><div><small class="muted">DIRECCIÓN</small><br /><b>{{ s.address || '—' }}</b></div></div> }
            @else { <p class="muted">Elegí un proveedor.</p> }</div>
        </div>
        <p class="right"><button class="cta" [disabled]="!provId" (click)="paso.set(2)">Continuar a productos</button></p>
      }

      @if (paso() === 2) {
        <div class="card"><small class="muted">BUSCAR EN EL CATÁLOGO</small> <button style="float: right" (click)="prodNuevo = !prodNuevo">+ Agregar producto nuevo</button>
          <input placeholder="🔍 Nombre o código del producto" style="width: 100%; margin: 8px 0" [ngModel]="qProd()" (ngModelChange)="qProd.set($event)" />
          @if (prodNuevo) { <div class="row" style="margin-bottom: 8px"><input class="grow" placeholder="Nombre" [(ngModel)]="pn.name" /><input type="number" style="width: 110px" placeholder="Costo" [(ngModel)]="pn.cost" /><input type="number" style="width: 110px" placeholder="Precio" [(ngModel)]="pn.price" /><button class="cta" [disabled]="!pn.name.trim()" (click)="crearProd()">Crear</button></div> }
          <table style="background: none"><tr><th>Producto</th><th>Código</th><th class="right">Último costo</th><th></th></tr>
            @for (p of catalogo(); track p.id) { <tr><td><b>{{ p.name }}</b></td><td>{{ p.barcode }}</td><td class="right">{{ p.cost | money }}</td><td class="right">
              @if (enPedido(p.id)) { <span class="badge b-green">Agregado</span> } @else { <button style="height: 28px" (click)="agregar(p.id)">Agregar</button> }</td></tr> }
            @empty { <tr><td colspan="4" class="empty">Este proveedor todavía no tiene productos cargados. Buscá uno o creá uno nuevo.</td></tr> }</table>
          @if (lineas.length) {
            <table style="background: none"><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario</th><th>Variación</th><th class="right">Subtotal</th><th></th></tr>
              @for (l of lineas; track l.productId; let i = $index) { <tr><td><b>{{ l.name }}</b></td>
                <td><button style="height: 28px" (click)="l.qty = max(1, l.qty - 1)">−</button> {{ l.qty }} <button class="cta" style="height: 28px; border-radius: 99px" (click)="l.qty = l.qty + 1">+</button></td>
                <td><input type="number" style="width: 100px" [(ngModel)]="l.cost" /></td>
                <td><span class="badge b-gray">{{ variacion(l) }}</span></td><td class="right">{{ l.qty * l.cost | money }}</td><td><span class="link neg" (click)="lineas.splice(i, 1)">✕</span></td></tr> }</table>
            @if (hayVariacion()) { <span class="note info">Hay producto(s) con variación de costo. Se guarda en el pedido; el catálogo se actualiza en la recepción.</span> }
          }</div>
        <p class="right"><button (click)="paso.set(1)">Atrás</button> <button class="cta" [disabled]="!lineas.length" (click)="paso.set(3)">Revisar resumen</button></p>
      }

      @if (paso() === 3) {
        <div class="grid2">
          <div class="card"><table style="background: none"><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario</th><th class="right">Subtotal</th></tr>
            @for (l of lineas; track l.productId) { <tr><td>{{ l.name }}</td><td>{{ l.qty }}</td><td>{{ l.cost | money }}</td><td class="right"><b>{{ l.qty * l.cost | money }}</b></td></tr> }</table></div>
          <div class="card"><small class="muted">RESUMEN DEL PEDIDO</small><br /><b>{{ store.supplier(provId)?.name }}</b>
            <table style="background: none"><tr><td>Líneas</td><td class="right">{{ lineas.length }}</td></tr><tr><td>Unidades</td><td class="right">{{ unidades() }}</td></tr><tr><td><b>Total</b></td><td class="right"><b>{{ totalLineas() | money }}</b></td></tr></table>
            <span class="note warn">El costo del catálogo se actualiza recién al registrar la recepción. Este pedido es una intención de compra.</span>
            <div class="field"><label>Nombre del pedido (opcional)</label><input style="width: 100%" [(ngModel)]="nombrePedido" /></div>
            <small class="muted">COMPARTIR EL PEDIDO</small>
            <button class="cta" style="width: 100%; margin: 6px 0" (click)="imprimir()">⭳ Descargar PDF</button>
            <button style="width: 100%; margin-bottom: 6px" (click)="csv()">▦ Descargar excel</button>
            <button style="width: 100%; margin-bottom: 6px" (click)="copiar()">⧉ {{ copiado() ? 'Copiado' : 'Copiar texto' }}</button>
            <span class="link" (click)="guardarBorrador()">→ Continuar sin exportar</span></div>
        </div>
        <p class="right"><button (click)="paso.set(2)">Atrás</button></p>
      }
    }

    @if (vista() === 'detalle' && actual(); as p) {
      <div class="row" style="margin-bottom: 8px"><button (click)="vista.set('lista')">‹ Volver al listado</button><span class="grow"></span>
        @if (p.status === 'borrador') { <button (click)="editar(p)">Seguir editando</button><button class="cta" (click)="store.markOrdered(p.id)">Confirmar que lo envié</button> }
        @if (p.status === 'pedido') { <button class="cta" (click)="recibirOpen.set({ paid: false, cuenta: store.accounts()[0]?.id })">🚚 Registrar recepción</button> }
        @if (p.status !== 'recibido') { <button class="neg" (click)="store.deletePurchase(p.id); vista.set('lista')">Eliminar</button> }</div>
      <div class="row"><span class="av" style="width: 40px; height: 40px">{{ (store.supplier(p.supplierId)?.name ?? '?')[0] }}</span><div class="grow"><h1 style="font-size: 24px">P-{{ p.number }}</h1><small class="muted">{{ store.supplier(p.supplierId)?.name }} · {{ p.lines.length }} productos · creado por {{ p.user }} el {{ p.createdAt | fdate }}</small></div><span class="badge" [class]="'badge ' + clase(p.status)">{{ etiqueta(p.status) }}</span></div>
      @if (p.status === 'borrador') { <span class="note info">Quedó en borrador. Podés exportarlo cuando quieras, o confirmar el envío si ya se lo pasaste al proveedor.</span> }
      @if (p.status === 'pedido') { <span class="note info">Quedó registrado en estado Pedido. Cuando llegue la mercadería, registrá la recepción.</span> }
      <div class="kpis" style="grid-template-columns: repeat(4, 1fr); margin-top: 12px"><div class="kpi"><small>Total del pedido</small><strong>{{ p.total | money }}</strong></div><div class="kpi"><small>Productos</small><strong>{{ p.lines.length }}</strong></div>
        <div class="kpi"><small>Unidades pedidas</small><strong>{{ uni(p) }}</strong></div><div class="kpi"><small>Recibido</small><strong [class]="p.status === 'recibido' ? 'pos' : ''">{{ p.status === 'recibido' ? '100%' : '0%' }}</strong></div></div>
      <div class="card" style="margin-bottom: 12px"><b>Desglose del pedido</b><table style="background: none"><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario</th><th>Recibido</th><th class="right">Subtotal</th></tr>
        @for (l of p.lines; track l.productId) { <tr><td>{{ l.name }}</td><td>{{ l.qty }}</td><td>{{ l.cost | money }}</td><td><span class="badge" [class]="'badge ' + (l.received >= l.qty ? 'b-green' : 'b-gray')">{{ l.received >= l.qty ? l.received + '/' + l.qty + ' completo' : 'Pendiente' }}</span></td><td class="right">{{ l.qty * l.cost | money }}</td></tr> }</table></div>
    }

    @if (recibirOpen(); as r) {
      <app-modal title="Confirmar recepción" [width]="480" (closed)="recibirOpen.set(null)">
        <label class="card row" style="display: flex"><input type="checkbox" style="height: auto" [(ngModel)]="r.paid" /><span><b>El pedido está pago</b><br /><small class="muted">Si no, queda como deuda con el proveedor</small></span></label>
        @if (r.paid) { <div class="field" style="margin-top: 8px"><label>Pagado desde la cuenta</label><select [(ngModel)]="r.cuenta">@for (a of store.accounts(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }</select></div> }
        <span class="note ok">↗ Se actualizará el stock con las cantidades recibidas.</span>
        @if (!r.paid) { <span class="note warn">▲ Se añadirá una deuda de {{ actual()?.total | money }} a la cuenta corriente del proveedor.</span> }
        <div class="mf"><button (click)="recibirOpen.set(null)">Cancelar</button><button class="cta" (click)="recibir(r)">Confirmar recepción</button></div>
      </app-modal>
    }
  `,
})
export class ComprasComponent {
  readonly store = inject(Store);
  readonly vista = signal<'lista' | 'nuevo' | 'detalle'>('lista');
  readonly paso = signal(1);
  readonly sel = signal('');
  readonly recibirOpen = signal<any>(null);
  readonly qProv = signal(''); readonly qProd = signal(''); readonly copiado = signal(false);
  provId = ''; provNuevo = false; provNombre = ''; prodNuevo = false; nombrePedido = ''; editId: string | null = null;
  pn = { name: '', cost: 0, price: 0 };
  lineas: PurchaseLine[] = [];
  max = Math.max;

  readonly lista = computed(() => [...this.store.db().purchases].reverse());
  readonly actual = computed<Purchase | undefined>(() => this.store.db().purchases.find((p) => p.id === this.sel()));
  private mes(iso: string) { const d = new Date(iso), n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }
  abiertos() { return this.store.db().purchases.filter((p) => p.status !== 'recibido').length; }
  montoMes() { return r2(this.store.db().purchases.filter((p) => this.mes(p.createdAt)).reduce((s, p) => s + p.total, 0)); }
  n(s: string) { return this.store.db().purchases.filter((p) => p.status === s).length; }
  clase(s: string) { return s === 'recibido' ? 'b-green' : s === 'pedido' ? 'b-blue' : 'b-gray'; }
  etiqueta(s: string) { return s === 'recibido' ? 'Recibido' : s === 'pedido' ? 'Pedido' : 'Borrador'; }
  uni(p: Purchase) { return p.lines.reduce((s, l) => s + l.qty, 0); }
  abrir(id: string) { this.sel.set(id); this.vista.set('detalle'); }

  nuevo() { this.provId = ''; this.lineas = []; this.nombrePedido = ''; this.editId = null; this.paso.set(1); this.vista.set('nuevo'); }
  editar(p: Purchase) { this.editId = p.id; this.provId = p.supplierId; this.lineas = p.lines.map((l) => ({ ...l })); this.nombrePedido = p.name; this.paso.set(2); this.vista.set('nuevo'); }
  readonly proveedores = computed(() => { const q = this.qProv().trim().toLowerCase(); return this.store.suppliers().filter((s) => !q || (s.name + s.contact + s.cuit).toLowerCase().includes(q)); });
  catalogo() {
    const q = this.qProd().trim().toLowerCase();
    return this.store.db().products.filter((p) => !p.archived && !p.combo.length && (q ? (p.name + p.barcode).toLowerCase().includes(q) : p.supplierId === this.provId));
  }
  enPedido(id: string) { return this.lineas.some((l) => l.productId === id); }
  agregar(id: string) { const p = this.store.product(id)!; this.lineas.push({ productId: id, name: p.name, qty: 1, cost: p.cost, prevCost: p.cost, received: 0 }); }
  crearProd() { const id = this.store.saveProduct({ name: this.pn.name.trim(), cost: +this.pn.cost || 0, price: +this.pn.price || 0, supplierId: this.provId }, 0); this.agregar(id); this.pn = { name: '', cost: 0, price: 0 }; this.prodNuevo = false; }
  variacion(l: PurchaseLine) { if (!l.prevCost || l.cost === l.prevCost) return 'Sin cambios · ' + this.fmt(l.prevCost); const p = ((l.cost - l.prevCost) / l.prevCost) * 100; return `${this.fmt(l.prevCost)} → ${this.fmt(l.cost)} ${p > 0 ? '+' : ''}${p.toFixed(2)}%`; }
  private fmt(n: number) { return '$ ' + n.toLocaleString('es-AR'); }
  hayVariacion() { return this.lineas.some((l) => l.prevCost && l.cost !== l.prevCost); }
  totalLineas() { return r2(this.lineas.reduce((s, l) => s + l.qty * l.cost, 0)); }
  unidades() { return this.lineas.reduce((s, l) => s + l.qty, 0); }

  guardarBorrador() { const id = this.store.savePurchase(this.editId, this.provId, this.lineas.map((l) => ({ ...l })), this.nombrePedido); this.abrir(id); }
  texto(): string {
    return `Pedido a ${this.store.supplier(this.provId)?.name}\n` + this.lineas.map((l) => `${l.qty} x ${l.name} — $${l.cost} c/u`).join('\n') + `\nTotal: $${this.totalLineas()}`;
  }
  copiar() { navigator.clipboard?.writeText(this.texto()).then(() => { this.copiado.set(true); setTimeout(() => this.copiado.set(false), 1500); }); }
  csv() {
    const filas = [['Producto', 'Cantidad', 'Costo unitario', 'Subtotal'], ...this.lineas.map((l) => [l.name, l.qty, l.cost, l.qty * l.cost])];
    const url = URL.createObjectURL(new Blob([filas.map((r) => r.join(';')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'pedido.csv'; a.click(); URL.revokeObjectURL(url);
  }
  imprimir() { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<pre style="font-family:sans-serif">${this.texto()}</pre>`); w.document.close(); w.print(); }
  recibir(r: any) { const p = this.actual()!; this.store.receivePurchase(p.id, r.paid, r.paid ? r.cuenta : null); this.recibirOpen.set(null); }
}
