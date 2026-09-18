import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoneyPipe, fdate } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { Sale } from '../../core/models';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const KEY_BANNER = 'pos-dash-banner-cerrado';
const mismoDia = (iso: string, d: Date) => new Date(iso).toDateString() === d.toDateString();

/** Dashboard: resumen del negocio (ventas, ganancia, egresos, caja, stock y alertas). Todo se calcula de los datos del store. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MoneyPipe],
  template: `
    <div class="row between" style="align-items: flex-start"><div><h1>Dashboard</h1><p class="sub">Resumen de tu negocio</p></div>
      <button (click)="actualizar()"><i class="fa-solid fa-rotate-right"></i>Actualizar</button></div>

    @if (!bannerCerrado() && productos() === 0) {
      <div class="card banner-inicio">
        <span class="bi-ic"><i class="fa-solid fa-box-open"></i></span>
        <div class="grow"><small class="muted" style="letter-spacing: .06em; font-weight: 800">EMPEZÁ ACÁ</small><h3 style="margin: 2px 0">Cargá un producto y llegá al valor real</h3>
          <p class="sub" style="margin: 0">Usá un producto de tu negocio para probar stock, caja y reportes con datos que después te sirven.</p></div>
        <a class="cta btn" routerLink="/stock" style="text-decoration: none; display: inline-grid; place-items: center">Cargar producto<i class="fa-solid fa-arrow-right" style="margin: 0 0 0 8px"></i></a>
        <button class="x" (click)="cerrarBanner()" title="Cerrar">✕</button>
      </div>
    }

    <div class="gcards">
      <div class="gcard azul"><small>TOTAL PRODUCTOS</small><strong>{{ productos() }}</strong><span><i class="fa-solid fa-box"></i>{{ serviciosN() ? serviciosN() + ' servicios' : productos() + ' activos' }}</span><i class="deco fa-solid fa-cube"></i></div>
      <div class="gcard verde"><small>VENTAS DE LA SEMANA</small><strong>{{ semana() | money }}</strong><span><i class="fa-regular fa-calendar"></i>Últimos 7 días</span><i class="deco fa-solid fa-arrow-trend-up"></i></div>
      <div class="gcard naranja"><small>VENDIDO HOY</small><strong>{{ hoyTotal() | money }}</strong>
        <div class="mini3"><div><em>INGRESADO</em><b>{{ ingresadoHoy() | money }}</b></div><div><em>COBROS CC</em><b>{{ cobrosCCHoy() | money }}</b></div><div><em>OPERACIONES</em><b>{{ hoyN() }}</b></div></div></div>
      <div class="gcard gris" [class.alerta]="alertas().length"><small>ALERTAS STOCK</small><strong>{{ alertas().length }}</strong><span><i class="fa-solid" [class.fa-circle-check]="!alertas().length" [class.fa-triangle-exclamation]="alertas().length"></i>{{ alertas().length ? 'Hay que reponer' : 'Todo en orden' }}</span></div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="row between"><div><b>Análisis financiero</b><br /><small class="muted">Ganancias y egresos diarios</small></div>
          <div class="row" style="gap: 8px"><span class="datenav sm"><button (click)="mesOff.set(mesOff() - 1)"><i class="fa-solid fa-arrow-left"></i></button><span>{{ nombreMes() }}</span><button (click)="mesOff.set(mesOff() + 1)"><i class="fa-solid fa-arrow-right"></i></button></span>
            <span class="seg"><button [class.on]="tipo() === 'barras'" (click)="tipo.set('barras')">Barras</button><button [class.on]="tipo() === 'linea'" (click)="tipo.set('linea')">Línea</button></span></div></div>
        <svg viewBox="0 0 720 230" class="grafico" role="img" aria-label="Ganancia bruta y egresos por día">
          @for (y of ejeY(); track y.v) { <g><line x1="46" x2="712" [attr.y1]="y.y" [attr.y2]="y.y" stroke="rgba(0,0,0,.08)" /><text x="40" [attr.y]="y.y + 3" text-anchor="end" font-size="9" fill="#8a8a8a">{{ y.t }}</text></g> }
          @if (tipo() === 'barras') {
            @for (d of serie(); track d.dia) { <g><rect [attr.x]="d.x" [attr.y]="d.yG" width="7" [attr.height]="d.hG" rx="2" fill="#1f9d63"><title>{{ d.dia }}: ganancia {{ d.g | money }}</title></rect>
              <rect [attr.x]="d.x + 8" [attr.y]="d.yE" width="7" [attr.height]="d.hE" rx="2" fill="#e5476b"><title>{{ d.dia }}: egresos {{ d.e | money }}</title></rect></g> }
          } @else {
            <polyline fill="none" stroke="#1f9d63" stroke-width="2.5" [attr.points]="linea('g')" /><polyline fill="none" stroke="#e5476b" stroke-width="2.5" [attr.points]="linea('e')" />
          }
          @for (d of serie(); track d.dia) { @if (d.dia % 2 === 1 || serie().length < 16) { <text [attr.x]="d.x + 8" y="222" text-anchor="middle" font-size="8" fill="#8a8a8a">{{ d.dia }}/{{ mesNum() }}</text> } }
        </svg>
        <div class="leyenda-linea"><span><i class="cuad" style="background:#1f9d63; display:inline-block; margin-right:5px"></i>Ganancia bruta</span><span><i class="cuad" style="background:#e5476b; display:inline-block; margin-right:5px"></i>Egresos</span></div>
      </div>

      <div class="card">
        <div class="row between"><div><b>Resumen financiero</b><br /><small class="muted">Período seleccionado</small></div></div>
        <div class="fin-row"><i class="dot" style="background:#1f9d63"></i><div class="grow"><b>Ganancia bruta</b><br /><small class="muted">Ingresos − costos</small></div><span class="chip-ok">{{ gananciaBruta() | money }}</span></div>
        <div class="fin-row"><i class="dot" style="background:#e5476b"></i><div class="grow"><b>Egresos operativos</b><br /><small class="muted">Gastos y bajas</small></div><span class="chip-mal">{{ egresos() | money }}</span></div>
        <div class="fin-row"><i class="dot" style="background:#0585fe"></i><div class="grow"><b>Ganancia neta</b><br /><small class="muted">Margen: {{ margen() }}%</small></div><span class="chip-az">{{ gananciaNeta() | money }}</span></div>
        <div class="fin-row"><i class="dot" style="background:#d9822b"></i><div class="grow"><b>Tendencia</b><br /><small class="muted">vs período anterior</small></div><span class="chip-na">{{ tendencia() }}</span></div>
      </div>

      <div class="card">
        <div class="row between"><div><b>Gastos operativos</b><br /><small class="muted">{{ nombreMes() }} · {{ gastosMov().length }} movimientos</small></div><a class="link" routerLink="/cuentas">Ver cuentas</a></div>
        <div class="row between" style="margin: 10px 0"><small class="muted">TOTAL DEL PERÍODO</small><strong style="font-size: 22px">{{ egresos() | money }}</strong></div>
        <b style="font-size: 12px">Últimos gastos</b>
        @for (m of gastosMov().slice(0, 4); track m.id) { <div class="fin-row" style="padding: 6px 0"><div class="grow">{{ m.description || m.category }}<br /><small class="muted">{{ m.category }}</small></div><b class="neg">{{ -m.amount | money }}</b></div> }
        @empty { <div class="vacio-mini"><i class="fa-solid fa-receipt"></i>Todavía no hay gastos este mes<br /><a class="link" routerLink="/cuentas">Registrar un gasto</a></div> }
      </div>

      <div class="card">
        <b>Top 5 días</b><br /><small class="muted">Días con más ventas del mes</small>
        @for (d of topDias(); track d.dia; let i = $index) { <div class="fin-row"><span class="top">#{{ i + 1 }}</span><div class="grow">{{ d.dia }}<br /><small class="muted">{{ d.n }} ventas</small></div><b>{{ d.total | money }}</b></div> }
        @empty { <div class="vacio-mini"><i class="fa-solid fa-calendar-day"></i>Sin ventas aún<br /><small class="muted">Los días con más ventas aparecerán acá</small></div> }
      </div>

      <div class="card">
        <div class="row between"><div><b>Ventas por hora</b><br /><small class="muted">{{ horaModo() === 'hoy' ? 'Hoy' : 'Últimos 7 días' }}</small></div>
          <span class="seg"><button [class.on]="horaModo() === 'hoy'" (click)="horaModo.set('hoy')">Hoy</button><button [class.on]="horaModo() === '7'" (click)="horaModo.set('7')">7 días</button></span></div>
        @if (horasMax() > 0) {
          <div class="horas">@for (h of horas(); track h.h) { <div class="hcol" [title]="h.h + ' h: ' + (h.total | money)"><i [style.height.%]="h.pct"></i><small>{{ h.h % 3 === 0 ? h.h : '' }}</small></div> }</div>
        } @else { <div class="vacio-mini"><i class="fa-regular fa-clock"></i>Todavía no hay ventas {{ horaModo() === 'hoy' ? 'hoy' : 'en los últimos 7 días' }}<br /><small class="muted">El gráfico se arma solo a medida que vendés</small></div> }
      </div>

      <div class="card">
        <b>Top productos</b><br /><small class="muted">Más vendidos de {{ nombreMes() }}</small>
        @for (p of topProductos(); track p.name; let i = $index) { <div class="fin-row"><span class="top">#{{ i + 1 }}</span><div class="grow">{{ p.name }}<div class="barra"><i [style.width.%]="p.pct"></i></div></div><b>{{ p.qty }} u.</b></div> }
        @empty { <div class="vacio-mini"><i class="fa-solid fa-ranking-star"></i>Sin ventas aún<br /><small class="muted">Los productos más vendidos aparecerán acá</small></div> }
      </div>

      <div class="card">
        <b>Rentabilidad</b><br /><small class="muted">Márgenes de ganancia</small>
        @if (margenesBajos().length) {
          @for (p of margenesBajos(); track p.id) { <div class="fin-row"><i class="fa-solid fa-triangle-exclamation" style="color:#d9822b"></i><div class="grow">{{ p.name }}</div><b class="neg">{{ p.margen }}%</b></div> }
        } @else { <div class="vacio-mini ok"><i class="fa-solid fa-circle-check"></i>Márgenes saludables<br /><small class="muted">Todos los productos tienen buen margen de ganancia</small></div> }
      </div>

      <div class="card acceso"><div class="row between"><b>Cuentas corrientes</b><i class="fa-solid fa-book-open"></i></div><small class="muted">Saldos pendientes de clientes</small>
        <strong>{{ store.totalReceivable() | money }}</strong><span class="muted">{{ store.totalReceivable() ? 'Hay saldos por cobrar' : 'Sin deudas pendientes' }}</span><a class="link" routerLink="/clientes">Ver clientes</a></div>
      <div class="card acceso"><div class="row between"><b>Control de caja</b><span class="badge" [class.b-green]="cajaAbierta()" [class.b-gray]="!cajaAbierta()">{{ cajaAbierta() ? 'TURNO ABIERTO' : 'SIN CAJA ABIERTA' }}</span></div><small class="muted">Ingresos de hoy</small>
        <strong>{{ ingresadoHoy() | money }}</strong><span class="muted">Ventas + cobros de cuentas</span><a class="link" routerLink="/cierres-caja">Ver detalle</a></div>
      <div class="card acceso"><div class="row between"><b>Deuda proveedores</b><i class="fa-solid fa-truck"></i></div><small class="muted">Saldo con proveedores</small>
        <strong>{{ store.totalPayable() | money }}</strong><span class="muted">{{ store.totalPayable() ? 'Hay pagos pendientes' : 'Sin deudas con proveedores' }}</span><a class="link" routerLink="/proveedores">Ver proveedores</a></div>

      <div class="card">
        <b>Stock bajo</b><br /><small class="muted">Productos por reponer</small>
        @for (p of alertas().slice(0, 5); track p.id) { <div class="fin-row"><div class="grow">{{ p.name }}</div><span class="badge" [class.b-red]="store.stockOf(p) <= 0" [class.b-amber]="store.stockOf(p) > 0">{{ store.stockOf(p) }} u.</span></div> }
        @empty { <div class="vacio-mini ok"><i class="fa-solid fa-circle-check"></i>Todo en orden<br /><small class="muted">Todos los productos tienen stock suficiente</small></div> }
      </div>
      <div class="card">
        <b>Últimos movimientos</b><br /><small class="muted">Actividad reciente de inventario</small>
        @for (m of ultimosMov(); track m.id) { <div class="fin-row"><div class="grow">{{ store.product(m.productId)?.name }}<br /><small class="muted">{{ m.reason }}</small></div><b [class.pos]="m.delta > 0" [class.neg]="m.delta < 0">{{ m.delta > 0 ? '+' : '' }}{{ m.delta }}</b></div> }
        @empty { <div class="vacio-mini"><i class="fa-solid fa-boxes-stacked"></i>Sin movimientos<br /><small class="muted">Los movimientos aparecerán aquí</small></div> }
      </div>
    </div>
  `,
})
export class DashboardComponent {
  readonly store = inject(Store);
  readonly mesOff = signal(0);
  readonly tipo = signal<'barras' | 'linea'>('barras');
  readonly horaModo = signal<'hoy' | '7'>('hoy');
  readonly bannerCerrado = signal(this.leerBanner());

  private leerBanner(): boolean { try { return localStorage.getItem(KEY_BANNER) === '1'; } catch { return false; } }
  cerrarBanner() { this.bannerCerrado.set(true); try { localStorage.setItem(KEY_BANNER, '1'); } catch { /* sin storage */ } }
  actualizar() { if (this.store.remote()) this.store.sync(); }

  // ---------- período ----------
  private base(): Date { const d = new Date(); d.setDate(1); d.setHours(12, 0, 0, 0); d.setMonth(d.getMonth() + this.mesOff()); return d; }
  nombreMes() { const d = this.base(); return `${MESES[d.getMonth()]} ${d.getFullYear()}`; }
  mesNum() { return this.base().getMonth() + 1; }
  private enMes(iso: string, off = 0): boolean { const d = this.base(); d.setMonth(d.getMonth() + off); const x = new Date(iso); return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear(); }

  // ---------- tarjetas ----------
  readonly productos = computed(() => this.store.db().products.filter((p) => !p.archived && !p.service).length);
  readonly serviciosN = computed(() => this.store.db().products.filter((p) => !p.archived && p.service).length);
  private ventasHoy = computed(() => this.store.db().sales.filter((s) => mismoDia(s.at, new Date())));
  readonly hoyTotal = computed(() => r2(this.ventasHoy().reduce((t, s) => t + s.total, 0)));
  readonly hoyN = computed(() => this.ventasHoy().length);
  readonly semana = computed(() => { const lim = Date.now() - 7 * 86400000; return r2(this.store.db().sales.filter((s) => new Date(s.at).getTime() >= lim).reduce((t, s) => t + s.total, 0)); });
  readonly cobrosCCHoy = computed(() => r2(this.store.db().party.filter((e) => e.party === 'customer' && e.kind === 'pago' && mismoDia(e.at, new Date())).reduce((t, e) => t - e.delta, 0)));
  readonly ingresadoHoy = computed(() => r2(this.store.db().movements.filter((m) => m.amount > 0 && m.sourceType !== 'transferencia' && mismoDia(m.at, new Date())).reduce((t, m) => t + m.amount, 0)));
  readonly cajaAbierta = computed(() => !!this.store.openSession());
  readonly alertas = computed(() => this.store.db().products.filter((p) => !p.archived && !p.service && (this.store.stockOf(p) <= 0 || (p.lowStock > 0 && this.store.stockOf(p) <= p.lowStock))));

  // ---------- finanzas del mes ----------
  private ventasMes = computed(() => this.store.db().sales.filter((s) => this.enMes(s.at)));
  private ganancia(s: Sale): number { return s.total - s.lines.reduce((t, l) => t + l.cost * l.qty, 0); }
  readonly gastosMov = computed(() => this.store.db().movements.filter((m) => m.amount < 0 && m.sourceType !== 'transferencia' && m.category !== 'Proveedores' && this.enMes(m.at)).sort((a, b) => b.at.localeCompare(a.at)));
  readonly gananciaBruta = computed(() => r2(this.ventasMes().reduce((t, s) => t + this.ganancia(s), 0)));
  readonly egresos = computed(() => r2(this.gastosMov().reduce((t, m) => t - m.amount, 0)));
  readonly gananciaNeta = computed(() => r2(this.gananciaBruta() - this.egresos()));
  readonly margen = computed(() => { const ing = this.ventasMes().reduce((t, s) => t + s.total, 0); return ing ? r2((this.gananciaNeta() / ing) * 100) : 0; });
  readonly tendencia = computed(() => {
    const prev = this.store.db().sales.filter((s) => this.enMes(s.at, -1)).reduce((t, s) => t + this.ganancia(s), 0);
    const cur = this.gananciaBruta();
    return prev ? `${cur >= prev ? '+' : ''}${Math.round(((cur - prev) / Math.abs(prev)) * 100)}%` : '—';
  });

  // ---------- gráfico diario ----------
  readonly serie = computed(() => {
    const d0 = this.base(), dias = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
    const g = new Array(dias).fill(0), e = new Array(dias).fill(0);
    this.ventasMes().forEach((s) => { g[new Date(s.at).getDate() - 1] += this.ganancia(s); });
    this.gastosMov().forEach((m) => { e[new Date(m.at).getDate() - 1] += -m.amount; });
    const max = Math.max(1, ...g.map(Math.abs), ...e), H = 180, base = 200, ancho = 666 / dias;
    return g.map((_, i) => { const hG = Math.abs(g[i]) / max * H, hE = e[i] / max * H; return { dia: i + 1, g: r2(g[i]), e: r2(e[i]), x: 50 + i * ancho, hG, hE, yG: base - hG, yE: base - hE, cx: 50 + i * ancho + 8, yLG: base - Math.max(0, g[i]) / max * H, yLE: base - hE }; });
  });
  ejeY() { const max = Math.max(1, ...this.serie().flatMap((d) => [Math.abs(d.g), d.e])); return [0, 1, 2, 3].map((k) => { const v = (max / 3) * k; return { v: k, y: 200 - (v / max) * 180, t: v >= 1000 ? Math.round(v / 1000) + 'k' : String(Math.round(v)) }; }); }
  linea(k: 'g' | 'e') { return this.serie().map((d) => `${d.cx},${k === 'g' ? d.yLG : d.yLE}`).join(' '); }

  // ---------- rankings ----------
  readonly topDias = computed(() => {
    const m = new Map<number, { total: number; n: number }>();
    this.ventasMes().forEach((s) => { const k = new Date(s.at).getDate(); const x = m.get(k) ?? { total: 0, n: 0 }; x.total += s.total; x.n++; m.set(k, x); });
    return [...m].map(([k, v]) => ({ dia: `${String(k).padStart(2, '0')}/${String(this.mesNum()).padStart(2, '0')}`, total: r2(v.total), n: v.n })).sort((a, b) => b.total - a.total).slice(0, 5);
  });
  readonly topProductos = computed(() => {
    const m = new Map<string, { name: string; qty: number }>();
    this.ventasMes().forEach((s) => s.lines.forEach((l) => { const x = m.get(l.productId) ?? { name: l.name, qty: 0 }; x.qty += l.qty; m.set(l.productId, x); }));
    const top = [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 5), max = Math.max(1, ...top.map((t) => t.qty));
    return top.map((t) => ({ ...t, pct: (t.qty / max) * 100 }));
  });
  readonly margenesBajos = computed(() => this.store.db().products.filter((p) => !p.archived && !p.service && p.cost > 0 && p.price > 0)
    .map((p) => ({ id: p.id, name: p.name, margen: Math.round(((p.price - p.cost) / p.price) * 100) })).filter((p) => p.margen < 20).sort((a, b) => a.margen - b.margen).slice(0, 5));

  // ---------- ventas por hora ----------
  readonly horas = computed(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ h, total: 0, pct: 0 }));
    const lim = Date.now() - 7 * 86400000;
    this.store.db().sales.filter((s) => (this.horaModo() === 'hoy' ? mismoDia(s.at, new Date()) : new Date(s.at).getTime() >= lim)).forEach((s) => { arr[new Date(s.at).getHours()].total += s.total; });
    const max = Math.max(1, ...arr.map((a) => a.total));
    return arr.map((a) => ({ ...a, pct: a.total ? Math.max(4, (a.total / max) * 100) : 0 }));
  });
  readonly horasMax = computed(() => Math.max(0, ...this.horas().map((h) => h.total)));

  readonly ultimosMov = computed(() => [...this.store.db().stockMoves].reverse().slice(0, 6));
}

export { fdate };
