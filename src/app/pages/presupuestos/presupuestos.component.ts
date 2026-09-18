import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalComponent } from '../../shared/modal.component';
import { FdatePipe, MoneyPipe } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { Budget, BudgetLine } from '../../core/models';

/** Presupuestos (réplica de Envi /budgets): se convierten en venta desde la caja. Ver ANALISIS_presupuestos_descuentos.md */
@Component({
  selector: 'app-presupuestos',
  imports: [FormsModule, ModalComponent, MoneyPipe, FdatePipe],
  template: `
    <h1>Presupuestos</h1>
    <p class="sub">Armá presupuestos y convertilos en ventas.</p>
    <small class="muted">PRESUPUESTOS DE ESTE MES</small>
    <div class="kpis k3" style="margin-top: 6px">
      <div class="kpi"><small>Presupuestos activos</small><strong>{{ cuenta('activo', false) }}</strong><br /><span class="muted">Este mes</span></div>
      <div class="kpi"><small>Presupuestos vencidos</small><strong>{{ cuenta('activo', true) }}</strong><br /><span class="muted">Este mes</span></div>
      <div class="kpi"><small>Monto total presupuestado</small> <b style="float: right; font-size: 20px">{{ montoTotal() | money }}</b>
        <div class="bar"><i [style.flex]="cuenta('activo', false)" style="background: var(--accent-blue)"></i><i [style.flex]="cuenta('vendido')" style="background: var(--success)"></i></div>
        <span class="muted">Activos {{ cuenta('activo', false) }} · Vendidos {{ cuenta('vendido') }}</span></div>
    </div>
    <div class="toolbar"><input placeholder="🔍 Buscar..." style="width: 270px" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <select [ngModel]="estado()" (ngModelChange)="estado.set($event)"><option value="activo">Activos</option><option value="vendido">Vendidos</option><option value="rechazado">Rechazados</option><option value="archivado">Archivados</option><option value="">Todos</option></select>
      <span class="sp"></span><button class="cta" (click)="nuevo()">+ Nuevo presupuesto</button></div>
    <table>
      <tr><th>Fecha</th><th>Cliente</th><th class="right">Total</th><th>Detalle</th><th>Vencimiento</th><th>Estado</th><th></th></tr>
      @for (b of lista(); track b.id) {
        <tr><td><b>{{ b.createdAt | fdate }}</b></td><td>{{ store.customerName(b.customerId) }}</td><td class="right">{{ b.total | money }}</td><td>{{ b.lines.length }} prod.</td><td>{{ b.expires | fdate }}</td>
          <td><span class="badge" [class]="'badge ' + clase(b)">{{ etiqueta(b) }}</span></td>
          <td class="right"><div class="menu"><button class="x" (click)="menu.set(menu() === b.id ? '' : b.id)">⋮</button>
            @if (menu() === b.id) { <div class="pop"><button (click)="editar(b); menu.set('')">Editar</button><button (click)="imprimir(b); menu.set('')">Imprimir</button><button (click)="duplicar(b); menu.set('')">Duplicar</button>
              @if (b.status === 'activo') { <button (click)="convertir(b)">Convertir a venta</button><button (click)="store.setBudgetStatus(b.id, 'rechazado'); menu.set('')">Rechazar presupuesto</button> }
              <button (click)="store.setBudgetStatus(b.id, 'archivado'); menu.set('')">Archivar</button><button class="danger" (click)="store.deleteBudget(b.id); menu.set('')">Eliminar</button></div> }</div></td></tr>
      } @empty { <tr><td colspan="7" class="empty">No se encontraron presupuestos</td></tr> }
    </table>

    @if (form(); as f) {
      <app-modal [title]="f['id'] ? 'Editar presupuesto' : 'Nuevo presupuesto'" [width]="680" (closed)="form.set(null)">
        <div class="grid2"><div class="field"><label>Cliente</label><select [(ngModel)]="f['customerId']"><option [ngValue]="null">Consumidor final</option>@for (c of store.customers(); track c.id) { <option [ngValue]="c.id">{{ c.name }} {{ c.lastName }}</option> }</select></div>
          <div class="field"><label>Fecha de expiración</label><input type="date" [(ngModel)]="f['expires']" /></div></div>
        <p><b>Productos</b></p>
        <table style="background: none"><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th class="right">Subtotal</th><th></th></tr>
          @for (l of f['lines']; track $index) { <tr><td>{{ l.name }}</td><td>{{ l.price | money }}</td><td><input type="number" min="1" style="width: 70px" [(ngModel)]="l.qty" /></td><td class="right">{{ l.qty * l.price | money }}</td><td><span class="link neg" (click)="f['lines'].splice($index, 1)">🗑</span></td></tr> }</table>
        <div class="row" style="margin-top: 8px"><select class="grow" [(ngModel)]="agregarId"><option value="">+ Agregar producto…</option>@for (p of store.db().products; track p.id) { @if (!p.archived) { <option [value]="p.id">{{ p.name }} — {{ p.price | money }}</option> } }</select>
          <button [disabled]="!agregarId" (click)="agregar(f)">Agregar</button></div>
        <div class="field" style="margin-top: 8px"><label>Notas</label><input [(ngModel)]="f['notes']" placeholder="Condiciones de entrega, validez de precios, forma de pago" /></div>
        <div class="card" style="margin-top: 8px"><table style="background: none"><tr><td>Subtotal</td><td class="right">{{ neto(f) | money }}</td></tr><tr><td>IVA (21%)</td><td class="right">{{ total(f) - neto(f) | money }}</td></tr><tr><td><b>Total</b></td><td class="right"><b>{{ total(f) | money }}</b></td></tr></table></div>
        <p class="muted">Se guarda como borrador hasta que lo envíes.</p>
        <div class="mf"><button (click)="form.set(null)">Cancelar</button><button class="cta" [disabled]="!f['lines'].length" (click)="guardar(f)">{{ f['id'] ? 'Guardar' : 'Crear presupuesto' }}</button></div>
      </app-modal>
    }
  `,
})
export class PresupuestosComponent {
  readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly q = signal(''); readonly estado = signal('activo'); readonly menu = signal(''); readonly form = signal<any>(null);
  agregarId = '';

  private vencido(b: Budget) { return b.status === 'activo' && b.expires.slice(0, 10) < new Date().toISOString().slice(0, 10); }
  cuenta(s: string, vencidos?: boolean) { return this.store.db().budgets.filter((b) => b.status === s && (vencidos === undefined || this.vencido(b) === vencidos)).length; }
  montoTotal() { return r2(this.store.db().budgets.filter((b) => b.status === 'activo' || b.status === 'vendido').reduce((s, b) => s + b.total, 0)); }
  readonly lista = computed(() => {
    const q = this.q().trim().toLowerCase();
    return [...this.store.db().budgets].reverse().filter((b) => (!this.estado() || b.status === this.estado()) && (!q || this.store.customerName(b.customerId).toLowerCase().includes(q)));
  });
  clase(b: Budget) { return this.vencido(b) ? 'b-red' : { activo: 'b-blue', vendido: 'b-green', rechazado: 'b-red', archivado: 'b-gray' }[b.status]; }
  etiqueta(b: Budget) { return this.vencido(b) ? 'Vencido' : { activo: 'Activo', vendido: 'Vendido', rechazado: 'Rechazado', archivado: 'Archivado' }[b.status]; }

  nuevo() { const e = new Date(); e.setDate(e.getDate() + 30); this.form.set({ customerId: null, expires: e.toISOString().slice(0, 10), lines: [] as BudgetLine[], notes: '' }); }
  editar(b: Budget) { this.form.set({ id: b.id, customerId: b.customerId, expires: b.expires.slice(0, 10), lines: b.lines.map((l) => ({ ...l })), notes: b.notes }); }
  duplicar(b: Budget) { this.store.saveBudget(null, b.customerId, b.expires, b.lines.map((l) => ({ ...l })), b.notes); }
  agregar(f: any) {
    const p = this.store.product(this.agregarId)!; const ex = f.lines.find((l: BudgetLine) => l.productId === p.id);
    if (ex) ex.qty++; else f.lines.push({ productId: p.id, name: p.name, qty: 1, price: p.offer > 0 ? p.offer : p.price });
    this.agregarId = '';
  }
  total(f: any): number { return r2(f.lines.reduce((s: number, l: BudgetLine) => s + l.qty * l.price, 0)); }
  neto(f: any): number { return r2(this.total(f) / 1.21); }
  guardar(f: any) { this.store.saveBudget(f.id ?? null, f.customerId, f.expires, f.lines, f.notes); this.form.set(null); }
  convertir(b: Budget) { this.menu.set(''); this.router.navigate(['/caja'], { queryParams: { presupuesto: b.id } }); }
  imprimir(b: Budget) {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<pre style="font-family:sans-serif">Presupuesto #${b.number}\nCliente: ${this.store.customerName(b.customerId)}\nVence: ${b.expires.slice(0, 10)}\n\n${b.lines.map((l) => `${l.qty} x ${l.name}  $${l.qty * l.price}`).join('\n')}\n\nTotal: $${b.total}\n${b.notes}</pre>`);
    w.document.close(); w.print();
  }
}
