import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ModalComponent } from '../../shared/modal.component';
import { TourComponent, TourStep } from '../../shared/tour.component';
import { CamaraScannerComponent } from '../../shared/camara-scanner.component';
import { ScanBuffer, beep } from '../../core/scanner';
import { MoneyPipe } from '../../shared/format';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { Store, r2 } from '../../core/store';
import { PayMethod, Product } from '../../core/models';

interface CartLine { productId: string; name: string; qty: number; price: number; base: number; discountUnit: number; }

/** Caja registradora (réplica de Envi /cash-register): buscador, carrito, descuentos, cobro y arqueo de caja. */
@Component({
  selector: 'app-caja',
  imports: [FormsModule, RouterLink, ModalComponent, MoneyPipe, CamaraScannerComponent, TourComponent],
  template: `
    <div class="animated-bg" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="cash">
      <div class="topbar cash-bar">
        <div class="biz">
          <a routerLink="/ventas" class="hamb" title="Volver al panel"><i class="fa-solid fa-bars"></i></a>
          @if (store.settings().logo) { <img class="biz-logo" [src]="store.settings().logo" alt="Logo" /> } @else { <a class="biz-logo empty" routerLink="/ajustes" title="Subí tu logo en Ajustes">TU<br />LOGO</a> }
          <b>{{ store.settings().businessName || 'Mi negocio' }}</b>
        </div>
        <div class="who"><i class="fa-regular fa-bell" style="color: var(--text-soft)"></i><span>{{ auth.session()?.username ?? store.db().user }}</span><span class="avatar"><i class="fa-solid fa-user"></i></span></div>
      </div>
      <div class="cash-top">
        <div class="row"><a routerLink="/ventas" class="link" style="font-size: 18px"><i class="fa-solid fa-arrow-left"></i></a>
          <div><h1>Nueva venta</h1><div class="muted">Agregá productos y guardá la venta</div></div></div>
      </div>

      <div class="quick">
        <button class="q q-caja" (click)="mov('ingreso')" title="Ingreso o retiro de caja"><i class="fa-solid fa-wallet"></i><span>Caja</span></button>
        <a class="q q-prov" routerLink="/proveedores" title="Proveedores"><i class="fa-solid fa-truck"></i><span>Proveedores</span></a>
        <button class="q q-gasto" (click)="mov('egreso')" title="Registrar un gasto"><i class="fa-solid fa-arrow-right-arrow-left"></i><span>Gastos</span><kbd>F7</kbd></button>
        <button class="q q-cierre" (click)="cierre()" title="Cerrar la caja"><i class="fa-solid fa-chart-line"></i><span>Cierre caja</span><kbd>F4</kbd></button>
        <a class="q q-hist" routerLink="/ventas" title="Historial de ventas"><i class="fa-solid fa-clock-rotate-left"></i><span>Historial</span><kbd>F6</kbd></a>
        <a class="q q-dash" routerLink="/dashboard" title="Dashboard"><i class="fa-solid fa-gauge-high"></i><span>Dashboard</span></a>
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
              <div class="row between"><b>Agregar producto</b>
                <span class="lector" [class.off]="!lectorActivo()" [title]="lectorActivo() ? 'Escaneá un código de barras en cualquier momento' : 'El lector se pausa mientras hay una ventana abierta'"><i class="dot"></i>{{ lectorActivo() ? 'LECTOR ACTIVO' : 'LECTOR EN PAUSA' }}</span></div>
              <button class="rapida" [class.on]="rapidaOn()" (click)="rapidaOn.set(!rapidaOn())" title="Modo rápido: F8 guarda la venta en efectivo sin preguntar"><i class="fa-solid fa-bolt"></i>Rápida<kbd>F1</kbd></button>
              <div class="field" style="margin-top: 10px"><label>Buscar</label>
                <div class="search-wrap barcode-in" data-tour="buscar" [class.esperando]="esperandoLector()"><input #buscador class="search" placeholder="Nombre o código" [ngModel]="q()" (ngModelChange)="q.set($event)" (keydown.enter)="enter()" (keydown.escape)="q.set('')" style="width: 100%" />
                  <button class="bc2" [class.on]="esperandoLector()" (click)="esperarLector()" title="Escanear con lector de mano"><i class="fa-solid fa-barcode"></i></button>
                  <button class="bc" (click)="camara.set(true)" title="Escanear con la cámara"><i class="fa-solid fa-camera"></i></button></div>
                @if (esperandoLector()) { <small class="lector-on"><i class="fa-solid fa-satellite-dish"></i> Esperando el lector: escaneá el producto…</small> }</div>
              @if (aviso() && !camara()) { <p class="sub" style="margin: 8px 0 0" [style.color]="avisoOk() ? '#1f7a4d' : '#8a1c1c'">{{ aviso() }}</p> }
            </div>
            <div class="card" style="margin-top: 12px" data-tour="lista"><div class="field"><label>Lista de precios</label>
              <select [ngModel]="listaId()" (ngModelChange)="elegirLista($event)" style="width: 100%">
                @for (l of listas(); track l.id) { <option [ngValue]="l.id">{{ l.name }}{{ l.main ? '' : ' (' + (l.percent > 0 ? '+' : '') + l.percent + '%)' }}</option> }
                @if (!listas().length) { <option [ngValue]="null">Principal</option> }
              </select></div></div>
            <div class="card" style="margin-top: 12px; text-align: center" data-tour="guardar">
              <button class="cta" style="width: 100%" [disabled]="!cart().length" (click)="confirmar()"><i class="fa-regular fa-floppy-disk"></i>{{ rapidaOn() ? 'Confirmar venta' : 'Guardar venta' }}<kbd>F8</kbd></button>
              <p class="link" data-tour="promos" style="margin: 12px 0 0" (click)="promos.set(true)"><i class="fa-solid fa-tag" style="margin-right: 6px"></i>Promociones</p>
              <p class="link" data-tour="atajos" style="margin: 6px 0 0" (click)="atajos.set(true)"><i class="fa-regular fa-keyboard" style="margin-right: 6px"></i>Atajos</p>
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
                @if (cart().length) { <div class="row" style="justify-content: space-between"><b>Resumen de la venta</b><span class="badge b-blue">{{ cart().length }} {{ cart().length === 1 ? 'producto' : 'productos' }}</span></div> }
                @if (!cart().length) {
                  <div class="empty cart-empty"><div class="cart-ic"><i class="fa-solid fa-cart-shopping"></i></div><b>Nueva venta</b><br />Buscá un producto por nombre o escaneá<br />su código para empezar a cargar la venta</div>
                } @else {
                  <table style="background: none; margin-top: 8px">
                    <tr><th>Cantidad</th><th>Producto</th><th class="right">Precio</th><th class="right">Subtotal</th><th></th></tr>
                    @for (l of cart(); track l.productId; let i = $index) {
                      <tr>
                        <td><span class="qty"><button type="button" (click)="cant(i, -1)" aria-label="Restar uno"><i class="fa-solid fa-minus"></i></button><b>{{ l.qty }}</b><button type="button" class="mas" (click)="cant(i, 1)" aria-label="Sumar uno"><i class="fa-solid fa-plus"></i></button></span></td>
                        <td><b>{{ l.name }}</b>@if (l.discountUnit > 0) { <br /><small class="pos">Descuento -{{ l.discountUnit | money }} c/u</small> }</td>
                        <td class="right">{{ l.price - l.discountUnit | money }}</td>
                        <td class="right"><b>{{ (l.price - l.discountUnit) * l.qty | money }}</b></td>
                        <td class="right"><div class="menu"><button class="x" (click)="menuL.set(menuL() === i ? -1 : i)">⋮</button>
                          @if (menuL() === i) { <div class="pop"><button (click)="descLinea(i)">Agregar descuento</button><button class="danger" (click)="quitar(i)">Eliminar</button></div> }</div></td>
                      </tr>
                    }
                  </table>
                  <div class="ajustes-row">
                    <button class="adj desc" (click)="abrirAjuste('descuento')"><i class="fa-solid fa-percent"></i>Descuento</button>
                    <button class="adj rec" (click)="abrirAjuste('recargo')"><i class="fa-solid fa-arrow-trend-up"></i>Recargo</button>
                    @if (ajusteGlobal() !== 0) { <span class="badge" [class.b-green]="ajusteGlobal() > 0" [class.b-amber]="ajusteGlobal() < 0">{{ ajusteGlobal() > 0 ? 'Descuento ' + ajusteGlobal() : 'Recargo ' + (-ajusteGlobal()) }}% <a class="link" (click)="ajusteGlobal.set(0)" title="Quitar">✕</a></span> }
                  </div>
                  <div class="right"><small class="muted">TOTAL</small><br /><strong style="font-size: 30px">{{ totalConAjuste() | money }}</strong></div>
                }
              </div>
              <div class="card grilla">
                <div class="chips"><button class="chip" [class.on]="catSel() === ''" (click)="catSel.set('')">Todos</button>@for (c of catsGrilla(); track c.id) { <button class="chip" [class.on]="catSel() === c.id" (click)="catSel.set(c.id)">{{ c.emoji }} {{ c.name }}</button> }</div>
                @if (grilla().length) {
                  <div class="tiles">@for (p of grilla(); track p.id) {
                    <button class="tile" (click)="agregar(p)" [class.sinstock]="!p.service && store.stockOf(p) <= 0" [title]="p.name">
                      @if (p.image) { <img [src]="p.image" [alt]="p.name" /> } @else { <span class="ph"><i class="fa-solid fa-bag-shopping"></i></span> }
                      <b>{{ p.name }}</b><span class="pr">{{ precioDe(p) | money }}</span>
                      @if (!p.service && store.stockOf(p) <= 0) { <em>Sin stock</em> }
                    </button>
                  }</div>
                } @else { <p class="sub" style="text-align: center; padding: 14px 0">No hay productos en esta categoría.</p> }
              </div>
              @if (store.settings().createProductFromCash) { <p><button class="pillbtn" style="height: 32px" (click)="rapidoOpen()"><i class="fa-solid fa-plus"></i>Crear producto</button></p> }
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
          <div class="row"><span class="link" (click)="abrirAjuste(c.discountPct < 0 ? 'recargo' : 'descuento')"><i class="fa-solid fa-percent" style="margin-right: 6px"></i>Aplicar descuento o recargo</span>@if (c.discountPct > 0) { <span class="badge b-green">Descuento {{ c.discountPct }}%</span> } @if (c.discountPct < 0) { <span class="badge b-amber">Recargo {{ -c.discountPct }}%</span> }</div>
        </div>
        <div class="card" style="margin-top: 12px">
          <label class="row" style="justify-content: space-between">Emitir factura <span class="sw" [class.on]="c.invoice" (click)="c.invoice = !c.invoice"></span></label>
          <hr style="border: 0; border-top: 1px solid var(--divider-color)" />
          @if (store.settings().receiptAction !== 'nada') {
            <label class="row" style="justify-content: space-between">Imprimir comprobante <span class="sw" [class.on]="c.print" (click)="c.print = !c.print"></span></label>
          }
          @if (store.settings().exchangeTicket) {
            <label class="row" style="justify-content: space-between">Ticket de cambio (para regalo) <span class="sw" [class.on]="c.gift" (click)="c.gift = !c.gift"></span></label>
          }
        </div>
        @if (c.method === 'Efectivo' && c.paid) {
          <div class="recibido">
            <div class="field"><label>Dinero recibido</label><input type="number" min="0" [(ngModel)]="c.recibido" placeholder="Con cuánto paga el cliente" /></div>
            <div class="billetes"><button (click)="c.recibido = totalCobro(c)">Exacto</button>@for (b of billetes(totalCobro(c)); track b) { <button (click)="c.recibido = b">{{ b | money }}</button> }</div>
            @if (+c.recibido > 0) {
              @if (vuelto(c) >= 0) { <div class="vuelto"><small>VUELTO A DAR</small><strong>{{ vuelto(c) | money }}</strong></div> }
              @else { <div class="vuelto falta"><small>FALTAN</small><strong>{{ -vuelto(c) | money }}</strong></div> }
            }
          </div>
        }
        <div class="field" style="margin-top: 10px"><label>Notas</label><textarea style="width: 100%; height: 60px; border: 1px solid var(--control-border-color); border-radius: 12px; padding: 8px" [(ngModel)]="c.notes" placeholder="Agregá una nota para esta venta"></textarea></div>
        @if (error()) { <span class="note bad">{{ error() }}</span> }
        <div class="mf" style="justify-content: space-between">
          <div><small class="muted">TOTAL A COBRAR</small><br /><strong style="font-size: 24px">{{ totalCobro(c) | money }}</strong></div>
          <div class="row"><button (click)="cobro.set(null)">Cancelar</button><button class="cta" [disabled]="faltaPlata(c)" (click)="guardar(c)">Guardar</button></div>
        </div>
      </app-modal>
    }
    @if (descGlobal()) {
      <app-modal title="Descuento o recargo" [width]="380" (closed)="descGlobal.set(false)">
        <div class="seg" style="margin-bottom: 12px"><button [class.on]="tipoAjuste() === 'descuento'" (click)="tipoAjuste.set('descuento')">Descuento</button><button [class.on]="tipoAjuste() === 'recargo'" (click)="tipoAjuste.set('recargo')">Recargo</button></div>
        <div class="field"><label>Porcentaje de {{ tipoAjuste() }}</label><input type="number" min="0" max="100" [(ngModel)]="pctTmp" /></div>
        <p class="sub">{{ tipoAjuste() === 'descuento' ? 'Se resta del total de la venta.' : 'Se suma al total de la venta (por ejemplo, por pago con tarjeta).' }}</p>
        <div class="mf"><button (click)="descGlobal.set(false)">Cancelar</button><button class="cta" (click)="aplicarAjuste()">Aceptar</button></div>
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
    <button class="ayuda-fab" style="border: 0" (click)="iniciarTour()" title="Recorrido guiado de la caja" aria-label="Ayuda"><i class="fa-solid fa-circle-question"></i></button>
    @if (tour()) { <app-tour [steps]="pasosTour" (closed)="cerrarTour()" /> }
    @if (camara()) { <app-camara-scanner [mensaje]="aviso()" (codigo)="porCodigo($event)" (closed)="camara.set(false)" /> }
    @if (rapido(); as r) {
      <app-modal title="Nuevo producto" [width]="420" (closed)="rapido.set(null)">
        <div class="field"><label>Nombre</label><input [(ngModel)]="r.name" /></div>
        <div class="field" style="margin-top: 8px"><label>Código de barra (opcional)</label><input [(ngModel)]="r.barcode" (keydown.enter)="$event.preventDefault()" placeholder="Escribilo o escanealo con el lector" inputmode="numeric" /></div>
        <div class="grid2" style="margin-top: 8px"><div class="field"><label>Precio</label><input type="number" [(ngModel)]="r.price" /></div><div class="field"><label>Costo</label><input type="number" [(ngModel)]="r.cost" /></div></div>
        <div class="mf"><button (click)="rapido.set(null)">Cancelar</button><button class="cta" [disabled]="!r.name.trim()" (click)="crearRapido(r)">Aceptar</button></div>
      </app-modal>
    }
    @if (promos()) { <app-modal title="Promociones" [width]="380" (closed)="promos.set(false)"><p class="empty">No tenés promociones vigentes</p></app-modal> }
    @if (atajos()) {
      <app-modal title="Atajos" [width]="460" (closed)="atajos.set(false)">
        <table style="background: none">
          <tr><td>Modo Rápida (F8 guarda al toque)</td><td>F1</td></tr><tr><td>Cierre de caja</td><td>F4</td></tr><tr><td>Historial de ventas</td><td>F6</td></tr><tr><td>Registrar un gasto</td><td>F7</td></tr><tr><td>Confirmar / guardar la venta</td><td>F8</td></tr><tr><td>Buscar</td><td>Alt + F</td></tr><tr><td>Limpiar búsqueda</td><td>Esc</td></tr><tr><td>Guardar venta</td><td>Alt + S</td></tr>
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
  readonly auth = inject(Auth);
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  @ViewChild('buscador') buscador?: ElementRef<HTMLInputElement>;

  readonly r2 = r2;
  abs = Math.abs;
  readonly metodos: PayMethod[] = ['Efectivo', 'Transferencia', 'Tarjeta'];
  readonly q = signal('');
  readonly camara = signal(false);
  readonly esperandoLector = signal(false);
  private lectorTimer?: ReturnType<typeof setTimeout>;
  /** Deja el buscador enfocado y avisa que se espera un escaneo (el lector de mano escribe el código y cierra con Enter). */
  esperarLector() {
    this.esperandoLector.set(true); this.buscador?.nativeElement.focus();
    clearTimeout(this.lectorTimer); this.lectorTimer = setTimeout(() => this.esperandoLector.set(false), 12000);
  }
  // --- POS estilo Ventario: recargo, grilla, accesos rápidos, modo rápido y atajos F ---
  readonly ajusteGlobal = signal(0);                       // > 0 descuento, < 0 recargo (se carga al cobrar)
  readonly tipoAjuste = signal<'descuento' | 'recargo'>('descuento');
  readonly catSel = signal('');
  readonly rapidaOn = signal(false);
  readonly lectorActivo = computed(() => !this.cobro() && !this.rapido() && !this.camara() && this.store.canSell());
  totalConAjuste(): number { return r2(this.subtotal() * (1 - this.ajusteGlobal() / 100)); }
  abrirAjuste(tipo: 'descuento' | 'recargo') {
    const a = this.cobro() ? this.cobro().discountPct : this.ajusteGlobal();
    this.tipoAjuste.set(tipo); this.pctTmp = Math.abs(a); this.descGlobal.set(true);
  }
  aplicarAjuste() {
    const v = Math.min(100, Math.max(0, +this.pctTmp || 0)) * (this.tipoAjuste() === 'recargo' ? -1 : 1);
    this.ajusteGlobal.set(v);
    if (this.cobro()) this.cobro().discountPct = v;
    this.descGlobal.set(false);
  }
  readonly catsGrilla = computed(() => { const ids = new Set(this.store.db().products.filter((p) => !p.archived && p.categoryId).map((p) => p.categoryId)); return this.store.categories().filter((c) => ids.has(c.id)); });
  readonly grilla = computed(() => this.store.db().products.filter((p) => !p.archived && (!this.catSel() || p.categoryId === this.catSel())).slice(0, 80));
  /** Ingreso / egreso de caja: con caja abierta abre el formulario; si no, lleva a Cuentas. */
  mov(tipo: 'ingreso' | 'egreso') { if (this.store.openSession()) this.opOpen(tipo); else this.router.navigate(['/cuentas']); }
  cierre() { if (this.store.openSession()) this.cerrarOpen(); else this.decir('✖ No hay una caja abierta para cerrar', false); }
  /** Modo Rápida (F1): F8 guarda al toque en efectivo, pagada y a consumidor final. */
  confirmar() {
    if (!this.cart().length) return;
    if (this.rapidaOn()) { this.guardarRapida(); return; }
    this.abrirCobro();
  }
  private async guardarRapida() {
    try {
      const s = await this.store.registerSale({ customerId: null, lines: this.cart().map((l) => ({ productId: l.productId, qty: l.qty, price: l.price, discountUnit: l.discountUnit })), discountPct: this.ajusteGlobal(), method: 'Efectivo', paid: true, notes: '', invoice: false, budgetId: null, priceListId: this.listaId() });
      this.cart.set([]); this.ajusteGlobal.set(0);
      this.decir(`✔ Venta #${s.number} guardada`, true);
    } catch (e: any) { this.error.set(e.message ?? 'No se pudo guardar la venta'); this.decir('✖ ' + (e.message ?? 'No se pudo guardar la venta'), false); }
  }
  /** Atajos F1/F4/F6/F7/F8 (los llama `atajo`, que es el único oyente de teclado de la ventana). */
  private teclasF(e: KeyboardEvent) {
    const k = e.key;
    if (!/^F(1|4|6|7|8)$/.test(k)) return;
    e.preventDefault();
    if (k === 'F1') this.rapidaOn.set(!this.rapidaOn());
    else if (k === 'F4') this.cierre();
    else if (k === 'F6') this.router.navigate(['/ventas']);
    else if (k === 'F7') this.mov('egreso');
    else if (k === 'F8') this.confirmar();
  }
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

  readonly tour = signal(false);
  readonly pasosTour: TourStep[] = [
    { titulo: 'Caja registradora', texto: 'Tu centro de ventas. Te mostramos las funciones principales en 9 pasos rápidos.' },
    { titulo: 'Buscá o escaneá', texto: 'Escribí el nombre o el código del producto y tocá Enter para agregarlo. Con un lector de mano alcanza con escanear.', selector: '[data-tour=buscar]' },
    { titulo: 'Código de barras con la cámara', texto: 'Tocá el ícono para leer el código con la cámara del celular o la notebook.', selector: '.search-wrap .bc' },
    { titulo: 'Lista de precios', texto: 'Elegí con qué lista se cobra la venta (por ejemplo Mayorista). El carrito se actualiza solo.', selector: '[data-tour=lista]' },
    { titulo: 'El carrito', texto: 'Acá ves lo que vas cargando: cantidades con − / +, descuentos por producto y el total.', selector: '.cash-grid > div:nth-child(2)' },
    { titulo: 'Guardar la venta', texto: 'Cuando el carrito está listo, guardá: elegís cliente, medio de pago, descuento y si emitís factura.', selector: '[data-tour=guardar]' },
    { titulo: 'Promociones', texto: 'Mirá las promociones y combos vigentes para ofrecerlos en el mostrador.', selector: '[data-tour=promos]' },
    { titulo: 'Atajos de teclado', texto: 'Alt+F busca, Alt+S guarda, Alt+M promociones y más. Trabajás sin soltar el teclado.', selector: '[data-tour=atajos]' },
    { titulo: 'Listo para vender', texto: 'Ya conocés lo esencial. Probá hacer tu primera venta. Podés volver a ver este recorrido con el botón «?».' },
  ];
  iniciarTour() { this.tour.set(true); }
  cerrarTour() { this.tour.set(false); try { localStorage.setItem('pos-tour-caja-visto', '1'); } catch { /* sin storage */ } }
  private tourPendiente(): boolean { try { return localStorage.getItem('pos-tour-caja-visto') !== '1'; } catch { return false; } }

  ngOnInit(): void {
    if (this.tourPendiente()) setTimeout(() => { if (this.store.canSell()) this.tour.set(true); }, 1200);   // con la caja cerrada no hay nada que mostrar
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
    this.teclasF(e);
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
    this.aviso.set(msg); this.avisoOk.set(ok); beep(ok); this.esperandoLector.set(false);
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
  precioDe(p: Product): number {
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
    this.cobro.set({ customerId, method: 'Efectivo' as PayMethod, paid: true, discountPct: this.ajusteGlobal(), recibido: null, invoice: false, print: this.store.settings().receiptAction === 'imprimir', gift: false, notes: '' });
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
  /** Vuelto = dinero recibido − total a cobrar (negativo = falta plata). */
  /** Sólo aplica al pago en efectivo: si lo recibido no alcanza, no deja guardar. */
  faltaPlata(c: any): boolean { return c.method === 'Efectivo' && c.paid && +c.recibido > 0 && this.vuelto(c) < 0; }
  vuelto(c: any): number { return r2((+c.recibido || 0) - this.totalCobro(c)); }
  dinero(n: number): string { return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  /** Billetes sugeridos: los más cercanos que alcanzan para pagar el total. */
  billetes(total: number): number[] {
    const den = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    const alcanzan = den.filter((d) => d >= total).slice(0, 3);
    return alcanzan.length ? alcanzan : [Math.ceil(total / 1000) * 1000];
  }
  autoPct(c: any): number { const s = this.store.settings(); return c.method === 'Transferencia' && c.paid && s.transferDiscount > 0 ? s.transferDiscount : 0; }
  totalCobro(c: any): number { const pct = c.discountPct < 0 ? c.discountPct : Math.max(c.discountPct, this.autoPct(c)); return r2(this.subtotal() * (1 - pct / 100)); }
  async guardar(c: any) {
    try {
      const s = await this.store.registerSale({
        customerId: c.customerId, lines: this.cart().map((l) => ({ productId: l.productId, qty: l.qty, price: l.price, discountUnit: l.discountUnit })),
        discountPct: c.discountPct, method: c.method, paid: c.paid, notes: c.notes, invoice: c.invoice, budgetId: this.budgetId, priceListId: this.listaId(),
      });
      const pagoEfectivo = c.method === 'Efectivo' && c.paid && +c.recibido > 0 ? { recibido: +c.recibido, vuelto: r2(+c.recibido - s.total) } : undefined;
      if (pagoEfectivo) this.decir(`✔ Venta #${s.number} guardada · Vuelto ${this.dinero(pagoEfectivo.vuelto)}`, true);
      if (c.print) this.imprimir(s.number, false, pagoEfectivo);
      if (c.gift) this.imprimir(s.number, true);
      this.cobro.set(null); this.cart.set([]); this.budgetId = null; this.ajusteGlobal.set(0);
      if (this.route.snapshot.queryParamMap.get('presupuesto')) this.router.navigate(['/caja']);
    } catch (e: any) { this.error.set(e.message ?? 'No se pudo guardar la venta'); }
  }
  /** Comprobante según los ajustes: formato (A4 / ticket 80 mm / 58 mm) y calidad; `regalo` = ticket de cambio sin precios. */
  private imprimir(n: number, regalo: boolean, pago?: { recibido: number; vuelto: number }) {
    const s = this.store.db().sales.find((x) => x.number === n); if (!s) return;
    const cfg = this.store.settings();
    const ancho = { a4: 794, ticket80: 302, ticket58: 219 }[cfg.receiptFormat] ?? 302;
    const w = window.open('', '_blank', `width=${ancho + 40},height=640`); if (!w) return;
    const peso = cfg.receiptQuality === 'baja' ? 800 : 500, esc = (x: string) => x.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
    const lineas = s.lines.map((l) => regalo ? `${l.qty} x ${esc(l.name)}` : `${l.qty} x ${esc(l.name)}  ${((l.price - l.discountUnit) * l.qty).toFixed(2)}`).join('\n');
    const contacto = [cfg.address, cfg.city, cfg.phone].filter(Boolean).map(esc).join(' · ');
    w.document.write(`<pre style="font-family:monospace;font-weight:${peso};width:${ancho}px;white-space:pre-wrap;margin:0 auto">${esc(cfg.businessName)}${contacto ? '\n' + contacto : ''}\n${regalo ? 'TICKET DE CAMBIO' : 'Venta #' + s.number}${regalo ? '\nVenta #' + s.number : ''}\n${new Date(s.at).toLocaleString('es-AR')}\n----------------\n${lineas}\n----------------\n${regalo ? 'Presentá este cupón para el cambio.' : 'TOTAL ' + s.total.toFixed(2) + '\n' + s.method + (pago ? '\nRECIBIDO ' + pago.recibido.toFixed(2) + '\nVUELTO ' + pago.vuelto.toFixed(2) : '')}</pre>`);
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
