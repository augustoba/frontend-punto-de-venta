import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ModalComponent } from '../../shared/modal.component';
import { FdatePipe, MoneyPipe } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { PartyKind } from '../../core/models';

interface Campo { k: string; label: string; req?: boolean; type?: string; }

const CAMPOS: Record<PartyKind, Campo[]> = {
  customer: [
    { k: 'name', label: 'Nombre', req: true }, { k: 'lastName', label: 'Apellido' }, { k: 'phone', label: 'Teléfono' },
    { k: 'email', label: 'Email' }, { k: 'dni', label: 'DNI' }, { k: 'cuit', label: 'CUIT' }, { k: 'notes', label: 'Notas' },
  ],
  supplier: [
    { k: 'name', label: 'Razón social', req: true }, { k: 'cuit', label: 'CUIT' }, { k: 'trade', label: 'Rubro' },
    { k: 'contact', label: 'Contacto' }, { k: 'phone', label: 'Teléfono' }, { k: 'email', label: 'Email' },
    { k: 'address', label: 'Dirección' }, { k: 'city', label: 'Ciudad' }, { k: 'markup', label: 'Porcentaje de remarcación', type: 'number' }, { k: 'notes', label: 'Notas' },
  ],
};
const TIPOS: Record<PartyKind, { v: string; label: string }[]> = {
  customer: [{ v: 'pago', label: 'Recibir un pago del cliente' }, { v: 'devolucion', label: 'Devolver dinero al cliente' }, { v: 'deuda', label: 'Aumentar deuda' }],
  supplier: [{ v: 'pago', label: 'Pago a proveedor' }, { v: 'compra', label: 'Compra' }, { v: 'nota_credito', label: 'Nota de crédito' }, { v: 'ajuste', label: 'Ajuste de saldo' }],
};
const CHIP: Record<string, [string, string]> = {
  venta: ['Venta', 'b-gray'], pago: ['Pago', 'b-green'], devolucion: ['Devolución', 'b-amber'], deuda: ['Aumento de deuda', 'b-red'],
  compra: ['Compra', 'b-red'], nota_credito: ['Nota de crédito', 'b-green'], ajuste: ['Ajuste', 'b-amber'],
};

/** Clientes y proveedores con cuenta corriente (réplica de Envi). Ver referencia-envi/ANALISIS_cuentas_corrientes.md */
@Component({
  selector: 'app-partes',
  imports: [FormsModule, ModalComponent, MoneyPipe, FdatePipe],
  template: `
    @if (!sel()) {
      <h1>{{ es() ? 'Clientes' : 'Proveedores' }}</h1>
      <p class="sub">{{ es() ? 'Gestioná tus clientes, sus datos y sus deudas.' : 'Controlá quién te abastece, cuánto le debés y cómo viene cada cuenta corriente.' }}</p>
      <div class="kpis k3">
        <div class="kpi"><small>{{ es() ? 'Clientes' : 'Proveedores activos' }}</small><strong>{{ lista().length }}</strong></div>
        <div class="kpi"><small>{{ es() ? 'Saldo a cobrar' : 'Saldo adeudado' }}</small><strong>{{ total() | money }}</strong></div>
        <div class="kpi"><small>Estado de las cuentas</small>
          <div class="bar"><i [style.flex]="alDia()" style="background: var(--success)"></i><i [style.flex]="conDeuda()" style="background: var(--danger)"></i></div>
          <span class="muted">Al día {{ alDia() }} · {{ es() ? 'Saldo a cobrar' : 'Saldo a pagar' }} {{ conDeuda() }}</span></div>
      </div>
      <div class="toolbar">
        <input class="search" placeholder="Buscar..." style="width: 270px" [ngModel]="q()" (ngModelChange)="q.set($event)" /><span class="sp"></span>
        <button (click)="mov(null)">⇄ Registrar movimiento</button>
        <button class="cta" (click)="nuevo()">{{ es() ? 'Nuevo cliente' : 'Crear proveedor' }}</button>
      </div>
      <table>
        <tr><th>{{ es() ? 'Cliente' : 'Proveedor' }}</th><th>Contacto</th><th class="right">Cuenta corriente</th></tr>
        @for (p of filtrada(); track p.id) {
          <tr style="cursor: pointer" (click)="sel.set(p.id)">
            <td><span class="av" [style.background]="'var(--avatar-blue)'">{{ nombre(p)[0] }}</span><b>{{ nombre(p) }}</b></td>
            <td>{{ $any(p).email || $any(p).phone || $any(p).contact }}</td>
            <td class="right" [class]="saldo(p.id) > 0 ? 'right neg' : 'right pos'">{{ saldo(p.id) | money }}</td>
          </tr>
        } @empty { <tr><td colspan="3" class="empty">Todavía no hay {{ es() ? 'clientes' : 'proveedores' }}.</td></tr> }
      </table>
    } @else {
      @if (ficha(); as f) {
        <div class="row" style="margin-bottom: 8px"><button (click)="sel.set('')">‹ Volver</button><span class="grow"></span><button class="cta" (click)="editar(f)">✎ Editar</button></div>
        <div class="row" style="margin-bottom: 12px">
          <span class="av" style="width: 44px; height: 44px; font-size: 18px; background: var(--avatar-blue)">{{ nombre(f)[0] }}</span>
          <div class="grow"><h1 style="font-size: 24px">{{ nombre(f) }}</h1><small class="muted">Alta el {{ f.createdAt | fdate }}</small></div>
          <span class="badge" [class]="'badge ' + (saldo(f.id) > 0 ? 'b-red' : 'b-green')">● {{ saldo(f.id) > 0 ? (es() ? 'Con deuda' : 'Saldo a pagar') : 'Al día' }}</span>
        </div>
        <div class="kpis k3">
          <div class="kpi"><small>{{ es() ? 'Saldo de cuenta' : 'Saldo actual' }}</small><strong [class]="saldo(f.id) > 0 ? 'neg' : 'pos'">{{ saldo(f.id) | money }}</strong></div>
          <div class="kpi"><small>{{ es() ? 'Compras del año' : 'Compras ' + anio }}</small><strong>{{ compras(f.id) | money }}</strong></div>
          <div class="kpi"><small>Última compra</small><strong>{{ ultima(f.id) ? (ultima(f.id) | fdate) : '—' }}</strong></div>
        </div>
        <div class="card" style="margin-bottom: 12px"><b>Datos</b>
          <div class="grid2" style="margin-top: 8px">@for (c of campos(); track c.k) { @if ($any(f)[c.k]) { <div><small class="muted">{{ c.label.toUpperCase() }}</small><br />{{ $any(f)[c.k] }}@if (c.k === 'markup') { % }</div> } }</div></div>
        <div class="row" style="margin-bottom: 8px"><b class="grow">Movimientos de cuenta corriente</b><button class="cta" (click)="mov(f.id)">⇄ Registrar movimiento</button></div>
        <table><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Medio de pago</th><th class="right">Importe</th><th class="right">Saldo</th></tr>
          @for (e of libro(f.id); track e.id) {
            <tr><td>{{ e.at | fdate }}</td><td><span class="badge" [class]="'badge ' + chip(e.kind)[1]">{{ chip(e.kind)[0] }}</span></td><td>{{ e.comment }}</td>
              <td>{{ store.account(e.accountId)?.name || '—' }}</td><td class="right" [class]="e.delta < 0 ? 'right pos' : 'right'">{{ e.delta | money }}</td><td class="right muted">{{ e.saldo | money }}</td></tr>
          } @empty { <tr><td colspan="6" class="empty">No se encontraron movimientos de cuenta corriente</td></tr> }
        </table>
        <p class="right muted">Saldo final <b [class]="saldo(f.id) > 0 ? 'neg' : 'pos'">{{ saldo(f.id) | money }}</b></p>
      }
    }

    @if (form(); as f) {
      <app-modal [title]="(f['id'] ? 'Editar ' : 'Nuevo ') + (es() ? 'cliente' : 'proveedor')" [width]="600" (closed)="form.set(null)">
        <div class="grid2">@for (c of campos(); track c.k) { <div class="field"><label>{{ c.label }}{{ c.req ? '' : ' (opcional)' }}</label><input [type]="c.type || 'text'" [(ngModel)]="f[c.k]" /></div> }</div>
        <div class="mf"><button (click)="form.set(null)">Cancelar</button><button class="cta" [disabled]="!f['name']?.trim()" (click)="guardar(f)">{{ es() ? 'Crear cliente' : 'Guardar cambios' }}</button></div>
      </app-modal>
    }
    @if (movForm(); as m) {
      <app-modal title="Registrar movimiento" [width]="500" (closed)="movForm.set(null)">
        <div class="field"><label>{{ es() ? 'Cliente' : 'Proveedor' }}</label>
          <select [(ngModel)]="m.id">@for (p of lista(); track p.id) { <option [value]="p.id">{{ nombre(p) }}</option> }</select></div>
        @if (m.id) { <p class="muted">Saldo actual: <b>{{ saldo(m.id) | money }}</b></p> }
        <div class="grid2">
          <div class="field"><label>Tipo de movimiento</label><select [(ngModel)]="m.tipo">@for (t of tipos(); track t.v) { <option [value]="t.v">{{ t.label }}</option> }</select></div>
          <div class="field"><label>Monto</label><input type="number" [(ngModel)]="m.monto" /></div>
          @if (usaCuenta(m.tipo)) { <div class="field"><label>Medio de pago (cuenta)</label><select [(ngModel)]="m.cuenta">@for (a of store.accounts(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }</select></div> }
        </div>
        <div class="field" style="margin-top: 8px"><label>Comentario</label><input [(ngModel)]="m.comentario" placeholder="Número de comprobante, observaciones" /></div>
        <p><small class="muted">SALDO TRAS EL MOVIMIENTO</small><br /><b style="font-size: 18px">{{ tras(m) | money }}</b></p>
        <div class="mf"><button (click)="movForm.set(null)">Cancelar</button><button class="cta" [disabled]="!m.id || !(+m.monto > 0)" (click)="confirmar(m)">Confirmar movimiento</button></div>
      </app-modal>
    }
  `,
})
export class PartesComponent {
  readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  readonly kind: PartyKind = this.route.snapshot.routeConfig?.path === 'proveedores' ? 'supplier' : 'customer';
  readonly anio = new Date().getFullYear();
  readonly q = signal('');
  readonly sel = signal('');
  readonly form = signal<any>(null);
  readonly movForm = signal<any>(null);

  es() { return this.kind === 'customer'; }
  campos() { return CAMPOS[this.kind]; }
  tipos() { return TIPOS[this.kind]; }
  chip(k: string) { return CHIP[k] ?? [k, 'b-gray']; }
  usaCuenta(t: string) { return t === 'pago' || (this.es() && t === 'devolucion'); }
  readonly lista = computed<any[]>(() => (this.es() ? this.store.db().customers : this.store.db().suppliers));
  readonly filtrada = computed(() => { const q = this.q().trim().toLowerCase(); return this.lista().filter((p) => !q || this.nombre(p).toLowerCase().includes(q)); });
  readonly ficha = computed(() => this.lista().find((p) => p.id === this.sel()));
  nombre(p: any): string { return this.es() ? `${p.name} ${p.lastName ?? ''}`.trim() : p.name; }
  saldo(id: string): number { this.store.db(); return this.store.partyBalance(this.kind, id); }
  readonly total = computed(() => (this.es() ? this.store.totalReceivable() : this.store.totalPayable()));
  readonly conDeuda = computed(() => this.lista().filter((p) => this.saldo(p.id) > 0).length);
  readonly alDia = computed(() => this.lista().length - this.conDeuda());
  libro(id: string) {
    let acc = 0;
    return this.store.db().party.filter((e) => e.party === this.kind && e.partyId === id).map((e) => ({ ...e, saldo: (acc = r2(acc + e.delta)) })).reverse();
  }
  compras(id: string): number {
    const d = this.store.db();
    return this.es() ? r2(d.sales.filter((s) => s.customerId === id && new Date(s.at).getFullYear() === this.anio).reduce((t, s) => t + s.total, 0))
      : r2(d.purchases.filter((o) => o.supplierId === id && o.status === 'recibido' && new Date(o.createdAt).getFullYear() === this.anio).reduce((t, o) => t + o.total, 0));
  }
  ultima(id: string): string {
    const d = this.store.db();
    const f = this.es() ? d.sales.filter((s) => s.customerId === id).map((s) => s.at) : d.purchases.filter((o) => o.supplierId === id).map((o) => o.createdAt);
    return f.sort().at(-1) ?? '';
  }

  nuevo() { this.form.set(Object.fromEntries(this.campos().map((c) => [c.k, c.type === 'number' ? 0 : '']))); }
  editar(p: any) { this.form.set({ ...p }); }
  guardar(f: any) { if (this.es()) this.store.saveCustomer(f); else this.store.saveSupplier({ ...f, markup: +f.markup || 0 }); this.form.set(null); }
  mov(id: string | null) { this.movForm.set({ id: id ?? this.lista()[0]?.id ?? '', tipo: 'pago', monto: 0, cuenta: this.store.accounts()[0]?.id ?? '', comentario: '' }); }
  tras(m: any): number {
    if (!m.id) return 0; const s = this.saldo(m.id), v = +m.monto || 0;
    const suma = this.es() ? m.tipo !== 'pago' : m.tipo === 'compra' || m.tipo === 'ajuste';
    return r2(suma ? s + v : s - v);
  }
  confirmar(m: any) {
    if (this.es()) this.store.customerMovement(m.id, m.tipo, +m.monto, this.usaCuenta(m.tipo) ? m.cuenta : null, m.comentario);
    else this.store.supplierMovement(m.id, m.tipo, +m.monto, m.tipo === 'pago' ? m.cuenta : null, m.comentario);
    this.movForm.set(null);
  }
}
