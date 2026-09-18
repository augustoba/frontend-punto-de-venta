import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ModalComponent } from '../../shared/modal.component';
import { CamaraScannerComponent } from '../../shared/camara-scanner.component';
import { ScanBuffer, beep } from '../../core/scanner';
import { MoneyPipe } from '../../shared/format';
import { Api } from '../../core/api';
import { Store, r2 } from '../../core/store';
import { PayMethod, Product } from '../../core/models';

interface CartLine { productId: string; name: string; qty: number; price: number; base: number; discountUnit: number; }

/** Caja registradora (réplica de Envi /cash-register): buscador, carrito, descuentos, cobro y arqueo de caja. */
@Component({
  selector: 'app-caja',
  imports: [FormsModule, RouterLink, ModalComponent, MoneyPipe, CamaraScannerComponent],
  template: `
    <div class="cash">
      <div class="cash-top">
        <div class="row"><a routerLink="/ventas" class="link" style="font-size: 20px">←</a>
          <div><h1>Nueva venta</h1><div class="muted">Agregá productos y guardá la venta</div></div></div>
        <span class="muted">{{ store.settings().businessName }}</span>
      </div>

      @if (!store.canSell()) {
        <div class="card" style="max-width: 460px; margin: 60px auto; text-align: center">
          <div style="font-size: 40px">🧾</div>
          <h3>La caja está cerrada</h3>
          <p class="muted">Abrí la caja registradora para empezar a vender. Al abrirla vas a declarar el efectivo inicial, y al cerrarla vas a poder comparar lo contado contra lo registrado.</p>
          <button class="cta" (click)="abrirOpen()">Abrir caja registradora</button>
        </div>
      } @else {
        <div class="cash-grid">
          <div>
            <div class="card">
              <b>Agregar producto</b>
              <div class="field" style="margin-top: 10px"><label>Buscar</label>
                <input #buscador placeholder="🔍 Nombre o código" [ngModel]="q()" (ngModelChange)="q.set($event)" (keydown.enter)="enter()" (keydown.escape)="q.set('')" style="width: 100%" /></div>
              <button style="margin-top: 8px; width: 100%" (click)="camara.set(true)"><i class="fa-solid fa-camera"></i> Escanear con la cámara</button>
              @if (aviso() && !camara()) { <p class="sub" style="margin: 8px 0 0" [style.color]="avisoOk() ? '#1f7a4d' : '#8a1c1c'">{{ aviso() }}</p> }
            </div>
            @if (listas().length > 1) {
              <div class="card" style="margin-top: 12px"><div class="field"><label>Lista de precios</label>
                <select [ngModel]="listaId()" (ngModelChange)="elegirLista($event)" style="width: 100%">@for (l of listas(); track l.id) { <option [ngValue]="l.id">{{ l.name }}{{ l.main ? '' : ' (' + (l.percent > 0 ? '+' : '') + l.percent + '%)' }}</option> }</select></div></div>
            }
            <div class="card" style="margin-top: 12px; text-align: center">
              <button class="cta" style="width: 100%" [disabled]="!cart().length" (click)="abrirCobro()">💾 Guardar venta</button>
              <p class="link" style="margin: 12px 0 0" (click)="promos.set(true)">🏷 Promociones</p>
              <p class="link" style="margin: 6px 0 0" (click)="atajos.set(true)">⌨ Atajos</p>
            </div>
            @if (store.settings().arqueo && store.openSession(); as s) {
              <div class="card" style="margin-top: 12px; text-align: center">
                <small class="muted">Caja abierta: {{ store.account(s.accountId)?.name }}</small>
                <button style="width: 100%; margin: 6px 0" (click)="cerrarOpen()">Cerrar caja</button>
                <span class="link" (click)="opOpen('egreso')">± Otras operaciones de caja</span>
              </div>
            }
          </div>

          <div>
            @if (q().trim()) {
              <div class="card">
                <div class="row"><button (click)="q.set('')">←</button><b class="grow">Resultados para «{{ q() }}»</b>
                  <label class="badge b-blue" style="cursor: pointer"><input type="checkbox" style="height: auto" [ngModel]="soloStock()" (ngModelChange)="soloStock.set($event)" /> Con stock</label></div>
                <table style="background: none; margin-top: 8px">
                  @for (p of resultados(); track p.id) {
                    <tr><td><b>{{ p.name }}</b></td><td class="muted">{{ catNombre(p) }}</td>
                      <td class="right">@if (p.offer > 0) { <s class="muted">{{ p.price | money }}</s> {{ p.offer | money }} } @else { {{ p.price | money }} }</td>
                      <td class="right"><button class="cta" style="border-radius: 99px; width: 34px; padding: 0" (click)="agregar(p)">+</button></td></tr>
                  } @empty {
                    <tr><td colspan="4" class="empty">No se encontraron resultados. @if (store.settings().createProductFromCash) { <span class="link" (click)="rapidoOpen()">Creá el producto</span> } @else { Probá buscando productos sin stock… }</td></tr>
                  }
                </table>
              </div>
            } @else {
              <div class="card">
                <div class="row" style="justify-content: space-between"><b>Resumen de la venta</b><span class="badge b-blue">{{ cart().length }} {{ cart().length === 1 ? 'producto' : 'productos' }}</span></div>
                @if (!cart().length) {
                  <div class="empty"><div style="font-size: 36px">🛒</div><b>Nueva venta</b><br />Buscá un producto por nombre o escaneá su código para empezar a cargar la venta</div>
                } @else {
                  <table style="background: none; margin-top: 8px">
                    <tr><th>Cantidad</th><th>Producto</th><th class="right">Precio</th><th class="right">Subtotal</th><th></th></tr>
                    @for (l of cart(); track l.productId; let i = $index) {
                      <tr>
                        <td><button style="height: 28px" (click)="cant(i, -1)">−</button> <b>{{ l.qty }}</b> <button class="cta" style="height: 28px; border-radius: 99px" (click)="cant(i, 1)">+</button></td>
                        <td><b>{{ l.name }}</b>@if (l.discountUnit > 0) { <br /><small class="pos">Descuento -{{ l.discountUnit | money }} c/u</small> }</td>
                        <td class="right">{{ l.price - l.discountUnit | money }}</td>
                        <td class="right"><b>{{ (l.price - l.discountUnit) * l.qty | money }}</b></td>
                        <td class="right"><div class="menu"><button class="x" (click)="menuL.set(menuL() === i ? -1 : i)">⋮</button>
                          @if (menuL() === i) { <div class="pop"><button (click)="descLinea(i)">Agregar descuento</button><button class="danger" (click)="quitar(i)">Eliminar</button></div> }</div></td>
                      </tr>
                    }
                  </table>
                  <div class="right"><small class="muted">TOTAL</small><br /><strong style="font-size: 30px">{{ subtotal() | money }}</strong></div>
                }
              </div>
              @if (store.settings().createProductFromCash) { <p><button (click)="rapidoOpen()">+ Crear producto</button></p> }
            }
          </div>
        </div>
      }
    </div>

    <!-- COBRO -->
    @if (cobro(); as c) {
      <app-modal title="Guardar venta" [width]="560" (closed)="cobro.set(null)">
        <div class="card"><small class="muted">CLIENTE Y VENDEDOR</small>
          <div class="grid2" style="margin-top: 8px">
            <div class="field"><label>Cliente</label>
              <select [ngModel]="c.customerId" (ngModelChange)="elegirCliente($event)">
                <option [ngValue]="null">Consumidor final</option><option value="__nuevo">* Nuevo cliente *</option>
                @for (cl of store.customers(); track cl.id) { <option [ngValue]="cl.id">{{ cl.name }} {{ cl.lastName }}</option> }
              </select></div>
            <div class="field"><label>Vendedor</label><select disabled><option>{{ store.db().user }}</option></select></div>
          </div>
          @if (nuevoCliente()) { <div class="row" style="margin-top: 8px"><input class="grow" placeholder="Nombre del nuevo cliente" [(ngModel)]="nuevoNombre" /><button class="cta" [disabled]="!nuevoNombre.trim()" (click)="crearCliente()">Crear</button></div> }
        </div>
        <div class="card" style="margin-top: 12px"><small class="muted">PAGO</small>
          <div class="row" style="margin: 10px 0">
            @if (c.paid || !c.customerId) {
              @for (m of metodos; track m) { <span class="badge" [class]="'badge ' + (c.method === m ? 'sel' : 'b-gray')" style="cursor: pointer" (click)="c.method = m">{{ m }}</span> }
            } @else { <span class="badge b-gray">Cuenta corriente</span> }
            <span class="grow"></span>
            <label class="row"><span class="sw" [class.on]="c.paid" (click)="togglePago(c)"></span> Está pago</label>
          </div>
          @if (!c.paid && c.customerId) { <span class="note info">Se registrará en la cuenta corriente de este cliente</span> }
          @if (!c.paid && !c.customerId) { <span class="note warn">Para dejar la venta a cuenta corriente elegí un cliente.</span> }
          @if (autoPct(c) > 0) { <span class="note ok">Descuento automático aplicado: {{ autoPct(c) }}%</span> }
          <div class="row"><span class="link" (click)="descGlobal.set(true)">🏷 Aplicar descuento</span>@if (c.discountPct > 0) { <span class="badge b-green">{{ c.discountPct }}%</span> }</div>
        </div>
        <div class="card" style="margin-top: 12px">
          <label class="row" style="justify-content: space-between">Emitir factura <span class="sw" [class.on]="c.invoice" (click)="c.invoice = !c.invoice"></span></label>
          <hr style="border: 0; border-top: 1px solid var(--divider-color)" />
          <label class="row" style="justify-content: space-between">Imprimir comprobante <span class="sw" [class.on]="c.print" (click)="c.print = !c.print"></span></label>
        </div>
        <div class="field" style="margin-top: 10px"><label>Notas</label><textarea style="width: 100%; height: 60px; border: 1px solid var(--control-border-color); border-radius: 12px; padding: 8px" [(ngModel)]="c.notes" placeholder="Agregá una nota para esta venta"></textarea></div>
        @if (error()) { <span class="note bad">{{ error() }}</span> }
        <div class="mf" style="justify-content: space-between">
          <div><small class="muted">TOTAL A COBRAR</small><br /><strong style="font-size: 24px">{{ totalCobro(c) | money }}</strong></div>
          <div class="row"><button (click)="cobro.set(null)">Cancelar</button><button class="cta" (click)="guardar(c)">Guardar</button></div>
        </div>
      </app-modal>
    }
    @if (descGlobal()) {
      <app-modal title="Gestionar descuentos" [width]="360" (closed)="descGlobal.set(false)">
        <div class="field"><label>Porcentaje de descuento</label><input type="number" min="0" max="100" [(ngModel)]="pctTmp" /></div>
        <div class="mf"><button (click)="descGlobal.set(false)">Cancelar</button><button class="cta" (click)="cobro()!.discountPct = +pctTmp || 0; descGlobal.set(false)">Aceptar</button></div>
      </app-modal>
    }
    @if (lineaDesc(); as ld) {
      <app-modal title="Gestionar descuento del producto" [width]="520" (closed)="lineaDesc.set(null)">
        <div class="grid2" style="grid-template-columns: repeat(3, 1fr)">
          <div class="field"><label>Precio original</label><input disabled [value]="ld.base" /></div>
          <div class="field"><label>Descuento $</label><input type="number" [ngModel]="ld.monto" (ngModelChange)="ld.monto = +$event; ld.final = r2(ld.base - ld.monto); ld.pct = ld.base ? r2((ld.monto / ld.base) * 100) : 0" /></div>
          <div class="field"><label>Descuento %</label><input type="number" [ngModel]="ld.pct" (ngModelChange)="ld.pct = +$event; ld.monto = r2(ld.base * ld.pct / 100); ld.final = r2(ld.base - ld.monto)" /></div>
        </div>
        <div class="field" style="margin-top: 10px"><label>Precio final</label><input type="number" [ngModel]="ld.final" (ngModelChange)="ld.final = +$event; ld.monto = r2(ld.base - ld.final); ld.pct = ld.base ? r2((ld.monto / ld.base) * 100) : 0" /></div>
        <div class="mf"><button (click)="lineaDesc.set(null)">Cancelar</button><button class="cta" (click)="aplicarLinea()">Aceptar</button></div>
      </app-modal>
    }
    @if (camara()) { <app-camara-scanner [mensaje]="aviso()" (codigo)="porCodigo($event)" (closed)="camara.set(false)" /> }
    @if (rapido(); as r) {
      <app-modal title="Nuevo producto" [width]="420" (closed)="rapido.set(null)">
        <div class="field"><label>Nombre</label><input [(ngModel)]="r.name" /></div>
        @if (r.barcode) { <p class="sub" style="margin: 6px 0 0"><i class="fa-solid fa-barcode"></i> Código: <b>{{ r.barcode }}</b></p> }
        <div class="grid2" style="margin-top: 8px"><div class="field"><label>Precio</label><input type="number" [(ngModel)]="r.price" /></div><div class="field"><label>Costo</label><input type="number" [(ngModel)]="r.cost" /></div></div>
        <div class="mf"><button (click)="rapido.set(null)">Cancelar</button><button class="cta" [disabled]="!r.name.trim()" (click)="crearRapido(r)">Aceptar</button></div>
      </app-modal>
    }
    @if (promos()) { <app-modal title="Promociones" [width]="380" (closed)="promos.set(false)"><p class="empty">No tenés promociones vigentes</p></app-modal> }
    @if (atajos()) {
      <app-modal title="Atajos" [width]="460" (closed)="atajos.set(false)">
        <table style="background: none">
          <tr><td>Buscar</td><td>Alt + F</td></tr><tr><td>Limpiar búsqueda</td><td>Esc</td></tr><tr><td>Guardar venta</td><td>Alt + S</td></tr>
          <tr><td>Crear producto rápido</td><td>Alt + Q</td></tr><tr><td>Ver promociones</td><td>Alt + M</td></tr><tr><td>Sumar / restar a la última línea</td><td>Alt + + / Alt + −</td></tr><tr><td>Eliminar la última línea</td><td>Alt + X</td></tr>
        </table>
      </app-modal>
    }

    <!-- ARQUEO -->
    @if (abrir(); as a) {
      <app-modal title="Apertura de caja" [width]="480" (closed)="abrir.set(null)">
        <div class="field"><label>Caja</label><select [(ngModel)]="a.accountId" (ngModelChange)="a.prev = cierreAnterior(a.accountId); a.saldo = a.prev">@for (ac of cajas(); track ac.id) {<option [value]="ac.id">{{ ac.name }}</option>}</select></div>
        <div class="grid2" style="margin: 10px 0"><div class="field"><label>Valor cierre anterior</label><input disabled [value]="a.prev" /></div><div class="field"><label>Nuevo saldo inicial</label><input type="number" [(ngModel)]="a.saldo" /></div></div>
        @if (+a.saldo !== a.prev) { <span class="note info">Se agregará movimiento «Diferencia de apertura de caja» <b style="float: right">{{ r2(+a.saldo - a.prev) | money }}</b></span> }
        <div class="field"><label>Notas de apertura (opcional)</label><textarea style="width: 100%; height: 60px; border: 1px solid var(--control-border-color); border-radius: 12px; padding: 8px" [(ngModel)]="a.notes"></textarea></div>
        <div class="mf"><button (click)="abrir.set(null)">Cancelar</button><button class="cta" (click)="store.openCash(a.accountId, +a.saldo, a.notes); abrir.set(null)">Aceptar</button></div>
      </app-modal>
    }
    @if (cerrar(); as k) {
      <app-modal title="Cierre de caja" [width]="500" (closed)="cerrar.set(null)">
        <div class="card"><b>💵 {{ store.account(store.openSession()?.accountId ?? null)?.name }}</b>
          <div class="row" style="justify-content: space-between; margin-top: 8px"><div><small class="muted">SALDO INICIAL</small><br /><b>{{ store.openSession()?.openingBalance | money }}</b></div><div><small class="muted">MOVIMIENTOS</small><br /><b>{{ movs() | money }}</b></div></div></div>
        <div class="grid2" style="margin: 10px 0"><div class="field"><label>Saldo de cierre esperado</label><input disabled [value]="k.esperado" /><small class="muted">Calculado por el sistema</small></div>
          <div class="field"><label>Saldo de cierre real</label><input type="number" [(ngModel)]="k.real" />
            @if (r2(+k.real - k.esperado) !== 0) { <span class="badge" [class]="'badge ' + (+k.real > k.esperado ? 'b-green' : 'b-red')">{{ +k.real > k.esperado ? 'Sobrante' : 'Faltante' }} de {{ r2(abs(+k.real - k.esperado)) | money }}</span> }</div></div>
        <div class="field"><label>Notas de cierre (opcional)</label><textarea style="width: 100%; height: 60px; border: 1px solid var(--control-border-color); border-radius: 12px; padding: 8px" [(ngModel)]="k.notes"></textarea></div>
        <div class="mf"><button (click)="cerrar.set(null)">Cancelar</button><button class="cta" (click)="store.closeCash(+k.real, k.notes); cerrar.set(null)">Aceptar</button></div>
      </app-modal>
    }
    @if (op(); as o) {
      <app-modal title="Nuevo movimiento" [width]="480" (closed)="op.set(null)">
        <div class="row" style="margin-bottom: 10px"><span class="badge" [class]="'badge ' + (o.tipo === 'ingreso' ? 'sel' : 'b-gray')" style="cursor: pointer" (click)="o.tipo = 'ingreso'">Ingreso</span><span class="badge" [class]="'badge ' + (o.tipo === 'egreso' ? 'sel' : 'b-gray')" style="cursor: pointer" (click)="o.tipo = 'egreso'">Egreso</span></div>
        <div class="grid2"><div class="field"><label>Cuenta</label><input disabled [value]="store.account(store.openSession()?.accountId ?? null)?.name" /></div><div class="field"><label>Importe</label><input type="number" [(ngModel)]="o.importe" /></div></div>
        <div class="grid2" style="margin-top: 8px">
          <div class="field"><label>Categoría</label><select [(ngModel)]="o.cat" (ngModelChange)="o.sub = ''"><option value="">—</option>@for (c of store.categories(); track c.id) {<option [value]="c.name">{{ c.name }}</option>}</select></div>
          <div class="field"><label>Subcategoría (obligatoria)</label><select [(ngModel)]="o.sub"><option value="">—</option>@for (s of subsDe(o.cat); track s) {<option [value]="s">{{ s }}</option>}</select></div>
        </div>
        <div class="field" style="margin-top: 8px"><label>Descripción</label><input [(ngModel)]="o.desc" /></div>
        <div class="mf"><button (click)="op.set(null)">Cancelar</button><button class="cta" [disabled]="!o.importe || !o.cat || (subsDe(o.cat).length > 0 && !o.sub)" (click)="guardarOp(o)">Aceptar</button></div>
      </app-modal>
    }
  `,
})
export class CajaComponent implements OnInit, AfterViewInit {
  readonly store = inject(Store);
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  @ViewChild('buscador') buscador?: ElementRef<HTMLInputElement>;

  readonly r2 = r2;
  abs = Math.abs;
  readonly metodos: PayMethod[] = ['Efectivo', 'Transferencia', 'Tarjeta'];
  readonly q = signal('');
  readonly camara = signal(false);
  readonly aviso = signal('');
  readonly avisoOk = signal(true);
  private readonly scan = new ScanBuffer();
  private avisoTimer?: ReturnType<typeof setTimeout>;
  readonly soloStock = signal(true);
  readonly cart = signal<CartLine[]>([]);
  /** Listas de precios del servidor (Principal + las que cree el negocio). Sin API sólo hay precio base. */
  readonly listas = signal<{ id: number; name: string; percent: number; main: boolean }[]>([]);
  readonly listaId = signal<number | null>(null);
  readonly menuL = signal(-1);
  readonly cobro = signal<any>(null);
  readonly error = signal('');
  readonly descGlobal = signal(false);
  pctTmp = 0;
  readonly lineaDesc = signal<any>(null);
  readonly rapido = signal<any>(null);
  readonly promos = signal(false);
  readonly atajos = signal(false);
  readonly nuevoCliente = signal(false);
  nuevoNombre = '';
  readonly abrir = signal<any>(null);
  readonly cerrar = signal<any>(null);
  readonly op = signal<any>(null);
  private budgetId: string | null = null;

  readonly cajas = computed(() => this.store.accounts().filter((a) => a.type === 'caja'));
  readonly subtotal = computed(() => r2(this.cart().reduce((s, l) => s + (l.price - l.discountUnit) * l.qty, 0)));
  readonly resultados = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.store.db().products.filter((p) => !p.archived && (p.name.toLowerCase().includes(q) || p.barcode === q) && (!this.soloStock() || this.store.stockOf(p) > 0));
  });

  ngOnInit(): void {
    this.cargarListas();
    const b = this.route.snapshot.queryParamMap.get('presupuesto');
    const bud = b ? this.store.db().budgets.find((x) => x.id === b) : undefined;
    if (bud) {
      this.budgetId = bud.id;
      this.cart.set(bud.lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, price: l.price, base: l.price, discountUnit: 0 })));
    }
    if (bud?.customerId) setTimeout(() => this.abrirCobro(bud.customerId));
    if (!this.store.canSell()) setTimeout(() => this.abrirOpen());
  }

  /**
   * Lector de mano: si el foco no está en un campo de texto (ni hay un modal abierto), una ráfaga de teclas rápida
   * cerrada con Enter se toma como código de barras. Cuando el foco está en el buscador lo resuelve `enter()`.
   */
  private lectorDeMano(e: KeyboardEvent) {
    const code = this.scan.push(e.key, e.timeStamp);
    const el = e.target instanceof HTMLElement ? e.target : null;
    const enCampo = !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
    if (!code || enCampo || el?.closest('.modal') || this.cobro() || this.rapido() || this.camara()) return;
    e.preventDefault();      // el Enter del lector no debe accionar el botón que tenga el foco
    this.porCodigo(code, true);
    this.buscador?.nativeElement.focus();
  }

  @HostListener('window:keydown', ['$event'])
  atajo(e: KeyboardEvent) {
    if (!e.altKey && !e.ctrlKey && !e.metaKey) this.lectorDeMano(e);
    if (!e.altKey) return;
    const k = e.key.toLowerCase();
    const last = this.cart().length - 1;
    if (k === 'f') { e.preventDefault(); this.buscador?.nativeElement.focus(); }
    else if (k === 's' && this.cart().length) { e.preventDefault(); this.abrirCobro(); }
    else if (k === 'q') { e.preventDefault(); this.rapidoOpen(); }
    else if (k === 'm') { e.preventDefault(); this.promos.set(true); }
    else if ((k === '+' || k === '=') && last >= 0) { e.preventDefault(); this.cant(last, 1); }
    else if (k === '-' && last >= 0) { e.preventDefault(); this.cant(last, -1); }
    else if (k === 'x' && last >= 0) { e.preventDefault(); this.quitar(last); }
  }

  catNombre(p: Product): string { return this.store.categories().find((c) => c.id === p.categoryId)?.name ?? ''; }

  // carrito
  enter() {
    const q = this.q().trim();
    if (!q) return;
    if (this.store.db().products.some((p) => !p.archived && p.barcode && p.barcode === q)) { this.porCodigo(q); return; }
    if (this.resultados().length === 1) { this.agregar(this.resultados()[0]); return; }
    if (/^\d{6,}$/.test(q)) this.porCodigo(q);   // parece un código de barras y no existe: avisa
  }

  /** Agrega el producto cuyo código de barras coincide (lector de mano, cámara o buscador). Avisa si no existe. */
  porCodigo(code: string, ofrecerCrear = false) {
    const p = this.store.db().products.find((x) => !x.archived && x.barcode && x.barcode === code);
    if (p) {
      this.agregar(p);
      this.decir(`✔ ${p.name} agregado`, true);
    } else {
      this.decir(`✖ No hay ningún producto con el código ${code}`, false);
      if (ofrecerCrear && this.store.settings().createProductFromCash) this.rapidoOpen(code);
    }
  }
  private decir(msg: string, ok: boolean) {
    this.aviso.set(msg); this.avisoOk.set(ok); beep(ok);
    clearTimeout(this.avisoTimer);
    this.avisoTimer = setTimeout(() => this.aviso.set(''), 4000);
  }
  ngAfterViewInit(): void { setTimeout(() => this.buscador?.nativeElement.focus()); }
  agregar(p: Product) {
    const precio = this.precioDe(p);
    this.cart.update((c) => {
      const i = c.findIndex((l) => l.productId === p.id);
      return i >= 0 ? c.map((l, k) => (k === i ? { ...l, qty: l.qty + 1 } : l)) : [...c, { productId: p.id, name: p.name, qty: 1, price: precio, base: precio, discountUnit: 0 }];
    });
    this.q.set('');
  }
  /** Precio según la lista elegida: Principal usa oferta/precio; otra lista aplica su porcentaje al precio base. */
  private precioDe(p: Product): number {
    const l = this.listas().find((x) => x.id === this.listaId());
    return !l || l.main ? (p.offer > 0 ? p.offer : p.price) : r2(p.price * (1 + l.percent / 100));
  }
  elegirLista(id: number) {
    this.listaId.set(id);
    this.cart.update((c) => c.map((l) => { const p = this.store.product(l.productId); if (!p) return l; const precio = this.precioDe(p); return { ...l, price: precio, base: precio, discountUnit: 0 }; }));
  }
  private async cargarListas() {
    try {
      const ls = await this.api.get<any[]>('/api/price-lists');
      this.listas.set(ls.map((l) => ({ id: l.id, name: l.name, percent: Number(l.percent), main: !!l.main })));
      this.listaId.set(ls.find((l) => l.main)?.id ?? null);
    } catch { /* sin API: precio base */ }
  }
  cant(i: number, d: number) { this.cart.update((c) => c.map((l, k) => (k === i ? { ...l, qty: Math.max(1, l.qty + d) } : l))); }
  quitar(i: number) { this.cart.update((c) => c.filter((_, k) => k !== i)); this.menuL.set(-1); }
  descLinea(i: number) {
    const l = this.cart()[i]; this.menuL.set(-1);
    this.lineaDesc.set({ i, base: l.price, monto: l.discountUnit, pct: l.price ? r2((l.discountUnit / l.price) * 100) : 0, final: r2(l.price - l.discountUnit) });
  }
  aplicarLinea() { const d = this.lineaDesc(); this.cart.update((c) => c.map((l, k) => (k === d.i ? { ...l, discountUnit: Math.max(0, r2(d.monto)) } : l))); this.lineaDesc.set(null); }
  rapidoOpen(barcode = '') { this.rapido.set({ name: '', price: 0, cost: 0, barcode }); }
  async crearRapido(r: any) {
    try {
      const id = await this.store.saveProduct({ name: r.name.trim(), barcode: r.barcode ?? '', price: +r.price || 0, cost: +r.cost || 0 }, 0);
      const p = this.store.product(id)!; this.rapido.set(null); this.agregar(p);
    } catch (e: any) { this.error.set(e.message ?? 'No se pudo crear el producto'); }
  }

  // cobro
  abrirCobro(customerId: string | null = null) {
    this.error.set('');
    this.cobro.set({ customerId, method: 'Efectivo' as PayMethod, paid: true, discountPct: 0, invoice: false, print: false, notes: '' });
  }
  elegirCliente(v: string | null) {
    const c = this.cobro();
    if (v === '__nuevo') { this.nuevoCliente.set(true); return; }
    c.customerId = v; this.nuevoCliente.set(false);
  }
  async crearCliente() {
    try { const id = await this.store.saveCustomer({ name: this.nuevoNombre.trim() }); this.cobro().customerId = id; this.nuevoCliente.set(false); this.nuevoNombre = ''; }
    catch (e: any) { this.error.set(e.message ?? 'No se pudo crear el cliente'); }
  }
  togglePago(c: any) { c.paid = !c.paid; }
  autoPct(c: any): number { const s = this.store.settings(); return c.method === 'Transferencia' && c.paid && s.transferDiscount > 0 ? s.transferDiscount : 0; }
  totalCobro(c: any): number { const pct = Math.max(c.discountPct, this.autoPct(c)); return r2(this.subtotal() * (1 - pct / 100)); }
  async guardar(c: any) {
    try {
      const s = await this.store.registerSale({
        customerId: c.customerId, lines: this.cart().map((l) => ({ productId: l.productId, qty: l.qty, price: l.price, discountUnit: l.discountUnit })),
        discountPct: c.discountPct, method: c.method, paid: c.paid, notes: c.notes, invoice: c.invoice, budgetId: this.budgetId, priceListId: this.listaId(),
      });
      if (c.print) this.imprimir(s.number);
      this.cobro.set(null); this.cart.set([]); this.budgetId = null;
      if (this.route.snapshot.queryParamMap.get('presupuesto')) this.router.navigate(['/caja']);
    } catch (e: any) { this.error.set(e.message ?? 'No se pudo guardar la venta'); }
  }
  private imprimir(n: number) {
    const s = this.store.db().sales.find((x) => x.number === n); if (!s) return;
    const w = window.open('', '_blank', 'width=380,height=600'); if (!w) return;
    w.document.write(`<pre style="font-family:monospace">${this.store.settings().businessName}\nVenta #${s.number}\n${new Date(s.at).toLocaleString('es-AR')}\n----------------\n${s.lines.map((l) => `${l.qty} x ${l.name}  ${((l.price - l.discountUnit) * l.qty).toFixed(2)}`).join('\n')}\n----------------\nTOTAL ${s.total.toFixed(2)}\n${s.method}</pre>`);
    w.document.close(); w.print();
  }

  // arqueo
  cierreAnterior(accountId: string): number { return [...this.store.db().sessions].reverse().find((s) => s.accountId === accountId && s.closedAt)?.real ?? 0; }
  abrirOpen() { const a = this.cajas()[0]?.id ?? ''; const prev = this.cierreAnterior(a); this.abrir.set({ accountId: a, prev, saldo: prev, notes: '' }); }
  movs(): number { const s = this.store.openSession(); return s ? r2(this.store.balanceOfAccount(s.accountId) - s.openingBalance) : 0; }
  cerrarOpen() { const e = this.store.expectedClose(); this.cerrar.set({ esperado: e, real: e, notes: '' }); }
  opOpen(tipo: 'ingreso' | 'egreso') { this.op.set({ tipo, importe: 0, cat: '', sub: '', desc: '' }); }
  subsDe(cat: string): string[] { return this.store.categories().find((c) => c.name === cat)?.subs.map((s) => s.name) ?? []; }
  guardarOp(o: any) {
    const s = this.store.openSession(); if (!s) return;
    this.store.addMovement({ accountId: s.accountId, amount: o.tipo === 'ingreso' ? +o.importe : -o.importe, category: o.cat, subcategory: o.sub, description: o.desc });
    this.op.set(null);
  }
}
