import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MoneyPipe } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { Sale } from '../../core/models';

type Tab = 'ventas' | 'tesoreria' | 'stock' | 'productos' | 'clientes' | 'rentabilidad';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const COLOR: Record<string, string> = { Efectivo: '#1f9d55', Transferencia: '#1a1a9c', Tarjeta: '#f79d16', 'Cuenta corriente': '#a267ac' };
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const ymd = (iso: string) => iso.slice(0, 10);

/** Reportes (réplica de Envi): Ventas, Tesorería, Stock, Productos, Clientes y Rentabilidad. */
@Component({
  selector: 'app-reportes',
  imports: [FormsModule, MoneyPipe],
  template: `
    <h1>Reportes</h1>
    <p class="sub">Analizá el rendimiento de tu negocio con reportes.</p>
    <div class="tabs">
      @for (t of tabs; track t.id) { <span [class.on]="tab() === t.id" style="cursor: pointer" (click)="tab.set(t.id)">{{ t.label }}</span> }
    </div>

    @switch (tab()) {
      @case ('ventas') {
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px">
          <div class="card"><b>Ventas por medio de pago</b>
            <div class="row" style="margin: 6px 0"><button style="height: 28px" (click)="dia.set(dia() - 1)">←</button><span>{{ fechaDia() }}</span><button style="height: 28px" (click)="dia.set(dia() + 1)">→</button>
              <span class="grow"></span><label class="row"><input type="checkbox" style="height: auto" [ngModel]="soloCobradas()" (ngModelChange)="soloCobradas.set($event)" /> Sólo los cobrados</label></div>
            <p><b>Total:</b> {{ totalDia() | money }} · ({{ ventasDia().length }} {{ ventasDia().length === 1 ? 'venta' : 'ventas' }})</p>
            @if (ventasDia().length) { <div style="width: 160px; height: 160px; border-radius: 50%; margin: 10px auto" [style.background]="torta()"></div> } @else { <p class="empty">Sin ventas para este día.</p> }
            <p class="right muted">Promedio por venta <b>{{ promedioDia() | money }}</b></p>
            <table style="background: none">@for (m of porMedio(); track m.nombre) { <tr><td><span class="badge" [style.background]="m.color" style="width: 10px; height: 10px; padding: 0"></span> <b>{{ m.nombre }}</b></td><td class="right">{{ m.total | money }} · ({{ m.n }} {{ m.n === 1 ? 'venta' : 'ventas' }})</td></tr> }</table></div>
          <div>
            <div class="card" style="margin-bottom: 12px"><b>Ventas por día</b> <span class="badge sel" style="float: right">{{ totalDia() | money }}</span><br /><small class="muted">{{ ventasDia().length }} ventas · {{ productosDe(ventasDia()) }} productos</small><br /><small class="muted">Comisión {{ store.settings().sellerCommission }}%: {{ comision(totalDia()) | money }}</small></div>
            <div class="card" style="margin-bottom: 12px"><b>Ventas por semana</b> <span class="badge sel" style="float: right">{{ totalSemana() | money }}</span><br /><small class="muted">{{ ventasSemana().length }} ventas · {{ productosDe(ventasSemana()) }} productos</small><br /><small class="muted">Comisión: {{ comision(totalSemana()) | money }}</small></div>
            <div class="card"><b>Ventas por mes</b> <span class="badge sel" style="float: right">{{ totalMes() | money }}</span>
              <div class="row"><button style="height: 28px" (click)="mesOff.set(mesOff() - 1)">←</button><span>{{ nombreMes() }}</span><button style="height: 28px" (click)="mesOff.set(mesOff() + 1)">→</button></div>
              <small class="muted">{{ ventasMes().length }} ventas · {{ productosDe(ventasMes()) }} productos · Comisión: {{ comision(totalMes()) | money }}</small></div>
          </div>
        </div>
        <div class="card" style="margin-top: 16px"><b>Ventas mensuales</b> <small class="muted">{{ nombreMes() }} {{ totalMes() | money }} · mes anterior {{ totalMesAnterior() | money }}</small>
          <svg viewBox="0 0 620 150" style="width: 100%; height: 170px"><polyline fill="none" stroke="#aaa" stroke-width="2" stroke-dasharray="5 4" [attr.points]="linea(true)" /><polyline fill="none" stroke="#e5476b" stroke-width="3" [attr.points]="linea(false)" /></svg>
          <small class="muted">línea sólida = mes seleccionado · punteada = mes anterior (por día del mes)</small></div>
        <div class="card" style="margin-top: 16px"><b>Ventas por día de la semana</b><br /><small class="muted">{{ mejorDia() }}</small>
          <div style="display: flex; align-items: flex-end; gap: 14px; height: 170px; margin-top: 8px">@for (d of semana(); track d.n) { <div style="flex: 1; text-align: center"><small>{{ d.total | money }}</small><div style="background: var(--accent-blue); border-radius: 6px 6px 0 0" [style.height.%]="d.h"></div></div> }</div>
          <div style="display: flex; gap: 14px; text-align: center">@for (d of semana(); track d.n) { <small style="flex: 1">{{ d.n }}</small> }</div></div>
      }

      @case ('tesoreria') {
        <div class="toolbar"><div class="field"><label>Desde</label><input type="date" [ngModel]="desde()" (ngModelChange)="desde.set($event)" /></div><div class="field"><label>Hasta</label><input type="date" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" /></div></div>
        <div class="grid2">
          <div class="card"><b>INGRESOS</b> Total: <b class="pos">{{ totalTes(1) | money }}</b><table style="background: none">@for (c of tes(1); track c.cat) { <tr><td>{{ c.cat }}</td><td class="right">{{ c.total | money }}</td></tr> } @empty { <tr><td class="empty">Sin ingresos en el período</td></tr> }</table></div>
          <div class="card"><b>GASTOS</b> Total: <b class="neg">{{ totalTes(-1) | money }}</b><table style="background: none">@for (c of tes(-1); track c.cat) { <tr><td>{{ c.cat }}</td><td class="right">{{ c.total | money }}</td></tr> } @empty { <tr><td class="empty">Sin gastos en el período</td></tr> }</table></div>
        </div>
      }

      @case ('stock') {
        <div class="kpis k3">
          <div class="kpi"><small>Cantidad total</small><strong>{{ stockTotal().cant }}</strong></div>
          <div class="kpi"><small>Valor a precio de venta</small><strong>{{ stockTotal().venta | money }}</strong></div>
          <div class="kpi"><small>Valor a precio de costo</small><strong>{{ stockTotal().costo | money }}</strong></div>
        </div>
        <div class="card"><b>Evolución de movimientos</b> <small class="muted">En los últimos 30 días</small>
          <div style="display: flex; align-items: flex-end; gap: 3px; height: 140px; margin-top: 8px">@for (d of movs30(); track d.k) { <div style="flex: 1; background: var(--accent-blue); border-radius: 3px 3px 0 0" [style.height.%]="d.h" [title]="d.k + ': ' + d.n + ' movimientos'"></div> }</div></div>
      }

      @case ('productos') {
        <div class="toolbar"><div class="field"><label>Desde</label><input type="date" [ngModel]="desde()" (ngModelChange)="desde.set($event)" /></div><div class="field"><label>Hasta</label><input type="date" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" /></div></div>
        <div class="kpis k4"><div class="kpi"><small>Productos vendidos</small><strong>{{ ranking().length }}</strong></div><div class="kpi"><small>Facturación</small><strong>{{ rankTot().fact | money }}</strong></div><div class="kpi"><small>Ganancia</small><strong>{{ rankTot().gan | money }}</strong></div><div class="kpi"><small>Margen</small><strong>{{ rankTot().margen }}%</strong></div></div>
        <table><tr><th>Top</th><th>Producto</th><th>Cantidad</th><th>Facturación</th><th>Costo</th><th>Ganancia</th><th>Margen</th></tr>
          @for (r of ranking(); track r.name; let i = $index) { <tr><td>#{{ i + 1 }}</td><td>{{ r.name }}</td><td>{{ r.qty }}</td><td>{{ r.fact | money }}</td><td>{{ r.costo | money }}</td><td>{{ r.gan | money }}</td><td>{{ r.margen }}%</td></tr> }
          @empty { <tr><td colspan="7" class="empty">Sin ventas en el período</td></tr> }</table>
      }

      @case ('clientes') {
        <div class="toolbar"><select [ngModel]="cliPeriodo()" (ngModelChange)="cliPeriodo.set($event)"><option value="mes">Este mes</option><option value="anio">Este año</option><option value="siempre">De siempre</option></select></div>
        <table><tr><th>Top</th><th>Cliente</th><th>Cant. ventas</th><th>Cant. productos</th><th class="right">Ventas en $</th></tr>
          @for (c of topClientes(); track c.id; let i = $index) { <tr><td>#{{ i + 1 }}</td><td>{{ c.nombre }}</td><td>{{ c.n }}</td><td>{{ c.prods }}</td><td class="right">{{ c.total | money }}</td></tr> }
          @empty { <tr><td colspan="5" class="empty">Sin ventas a clientes en el período</td></tr> }</table>
      }

      @case ('rentabilidad') {
        <div class="toolbar"><button style="height: 32px" (click)="rentOff.set(rentOff() - 1)">←</button><b>{{ nombreRent() }}</b><button style="height: 32px" (click)="rentOff.set(rentOff() + 1)">→</button></div>
        <table><tr><th>Categoría</th><th>Vendidos</th><th class="right">Ingresos</th><th class="right">Costo variable</th><th class="right">Costo fijo asignado</th><th class="right">Costo fijo por unidad</th><th class="right">Margen</th><th class="right">Margen %</th></tr>
          @for (r of rent(); track r.cat) { <tr><td>{{ r.cat }}</td><td>{{ r.qty }}</td><td class="right">{{ r.ing | money }}</td><td class="right">{{ r.cv | money }}</td><td class="right">{{ r.cf | money }}</td><td class="right">{{ r.cfu | money }}</td><td class="right">{{ r.margen | money }}</td><td class="right">{{ r.pct }}%</td></tr> }
          @empty { <tr><td colspan="8" class="empty">Sin ventas en el mes</td></tr> }
          @if (rent().length) { <tr><td><b>Total</b></td><td></td><td class="right"><b>{{ rentTot().ing | money }}</b></td><td class="right"><b>{{ rentTot().cv | money }}</b></td><td class="right"><b>{{ rentTot().cf | money }}</b></td><td></td><td class="right"><b>{{ rentTot().margen | money }}</b></td><td></td></tr> }</table>
        <p class="muted">El costo fijo por unidad se reparte sobre lo vendido en el mes: en un mes con pocas ventas sube aunque los costos no cambien.</p>
      }
    }
  `,
})
export class ReportesComponent {
  readonly store = inject(Store);
  readonly tabs: { id: Tab; label: string }[] = [{ id: 'ventas', label: 'Ventas' }, { id: 'tesoreria', label: 'Tesorería' }, { id: 'stock', label: 'Stock' }, { id: 'productos', label: 'Productos' }, { id: 'clientes', label: 'Clientes' }, { id: 'rentabilidad', label: 'Rentabilidad' }];
  readonly tab = signal<Tab>('ventas');
  readonly dia = signal(0); readonly mesOff = signal(0); readonly rentOff = signal(0); readonly soloCobradas = signal(false);
  readonly desde = signal(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`); readonly hasta = signal(new Date().toISOString().slice(0, 10));
  readonly cliPeriodo = signal<'mes' | 'anio' | 'siempre'>('mes');

  private readonly ventas = computed(() => this.store.db().sales);
  private base(): Date { const d = new Date(); d.setHours(12, 0, 0, 0); return d; }
  private diaSel(): Date { const d = this.base(); d.setDate(d.getDate() + this.dia()); return d; }
  fechaDia() { return this.diaSel().toLocaleDateString('es-AR'); }
  private filtrar(ss: Sale[]) { return this.soloCobradas() ? ss.filter((s) => s.paid) : ss; }
  readonly ventasDia = computed(() => this.filtrar(this.ventas().filter((s) => ymd(s.at) === this.diaSel().toISOString().slice(0, 10) || new Date(s.at).toDateString() === this.diaSel().toDateString())));
  readonly totalDia = computed(() => r2(this.ventasDia().reduce((t, s) => t + s.total, 0)));
  promedioDia() { return this.ventasDia().length ? r2(this.totalDia() / this.ventasDia().length) : 0; }
  readonly porMedio = computed(() => {
    const m = new Map<string, { total: number; n: number }>();
    this.ventasDia().forEach((s) => { const x = m.get(s.method) ?? { total: 0, n: 0 }; x.total += s.total; x.n++; m.set(s.method, x); });
    return [...m].map(([nombre, v]) => ({ nombre, total: r2(v.total), n: v.n, color: COLOR[nombre] }));
  });
  torta(): string {
    const t = this.porMedio().reduce((s, m) => s + m.total, 0) || 1; let a = 0;
    return `conic-gradient(${this.porMedio().map((m) => { const d = (m.total / t) * 100; const s = `${m.color} ${a}% ${a + d}%`; a += d; return s; }).join(',')})`;
  }
  productosDe(ss: Sale[]) { return ss.reduce((t, s) => t + s.lines.reduce((x, l) => x + l.qty, 0), 0); }
  comision(n: number) { return r2((n * this.store.settings().sellerCommission) / 100); }
  readonly ventasSemana = computed(() => {
    const d = this.diaSel(), dow = (d.getDay() + 6) % 7; const ini = new Date(d); ini.setDate(d.getDate() - dow); ini.setHours(0, 0, 0, 0);
    const fin = new Date(ini); fin.setDate(ini.getDate() + 7);
    return this.filtrar(this.ventas().filter((s) => { const x = new Date(s.at); return x >= ini && x < fin; }));
  });
  readonly totalSemana = computed(() => r2(this.ventasSemana().reduce((t, s) => t + s.total, 0)));
  private mesSel(off = 0): Date { const d = this.base(); d.setDate(1); d.setMonth(d.getMonth() + this.mesOff() + off); return d; }
  nombreMes() { const d = this.mesSel(); return `${MESES[d.getMonth()]} ${d.getFullYear()}`; }
  private delMes(off = 0) { const k = key(this.mesSel(off)); return this.filtrar(this.ventas().filter((s) => key(new Date(s.at)) === k)); }
  readonly ventasMes = computed(() => this.delMes(0));
  readonly totalMes = computed(() => r2(this.ventasMes().reduce((t, s) => t + s.total, 0)));
  readonly totalMesAnterior = computed(() => r2(this.delMes(-1).reduce((t, s) => t + s.total, 0)));
  linea(anterior: boolean): string {
    const ss = anterior ? this.delMes(-1) : this.ventasMes(); const por = new Array(31).fill(0);
    ss.forEach((s) => (por[new Date(s.at).getDate() - 1] += s.total));
    const max = Math.max(1, ...this.delMes(0).concat(this.delMes(-1)).map(() => 0), ...por, ...this.tot31(anterior ? 0 : -1));
    return por.map((v, i) => `${10 + (i * 600) / 30},${140 - (v / max) * 125}`).join(' ');
  }
  private tot31(off: number): number[] { const por = new Array(31).fill(0); this.delMes(off).forEach((s) => (por[new Date(s.at).getDate() - 1] += s.total)); return por; }
  readonly semana = computed(() => {
    const t = [0, 0, 0, 0, 0, 0, 0];
    this.ventasMes().forEach((s) => (t[(new Date(s.at).getDay() + 6) % 7] += s.total));
    const max = Math.max(1, ...t);
    return t.map((total, i) => ({ n: DIAS[i], total: r2(total), h: (total / max) * 100 }));
  });
  mejorDia() { const s = this.semana(); const m = s.reduce((a, b) => (b.total > a.total ? b : a)); return m.total ? `El día que más vende es el ${m.n}` : 'Todavía no hay ventas este mes'; }

  private enRango(iso: string) { return ymd(iso) >= this.desde() && ymd(iso) <= this.hasta(); }
  tes(sign: 1 | -1) {
    const m = new Map<string, number>();
    this.store.db().movements.filter((x) => this.enRango(x.at) && Math.sign(x.amount) === sign && x.sourceType !== 'transferencia').forEach((x) => m.set(x.category, (m.get(x.category) ?? 0) + Math.abs(x.amount)));
    return [...m].map(([cat, total]) => ({ cat, total: r2(total) })).sort((a, b) => b.total - a.total);
  }
  totalTes(sign: 1 | -1) { return r2(this.tes(sign).reduce((t, c) => t + c.total, 0)); }

  stockTotal() {
    const ps = this.store.db().products.filter((p) => !p.archived && !p.combo.length);
    return { cant: ps.reduce((t, p) => t + p.stock, 0), venta: r2(ps.reduce((t, p) => t + p.stock * p.price, 0)), costo: r2(ps.reduce((t, p) => t + p.stock * p.cost, 0)) };
  }
  readonly movs30 = computed(() => {
    const dias = new Map<string, number>(); const hoy = new Date();
    for (let i = 29; i >= 0; i--) { const d = new Date(hoy); d.setDate(hoy.getDate() - i); dias.set(d.toISOString().slice(0, 10), 0); }
    this.store.db().stockMoves.forEach((m) => { const k = ymd(m.at); if (dias.has(k)) dias.set(k, dias.get(k)! + 1); });
    const max = Math.max(1, ...dias.values());
    return [...dias].map(([k, n]) => ({ k, n, h: Math.max(2, (n / max) * 100) }));
  });

  readonly ranking = computed(() => {
    const m = new Map<string, { name: string; qty: number; fact: number; costo: number }>();
    this.ventas().filter((s) => this.enRango(s.at)).forEach((s) => s.lines.forEach((l) => {
      const x = m.get(l.productId) ?? { name: l.name, qty: 0, fact: 0, costo: 0 };
      x.qty += l.qty; x.fact += (l.price - l.discountUnit) * l.qty * (1 - s.discountPct / 100); x.costo += l.cost * l.qty; m.set(l.productId, x);
    }));
    return [...m.values()].map((x) => ({ ...x, fact: r2(x.fact), costo: r2(x.costo), gan: r2(x.fact - x.costo), margen: x.fact ? r2(((x.fact - x.costo) / x.fact) * 100) : 0 })).sort((a, b) => b.fact - a.fact);
  });
  rankTot() { const r = this.ranking(); const f = r.reduce((t, x) => t + x.fact, 0), c = r.reduce((t, x) => t + x.costo, 0); return { fact: r2(f), gan: r2(f - c), margen: f ? r2(((f - c) / f) * 100) : 0 }; }

  readonly topClientes = computed(() => {
    const now = new Date(); const m = new Map<string, { n: number; prods: number; total: number }>();
    this.ventas().filter((s) => s.customerId && (this.cliPeriodo() === 'siempre' || (new Date(s.at).getFullYear() === now.getFullYear() && (this.cliPeriodo() === 'anio' || new Date(s.at).getMonth() === now.getMonth())))).forEach((s) => {
      const x = m.get(s.customerId!) ?? { n: 0, prods: 0, total: 0 }; x.n++; x.prods += s.lines.reduce((t, l) => t + l.qty, 0); x.total += s.total; m.set(s.customerId!, x);
    });
    return [...m].map(([id, v]) => ({ id, nombre: this.store.customerName(id), ...v, total: r2(v.total) })).sort((a, b) => b.total - a.total);
  });

  private rentMes(): Date { const d = this.base(); d.setDate(1); d.setMonth(d.getMonth() + this.rentOff()); return d; }
  nombreRent() { const d = this.rentMes(); return `${MESES[d.getMonth()]} ${d.getFullYear()}`; }
  readonly rent = computed(() => {
    const k = key(this.rentMes()); const m = new Map<string, { qty: number; ing: number; cv: number }>();
    this.ventas().filter((s) => key(new Date(s.at)) === k).forEach((s) => s.lines.forEach((l) => {
      const cat = this.store.categories().find((c) => c.id === l.categoryId)?.name ?? 'Sin categoría';
      const x = m.get(cat) ?? { qty: 0, ing: 0, cv: 0 }; x.qty += l.qty; x.ing += (l.price - l.discountUnit) * l.qty * (1 - s.discountPct / 100); x.cv += l.cost * l.qty; m.set(cat, x);
    }));
    const fijos = r2(this.store.db().costCenters.reduce((t, c) => t + c.costs.reduce((s, f) => s + f.monthly, 0), 0));
    const ingTot = [...m.values()].reduce((t, x) => t + x.ing, 0) || 1, qtyTot = [...m.values()].reduce((t, x) => t + x.qty, 0) || 1;
    return [...m].map(([cat, v]) => {
      const cf = r2(fijos * (v.ing / ingTot)); const margen = r2(v.ing - v.cv - cf);
      return { cat, qty: v.qty, ing: r2(v.ing), cv: r2(v.cv), cf, cfu: r2(fijos / qtyTot), margen, pct: v.ing ? r2((margen / v.ing) * 100) : 0 };
    });
  });
  rentTot() { const r = this.rent(); return { ing: r2(r.reduce((t, x) => t + x.ing, 0)), cv: r2(r.reduce((t, x) => t + x.cv, 0)), cf: r2(r.reduce((t, x) => t + x.cf, 0)), margen: r2(r.reduce((t, x) => t + x.margen, 0)) }; }
}
