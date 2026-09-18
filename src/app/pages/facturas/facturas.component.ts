import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../shared/modal.component';
import { AvcolorPipe, FdatePipe, FtimePipe, MoneyPipe } from '../../shared/format';
import { Store, r2 } from '../../core/store';

/** Facturas (réplica de Envi /invoices). Sin emisión fiscal: comprobantes de prueba sin validez fiscal. */
@Component({
  selector: 'app-facturas',
  imports: [FormsModule, ModalComponent, MoneyPipe, FdatePipe, FtimePipe, AvcolorPipe],
  template: `
    @if (aviso()) {
      <div class="banner-warn"><span>Emisión fiscal no activada. Emitís solo facturas de prueba sin valor fiscal.</span><button class="x" (click)="aviso.set(false)" aria-label="Cerrar">✕</button></div>
    }
    <div class="row between" style="align-items: flex-start"><div><h1>Facturas</h1>
      <p class="sub">Emití y consultá las facturas de tu negocio.</p></div>
      <span class="pill-green">Facturas de prueba sin límite</span></div>
    <small class="muted">FACTURAS DE HOY</small>
    <div class="kpis k3" style="margin-top: 6px">
      <div class="kpi ic-receipt"><small>Facturas emitidas</small><strong>{{ hoy().length }}</strong><br /><span class="muted">Hoy</span></div>
      <div class="kpi ic-dollar"><small>Monto facturado</small><strong>{{ montoHoy() | money }}</strong><br /><span class="muted">Hoy</span></div>
      <div class="kpi"><small>Facturas por emisor <span style="float: right">{{ store.db().invoices.length }} {{ store.db().invoices.length === 1 ? 'factura' : 'facturas' }}</span></small>
        <div class="bar"><i style="flex: 1; background: var(--accent-blue)"></i></div>
        <div class="legend"><span><i class="dot" style="background: var(--accent-blue)"></i>{{ emisor() }} 100%</span></div></div>
    </div>
    <div class="toolbar"><input class="search" placeholder="Buscar..." [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <button><i class="fa-solid fa-filter"></i>Filtrar</button><span class="sp"></span>
      <button class="iconbtn" (click)="refrescar()" title="Actualizar"><i class="fa-solid fa-rotate-right"></i></button>
      <button class="cta" (click)="nueva()"><i class="fa-solid fa-plus"></i>Nueva factura</button></div>
    <table>
      <tr><th>Fecha de emisión</th><th>Emisor</th><th>Creado por</th><th>Cliente</th><th class="right">Valor</th><th>Detalles</th><th></th></tr>
      @for (f of lista(); track f.id) {
        <tr><td><b>{{ f.at | fdate }}</b><br /><small class="muted">{{ f.at | ftime }}</small></td>
          <td><b>{{ emisor() }}</b><br /><small class="muted">Emisión de prueba</small></td>
          <td>@if (f.user) { <span class="av" [style.background]="f.user | avcolor">{{ f.user[0] }}</span><b>{{ f.user }}</b> } @else { <span class="muted">—</span> }</td>
          <td><span class="av round" style="background: var(--avatar-gray)"><i class="fa-solid fa-user" style="margin: 0; font-size: 11px"></i></span>{{ store.customerName(f.customerId) }}</td>
          <td class="right"><b>{{ f.total | money }}</b></td>
          <td><b>Factura C</b> <span class="badge b-amber">De prueba</span><br /><small class="muted">N° {{ f.number }}</small></td>
          <td class="right"><span class="link" (click)="imprimir(f)" title="Imprimir"><i class="fa-solid fa-print" style="margin: 0"></i></span></td></tr>
      } @empty { <tr><td colspan="7" class="empty">Todavía no emitiste facturas.</td></tr> }
    </table>

    @if (form(); as f) {
      <app-modal title="Generar factura de prueba" [width]="720" (closed)="form.set(null)">
        <p class="note warn">▲ Esta es una factura de demostración. No tiene ningún tipo de validez fiscal.</p>
        <div class="grid2"><div><b>Datos del comprador</b><div class="field"><label>Cliente</label><select [(ngModel)]="f['customerId']"><option [ngValue]="null">- Consumidor final -</option>@for (c of store.customers(); track c.id) { <option [ngValue]="c.id">{{ c.name }} {{ c.lastName }}</option> }</select></div></div>
          <div><b>Comprobante</b><div class="field"><label>Tipo de factura</label><input value="Factura C" disabled /></div></div></div>
        <b>Items a facturar</b>
        <table style="background: none"><tr><th>Cant.</th><th>Descripción</th><th>Precio un. con IVA</th><th>IVA</th><th class="right">Importe</th><th></th></tr>
          @for (i of f['items']; track $index) { <tr><td><input type="number" min="1" style="width: 60px" [(ngModel)]="i.qty" /></td><td><input [(ngModel)]="i.desc" placeholder="Producto o servicio" /></td><td><input type="number" style="width: 110px" [(ngModel)]="i.price" /></td><td>21 %</td><td class="right">{{ i.qty * i.price | money }}</td><td><span class="link neg" (click)="f['items'].splice($index, 1)">🗑</span></td></tr> }</table>
        <button (click)="f['items'].push({ qty: 1, desc: '', price: 0 })">+ Agregar ítem</button>
        <div class="card" style="margin-top: 8px"><table style="background: none"><tr><td>Subtotal</td><td class="right">{{ neto(f) | money }}</td></tr><tr><td>IVA</td><td class="right">{{ total(f) - neto(f) | money }}</td></tr><tr><td><b>Total</b></td><td class="right"><b>{{ total(f) | money }}</b></td></tr></table></div>
        <div class="mf"><button (click)="form.set(null)">Cancelar</button><button class="cta" [disabled]="!(total(f) > 0)" (click)="generar(f)">Generar factura</button></div>
      </app-modal>
    }
  `,
})
export class FacturasComponent {
  readonly store = inject(Store);
  readonly aviso = signal(true);
  emisor() { return this.store.settings().businessName || 'Mi negocio'; }
  refrescar() { if (this.store.remote()) this.store.sync(); }
  readonly q = signal(''); readonly form = signal<any>(null);
  private esHoy(iso: string) { return iso.slice(0, 10) === new Date().toISOString().slice(0, 10); }
  readonly hoy = computed(() => this.store.db().invoices.filter((f) => this.esHoy(f.at)));
  readonly montoHoy = computed(() => r2(this.hoy().reduce((s, f) => s + f.total, 0)));
  readonly lista = computed(() => { const q = this.q().trim().toLowerCase(); return [...this.store.db().invoices].reverse().filter((f) => !q || (f.number + this.store.customerName(f.customerId)).toLowerCase().includes(q)); });
  nueva() { this.form.set({ customerId: null, items: [{ qty: 1, desc: '', price: 0 }] }); }
  total(f: any): number { return r2(f.items.reduce((s: number, i: any) => s + (+i.qty || 0) * (+i.price || 0), 0)); }
  neto(f: any): number { return r2(this.total(f) / 1.21); }
  generar(f: any) { this.store.createInvoice(f.customerId, f.items.map((i: any) => i.desc).filter(Boolean).join(', '), this.total(f)); this.form.set(null); }
  imprimir(f: any) { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<pre style="font-family:sans-serif">FACTURA C (DE PRUEBA)\nN° ${f.number}\n${f.items}\nNeto ${f.net}  IVA ${f.iva}\nTOTAL ${f.total}\nSin validez fiscal</pre>`); w.document.close(); w.print(); }
}
