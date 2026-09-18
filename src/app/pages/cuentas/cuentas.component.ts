import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../shared/modal.component';
import { AvcolorPipe, FdatePipe, FtimePipe, MoneyPipe, today } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { Allocation } from '../../core/models';

const ALLOC: { v: Allocation; label: string; desc: string }[] = [
  { v: 'iguales', label: 'Partes iguales', desc: 'el total se reparte en partes iguales' },
  { v: 'horas', label: 'Por horas vendidas', desc: 'el total se reparte según las horas vendidas de cada servicio o categoría' },
  { v: 'facturacion', label: 'Por facturación', desc: 'el total se reparte proporcional a lo que facturó cada servicio o categoría en el mes' },
  { v: 'manual', label: 'Porcentajes manuales', desc: 'el total se reparte con los porcentajes que cargues a mano' },
];

/** Cuentas y saldos (tesorería): cuentas, libro de movimientos, cheques y centros de costos. Ver ANALISIS_tesoreria.md */
@Component({
  selector: 'app-cuentas',
  imports: [FormsModule, ModalComponent, MoneyPipe, FdatePipe, FtimePipe, AvcolorPipe],
  template: `
    <h1>Cuentas y saldos</h1>
    <p class="sub">Revisá el dinero disponible por caja y banco, y seguí cada movimiento.</p>

    <div class="kpis c5">
      <div class="kpi ic-cash"><small>Cajas</small><strong>{{ suma('caja') | money }}</strong></div>
      <div class="kpi ic-bank"><small>Bancos</small><strong>{{ suma('banco') | money }}</strong></div>
      <div class="kpi noic"><small>Cuenta corriente</small>
        <div class="kline"><span>A cobrar</span><b class="pos">{{ store.totalReceivable() | money }}</b><i class="fa-solid fa-chevron-right"></i></div>
        <div class="kline"><span>A pagar</span><b class="neg">{{ store.totalPayable() | money }}</b><i class="fa-solid fa-chevron-right"></i></div></div>
      <div class="kpi noic" style="cursor: pointer" (click)="cheques.set(true)"><small>Cheques</small>
        <div class="kline"><span>A cobrar</span><b class="pos">{{ chequesTotal('cobrar') | money }}</b><i class="fa-solid fa-chevron-right"></i></div>
        <div class="kline"><span>A pagar</span><b style="color: var(--accent-amber)">{{ chequesTotal('pagar') | money }}</b><i class="fa-solid fa-chevron-right"></i></div></div>
      <div class="kpi noic"><small>Distribución del saldo</small> <b class="big">{{ suma('caja') + suma('banco') | money }}</b>
        <div class="bar"><i [style.flex]="pos(suma('caja'))" style="background: var(--success)"></i><i [style.flex]="pos(suma('banco'))" style="background: var(--accent-blue)"></i></div>
        <div class="legend"><span><i class="dot" style="background: var(--success)"></i>Cajas {{ porc('caja') }}%</span><span><i class="dot" style="background: var(--accent-blue)"></i>Bancos {{ porc('banco') }}%</span></div></div>
    </div>

    <div class="row" style="justify-content: space-between"><small class="muted">CUENTAS · {{ store.accounts().length }} ACTIVAS</small><button class="cta" (click)="cuentaForm.set({ name: '', type: 'caja', color: '#8fc24a', notes: '', saldo: 0 })"><i class="fa-solid fa-plus"></i>Nueva cuenta</button></div>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 10px 0 16px">
      @for (a of store.accounts(); track a.id) {
        <div class="acct" [class.bank]="a.type === 'banco'">
          <div class="ah"><span class="ai"><i class="fa-solid" [class.fa-money-bill-1]="a.type === 'caja'" [class.fa-building-columns]="a.type === 'banco'"></i></span>{{ a.name }}</div>
          <strong>{{ store.balanceOfAccount(a.id) | money }}</strong>
          <div class="af"><span class="link" (click)="fCuenta.set(a.id)">Ver movimientos</span><span class="link" (click)="editarCuenta(a)">Editar</span></div></div>
      }
    </div>

    <div class="toolbar">
      <input class="search" placeholder="Buscar..." [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <button (click)="filtros.set(!filtros())"><i class="fa-solid fa-filter"></i>Filtrar</button>
      <span class="sp"></span>
      <button class="iconbtn" (click)="refrescar()" title="Actualizar"><i class="fa-solid fa-rotate-right"></i></button>
      <button (click)="centros.set(true)"><i class="fa-solid fa-chart-pie"></i>Centros de costos</button>
      <div class="menu"><button class="cta" (click)="menu.set(!menu())"><i class="fa-solid fa-plus"></i>Crear movimiento</button>
        @if (menu()) { <div class="pop"><button (click)="abrirMov('ingreso')">Registrar ingreso</button><button (click)="abrirMov('egreso')">Registrar egreso</button><button (click)="transf.set({ from: '', to: '', monto: 0, desc: '' }); menu.set(false)">Movimiento entre cuentas</button></div> }</div>
    </div>
    @if (filtros() || fCuenta()) {
      <div class="card filtro-panel"><div class="field"><label>Cuenta</label>
        <select [ngModel]="fCuenta()" (ngModelChange)="fCuenta.set($event)"><option value="">Todas las cuentas</option>@for (a of store.accounts(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }</select></div></div>
    }

    <table>
      <tr><th>Fecha</th><th>Valor</th><th>Categoría</th><th>Cuenta</th><th>Descripción</th><th>Creación</th></tr>
      @for (m of libro(); track m.id) {
        <tr><td><b>{{ m.at | fdate }}</b><br /><small class="muted">{{ m.at | ftime }}</small></td>
          <td [class]="m.amount >= 0 ? 'pos' : 'neg'"><b>{{ m.amount >= 0 ? '+ ' : '− ' }}{{ abs(m.amount) | money }}</b></td>
          <td><span class="catbadge" [style.background]="colorCat(m.category)">{{ emojiCat(m.category) }} {{ m.subcategory || m.category }}</span></td>
          <td><b>{{ store.account(m.accountId)?.name }}</b></td><td>{{ m.description }}</td><td><span class="av" [style.background]="m.user | avcolor">{{ m.user[0] }}</span><b>{{ m.user }}</b></td></tr>
      } @empty { <tr><td colspan="6" class="empty">No hay movimientos todavía.</td></tr> }
    </table>
    <div class="pager"><span>Mostrando {{ libro().length }} de {{ store.db().movements.length }}</span></div>

    @if (cuentaForm(); as a) {
      <app-modal [title]="a['id'] ? 'Editar cuenta' : 'Crear cuenta'" [width]="480" (closed)="cuentaForm.set(null)">
        @if (!a['id']) { <div class="field"><label>Saldo inicial</label><input type="number" [(ngModel)]="a['saldo']" /></div> }
        <div class="grid2" style="margin-top: 8px"><div class="field"><label>Nombre de la cuenta</label><input [(ngModel)]="a['name']" /></div>
          <div class="field"><label>Tipo de cuenta</label><select [(ngModel)]="a['type']"><option value="caja">Caja</option><option value="banco">Banco</option></select></div></div>
        <div class="field" style="margin-top: 8px"><label>Notas internas</label><input [(ngModel)]="a['notes']" placeholder="Quién la usa, en qué sucursal, restricciones…" /></div>
        <div class="mf"><button (click)="cuentaForm.set(null)">Cancelar</button><button class="cta" [disabled]="!a['name']?.trim()" (click)="guardarCuenta(a)">Aceptar</button></div>
      </app-modal>
    }
    @if (mov(); as m) {
      <app-modal title="Nuevo movimiento" [width]="500" (closed)="mov.set(null)">
        <p class="note" [class.bad]="m.tipo === 'egreso'" [class.ok]="m.tipo === 'ingreso'" style="text-align: center">{{ m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso' }}</p>
        <div class="grid2"><div class="field"><label>Cuenta</label><select [(ngModel)]="m.cuenta">@for (a of store.accounts(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }</select></div>
          <div class="field"><label>Importe</label><input type="number" [(ngModel)]="m.monto" /></div>
          <div class="field"><label>Fecha del movimiento</label><input type="datetime-local" [(ngModel)]="m.fecha" /></div></div>
        <p class="muted">Nuevo total en la cuenta: <b>{{ nuevoTotal(m) | money }}</b></p>
        <div class="grid2"><div class="field"><label>Categoría</label><select [(ngModel)]="m.cat" (ngModelChange)="m.sub = ''"><option value="">—</option>@for (c of store.categories(); track c.id) { <option [value]="c.name">{{ c.name }}</option> }</select></div>
          <div class="field"><label>Subcategoría</label><select [(ngModel)]="m.sub"><option value="">—</option>@for (s of subs(m.cat); track s) { <option [value]="s">{{ s }}</option> }</select></div></div>
        <div class="field" style="margin-top: 8px"><label>Descripción</label><input [(ngModel)]="m.desc" /></div>
        <div class="mf"><button (click)="mov.set(null)">Cancelar</button><button class="cta" [disabled]="!(+m.monto > 0) || !m.cat || (subs(m.cat).length > 0 && !m.sub)" (click)="guardarMov(m)">Aceptar</button></div>
      </app-modal>
    }
    @if (transf(); as t) {
      <app-modal title="Movimiento entre cuentas" [width]="460" (closed)="transf.set(null)">
        <div class="grid2"><div class="field"><label>Cuenta origen</label><select [(ngModel)]="t.from"><option value="">—</option>@for (a of store.accounts(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }</select></div>
          <div class="field"><label>Importe</label><input type="number" [(ngModel)]="t.monto" /></div></div>
        @if (t.from) { <span class="badge b-gray">Nuevo valor: {{ store.balanceOfAccount(t.from) - (+t.monto || 0) | money }}</span> }
        <div class="field" style="margin-top: 8px"><label>Cuenta destino</label><select [(ngModel)]="t.to"><option value="">—</option>@for (a of store.accounts(); track a.id) { @if (a.id !== t.from) { <option [value]="a.id">{{ a.name }}</option> } }</select></div>
        <div class="field" style="margin-top: 8px"><label>Descripción (opcional)</label><input [(ngModel)]="t.desc" /></div>
        <div class="mf"><button (click)="transf.set(null)">Cancelar</button><button class="cta" [disabled]="!t.from || !t.to || !(+t.monto > 0)" (click)="store.transfer(t.from, t.to, +t.monto, t.desc); transf.set(null)">Aceptar</button></div>
      </app-modal>
    }

    @if (cheques()) {
      <app-modal title="Cheques" [width]="760" (closed)="cheques.set(false)">
        <div class="toolbar"><span class="badge b-green">TOTAL A {{ tab() === 'cobrar' ? 'COBRAR' : 'PAGAR' }} {{ chequesTotal(tab()) | money }}</span><span class="sp"></span><button (click)="resumen.set(true)">≡ Resumen</button><button class="cta" (click)="chequeForm.set({ kind: tab(), amount: 0, due: '', description: '', customerId: null })">+ Nuevo cheque</button></div>
        <p><span class="badge" [class]="'badge ' + (tab() === 'pagar' ? 'sel' : 'b-gray')" style="cursor: pointer" (click)="tab.set('pagar')">A pagar</span> <span class="badge" [class]="'badge ' + (tab() === 'cobrar' ? 'sel' : 'b-gray')" style="cursor: pointer" (click)="tab.set('cobrar')">A cobrar</span></p>
        <table style="background: none"><tr><th>Vencimiento</th><th>Valor</th><th>Cobrado</th><th>Número</th><th>Cliente del local</th><th></th></tr>
          @for (c of chequesTab(); track c.id) {
            <tr><td>{{ c.due | fdate }}</td><td>{{ c.amount | money }}</td>
              <td><span class="sw" [class.on]="c.collected" (click)="store.saveCheque({ id: c.id, kind: c.kind, amount: c.amount, due: c.due, collected: !c.collected })"></span> <span class="badge" [class]="'badge ' + (c.collected ? 'b-green' : 'b-red')">{{ c.collected ? 'Sí' : 'No' }}</span></td>
              <td class="muted">{{ c.number }}</td><td>{{ c.customerId ? store.customerName(c.customerId) : 'Sin definir' }}</td><td><span class="link" (click)="editarCheque(c)">✎</span> <span class="link neg" (click)="store.deleteCheque(c.id)">🗑</span></td></tr>
          } @empty { <tr><td colspan="6" class="empty">No hay cheques.</td></tr> }
        </table>
      </app-modal>
    }
    @if (chequeForm(); as c) {
      <app-modal [title]="c['id'] ? 'Editar cheque' : 'Crear cheque'" [width]="460" (closed)="chequeForm.set(null)">
        <p><span class="badge" [class]="'badge ' + (c['kind'] === 'pagar' ? 'sel' : 'b-gray')" style="cursor: pointer" (click)="c['kind'] = 'pagar'">A pagar</span> <span class="badge" [class]="'badge ' + (c['kind'] === 'cobrar' ? 'sel' : 'b-gray')" style="cursor: pointer" (click)="c['kind'] = 'cobrar'">A cobrar</span></p>
        <div class="grid2"><div class="field"><label>Valor</label><input type="number" [(ngModel)]="c['amount']" /></div><div class="field"><label>Vencimiento (obligatorio)</label><input type="date" [(ngModel)]="c['due']" /></div></div>
        <div class="field" style="margin-top: 8px"><label>Descripción</label><input [(ngModel)]="c['description']" /></div>
        <div class="field" style="margin-top: 8px"><label>Cliente</label><select [(ngModel)]="c['customerId']"><option [ngValue]="null">Sin definir</option>@for (cl of store.customers(); track cl.id) { <option [ngValue]="cl.id">{{ cl.name }} {{ cl.lastName }}</option> }</select></div>
        <div class="mf"><button (click)="chequeForm.set(null)">Cancelar</button><button class="cta" [disabled]="!(+c['amount'] > 0) || !c['due']" (click)="guardarCheque(c)">Aceptar</button></div>
      </app-modal>
    }
    @if (resumen()) {
      <app-modal title="Resumen de cheques" [width]="720" (closed)="resumen.set(false)">
        <p class="right"><span class="badge b-red">Balance del año {{ balanceCheques() | money }}</span></p>
        <div class="grid2">
          <div class="card"><b>Cheques recibidos</b> <span class="badge b-green" style="float: right">Pendiente de cobro {{ chequesTotal('cobrar') | money }}</span>
            <table style="background: none"><tr><th>Pendiente</th><th>Total</th><th>Mes</th></tr>@for (r of porMes('cobrar'); track r.mes) { <tr><td>{{ r.pend | money }}</td><td>{{ r.total | money }}</td><td>{{ r.mes }}</td></tr> }</table></div>
          <div class="card"><b>Cheques entregados</b> <span class="badge b-red" style="float: right">Pendiente de pago {{ chequesTotal('pagar') | money }}</span>
            <table style="background: none"><tr><th>Pendiente</th><th>Total</th><th>Mes</th></tr>@for (r of porMes('pagar'); track r.mes) { <tr><td>{{ r.pend | money }}</td><td>{{ r.total | money }}</td><td>{{ r.mes }}</td></tr> }</table></div>
        </div>
      </app-modal>
    }

    @if (centros()) {
      <app-modal title="Centros de costos" [width]="720" (closed)="centros.set(false)">
        <p class="muted">Agrupá tus costos fijos (alquiler, sueldos, luz) y elegí cómo se reparten entre tus servicios y categorías de productos para conocer la rentabilidad real de cada uno.</p>
        <div class="row" style="margin-bottom: 10px"><input class="grow" placeholder="Nombre del centro de costos" [(ngModel)]="ccNombre" />
          <select [(ngModel)]="ccAlloc">@for (a of alloc; track a.v) { <option [value]="a.v">{{ a.label }}</option> }</select>
          <button class="cta" [disabled]="!ccNombre.trim()" (click)="store.saveCostCenter(ccNombre.trim(), ccAlloc); ccNombre = ''">+ Nuevo centro de costos</button></div>
        @for (c of store.db().costCenters; track c.id) {
          <div class="card" style="margin-bottom: 10px"><div class="row"><b class="grow" style="font-size: 16px">{{ c.name }}</b><span>Total mensual: <b>{{ total(c.id) | money }}</b></span><span class="link neg" (click)="store.deleteCostCenter(c.id)">🗑</span></div>
            <small class="muted"><b>{{ desc(c.allocation).label }}</b> — {{ desc(c.allocation).desc }}</small>
            <table style="background: none"><tr><th>Nombre</th><th>Notas</th><th class="right">Monto mensual</th><th></th></tr>
              @for (f of c.costs; track f.id) { <tr><td>{{ f.name }}</td><td>{{ f.notes }}</td><td class="right">{{ f.monthly | money }}</td><td><span class="link neg" (click)="store.deleteFixedCost(c.id, f.id)">🗑</span></td></tr> }
            </table>
            <div class="row"><input class="grow" placeholder="Nuevo costo fijo (nombre)" [(ngModel)]="fcNombre[c.id]" /><input type="number" style="width: 130px" placeholder="Monto" [(ngModel)]="fcMonto[c.id]" />
              <button [disabled]="!(fcNombre[c.id] || '').trim() || !(+fcMonto[c.id] > 0)" (click)="store.addFixedCost(c.id, fcNombre[c.id], +fcMonto[c.id], ''); fcNombre[c.id] = ''; fcMonto[c.id] = 0">+ Nuevo costo fijo</button></div></div>
        } @empty { <p class="empty">Todavía no tenés centros de costos.</p> }
      </app-modal>
    }
  `,
})
export class CuentasComponent {
  readonly store = inject(Store);
  readonly alloc = ALLOC;
  abs = Math.abs;
  readonly filtros = signal(false);
  refrescar() { if (this.store.remote()) this.store.sync(); }
  private catDe(nombre: string) { return this.store.categories().find((c) => c.name === nombre); }
  emojiCat(nombre: string) { return this.catDe(nombre)?.emoji ?? ''; }
  colorCat(nombre: string) { const c = this.catDe(nombre)?.color; return c && /^#[0-9a-f]{6}$/i.test(c) ? c + '33' : 'rgba(240,200,150,.4)'; }
  readonly q = signal(''); readonly fCuenta = signal('');
  readonly menu = signal(false);
  readonly cuentaForm = signal<any>(null); readonly mov = signal<any>(null); readonly transf = signal<any>(null);
  readonly cheques = signal(false); readonly resumen = signal(false); readonly tab = signal<'cobrar' | 'pagar'>('cobrar');
  readonly chequeForm = signal<any>(null); readonly centros = signal(false);
  ccNombre = ''; ccAlloc: Allocation = 'horas'; fcNombre: Record<string, string> = {}; fcMonto: Record<string, number> = {};

  suma(t: 'caja' | 'banco'): number { return r2(this.store.accounts().filter((a) => a.type === t).reduce((s, a) => s + this.store.balanceOfAccount(a.id), 0)); }
  pos(n: number) { return Math.max(0, n); }
  porc(t: 'caja' | 'banco'): number { const tot = this.pos(this.suma('caja')) + this.pos(this.suma('banco')); return tot ? Math.round((this.pos(this.suma(t)) / tot) * 100) : 0; }
  readonly libro = computed(() => {
    const q = this.q().trim().toLowerCase();
    return [...this.store.db().movements].reverse().filter((m) => (!this.fCuenta() || m.accountId === this.fCuenta()) && (!q || (m.description + m.category + m.subcategory).toLowerCase().includes(q)));
  });
  subs(cat: string): string[] { return this.store.categories().find((c) => c.name === cat)?.subs.map((s) => s.name) ?? []; }
  desc(a: Allocation) { return ALLOC.find((x) => x.v === a)!; }
  total(id: string): number { return r2((this.store.db().costCenters.find((c) => c.id === id)?.costs ?? []).reduce((s, f) => s + f.monthly, 0)); }

  editarCuenta(a: any) { this.cuentaForm.set({ ...a }); }
  editarCheque(c: any) { this.chequeForm.set({ ...c }); }
  guardarCuenta(a: any) { const { saldo, ...resto } = a; this.store.saveAccount(resto, +saldo || 0); this.cuentaForm.set(null); }
  abrirMov(tipo: 'ingreso' | 'egreso') { this.menu.set(false); this.mov.set({ tipo, cuenta: this.store.accounts()[0]?.id ?? '', monto: 0, fecha: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), cat: '', sub: '', desc: '' }); }
  nuevoTotal(m: any): number { return r2(this.store.balanceOfAccount(m.cuenta) + (m.tipo === 'ingreso' ? 1 : -1) * (+m.monto || 0)); }
  guardarMov(m: any) {
    this.store.addMovement({ accountId: m.cuenta, amount: m.tipo === 'ingreso' ? +m.monto : -m.monto, category: m.cat, subcategory: m.sub, description: m.desc, at: new Date(m.fecha).toISOString() });
    this.mov.set(null);
  }

  chequesTotal(k: 'cobrar' | 'pagar'): number { return r2(this.store.db().cheques.filter((c) => c.kind === k && !c.collected).reduce((s, c) => s + c.amount, 0)); }
  readonly chequesTab = computed(() => this.store.db().cheques.filter((c) => c.kind === this.tab()).sort((a, b) => a.due.localeCompare(b.due)));
  guardarCheque(c: any) { this.store.saveCheque({ ...c, amount: +c.amount, due: c.due.slice(0, 10) }); this.chequeForm.set(null); }
  porMes(k: 'cobrar' | 'pagar') {
    const meses = new Map<string, { total: number; pend: number }>();
    this.store.db().cheques.filter((c) => c.kind === k).forEach((c) => {
      const mes = new Date(c.due).toLocaleDateString('es-AR', { month: 'long', timeZone: 'UTC' });
      const x = meses.get(mes) ?? { total: 0, pend: 0 }; x.total += c.amount; if (!c.collected) x.pend += c.amount; meses.set(mes, x);
    });
    return [...meses].map(([mes, v]) => ({ mes, total: r2(v.total), pend: r2(v.pend) }));
  }
  balanceCheques(): number { return r2(this.chequesTotal('cobrar') - this.chequesTotal('pagar')); }
}
