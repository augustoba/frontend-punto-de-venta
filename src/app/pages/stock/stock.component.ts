import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ListasPreciosComponent } from './listas-precios.component';
import { ModalComponent } from '../../shared/modal.component';
import { MoneyPipe } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { Product } from '../../core/models';

type StockFilter = '' | 'ideal' | 'critico' | 'sin';

/** Stock / Productos (réplica de Envi /products). Ver referencia-envi/ANALISIS_stock.md */
@Component({
  selector: 'app-stock',
  imports: [FormsModule, ModalComponent, MoneyPipe, RouterLink, ListasPreciosComponent],
  template: `
    <h1>Stock</h1>
    <p class="sub">Cargá productos, gestioná stock y actualizá precios.</p>

    <div class="kpis k3">
      <div class="kpi"><small>Productos</small><strong>{{ activos().length }}</strong></div>
      <div class="kpi"><small>Stock crítico</small><strong>{{ criticos() }}</strong></div>
      <div class="kpi">
        <small>Estado del stock · {{ activos().length }} productos</small>
        <div class="bar"><i [style.flex]="ideal()" style="background: var(--success)"></i><i [style.flex]="sinStock()" style="background: var(--danger)"></i></div>
        <span class="muted">Stock ideal {{ pct(ideal()) }}% · Sin stock {{ pct(sinStock()) }}%</span>
      </div>
    </div>

    <div class="toolbar">
      <input class="search" placeholder="Buscar por nombre o código..." style="width: 300px" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <button (click)="showFilters.set(!showFilters())">Filtrar</button>
      <span class="sp"></span>
      <div class="menu">
        @if (store.remote()) { <button (click)="listasOpen.set(true)">🏷 Listas de precios</button> }
        <button class="cta" (click)="openNew()">+ Nuevo producto</button>
        <button class="cta" style="margin-left: 2px" (click)="menu.set(menu() === 'new' ? '' : 'new')">▾</button>
        @if (menu() === 'new') {
          <div class="pop">
            <button (click)="openCombo(); menu.set('')">Nuevo combo</button>
            <button (click)="bulkImport.set(true); menu.set('')">Carga masiva</button>
          </div>
        }
      </div>
    </div>

    @if (showFilters()) {
      <div class="card" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px">
        <div class="field"><label>Stock</label>
          <select [ngModel]="fStock()" (ngModelChange)="fStock.set($event)"><option value="">Todos</option><option value="ideal">Stock ideal</option><option value="critico">Crítico</option><option value="sin">Sin stock</option></select></div>
        <div class="field"><label>Proveedor</label>
          <select [ngModel]="fSupplier()" (ngModelChange)="fSupplier.set($event)"><option value="">Todos</option>@for (s of store.suppliers(); track s.id) {<option [value]="s.id">{{ s.name }}</option>}</select></div>
        <div class="field"><label>Categoría</label>
          <select [ngModel]="fCat()" (ngModelChange)="fCat.set($event)"><option value="">Todas</option>@for (c of store.categories(); track c.id) {<option [value]="c.id">{{ c.name }}</option>}</select></div>
        <div class="field"><label>Archivado</label>
          <select [ngModel]="fArchived()" (ngModelChange)="fArchived.set($event)"><option value="no">Activos</option><option value="si">Archivados</option></select></div>
      </div>
    }

    @if (selected().length) {
      <div class="row" style="margin-bottom: 8px">
        <span class="badge b-blue">{{ selected().length }} seleccionado(s)</span><span class="grow"></span>
        <button (click)="bulk.set('cat')">Categoría</button>
        <button (click)="bulk.set('sup')">Proveedor</button>
        <button (click)="bulk.set('price')">% Precio</button>
        <button (click)="store.archiveProducts(selected(), fArchived() === 'no'); selected.set([])">{{ fArchived() === 'no' ? 'Archivar' : 'Desarchivar' }}</button>
        <button class="neg" (click)="eliminar()">Eliminar</button>
      </div>
    }

    <table>
      <tr>
        <th><input type="checkbox" style="height: auto" [checked]="todosMarcados()" (change)="marcarTodos($any($event.target).checked)" /></th>
        <th>Producto</th><th>Código de barra</th><th>Categoría</th><th>Proveedor</th><th class="right">Precio</th><th>Inventario</th><th></th>
      </tr>
      @for (p of filtrados(); track p.id) {
        <tr>
          <td><input type="checkbox" style="height: auto" [checked]="selected().includes(p.id)" (change)="marcar(p.id, $any($event.target).checked)" /></td>
          <td><b>{{ p.name }}</b> @if (p.combo.length) { <span class="badge b-gray">Combo</span> }</td>
          <td>{{ p.barcode }}</td>
          <td>@if (catName(p); as c) { <span class="badge b-blue">{{ c }}</span> }</td>
          <td>{{ store.supplier(p.supplierId)?.name }}</td>
          <td class="right">
            @if (p.offer > 0) { <s class="muted">{{ p.price | money }}</s><br /><b>{{ p.offer | money }}</b> } @else { {{ p.price | money }} }
          </td>
          <td>
            @if (editing() === p.id) {
              <input type="number" style="width: 80px; height: 32px" [ngModel]="editValue" (ngModelChange)="editValue = $event" (keyup.enter)="guardarStock(p)" />
              <button class="link" (click)="guardarStock(p)">✓</button>
            } @else {
              <span class="badge" [class]="'badge ' + claseStock(p)" [title]="p.combo.length ? 'Derivado de los componentes' : 'Editar stock'" (click)="!p.combo.length && editar(p)" style="cursor: pointer">● {{ store.stockOf(p) }}</span>
            }
          </td>
          <td class="right">
            <div class="menu">
              <button class="x" (click)="menu.set(menu() === p.id ? '' : p.id)">⋮</button>
              @if (menu() === p.id) {
                <div class="pop">
                  <button (click)="openEdit(p); menu.set('')">Editar</button>
                  <a routerLink="/historial-precios" [queryParams]="{ p: p.id }">Ver historial de precios</a>
                  <a routerLink="/historial-stock" [queryParams]="{ p: p.id }">Ver historial de stock</a>
                  <button (click)="store.archiveProducts([p.id], !p.archived); menu.set('')">{{ p.archived ? 'Desarchivar' : 'Archivar' }}</button>
                  <button class="danger" (click)="store.deleteProducts([p.id]); menu.set('')">Eliminar</button>
                </div>
              }
            </div>
          </td>
        </tr>
      } @empty {
        <tr><td colspan="8" class="empty">No hay productos. Creá el primero con «Nuevo producto».</td></tr>
      }
    </table>
    <div class="pager"><span>Mostrando {{ filtrados().length }} de {{ store.db().products.length }}</span></div>

    @if (form(); as f) {
    @if (listasOpen()) { <app-listas-precios (closed)="listasOpen.set(false)" /> }
      <app-modal [title]="f.combo ? (f.id ? 'Editar combo' : 'Nuevo combo') : (f.id ? 'Editar producto' : 'Nuevo producto')" [width]="640" (closed)="form.set(null)">
        <div class="grid2">
          <div class="field"><label>Nombre</label><input [(ngModel)]="f.name" /></div>
          <div class="field"><label>Código de barra</label><input [(ngModel)]="f.barcode" /></div>
          <div class="field"><label>Categoría</label><select [(ngModel)]="f.categoryId"><option [ngValue]="null">—</option>@for (c of store.categories(); track c.id) {<option [ngValue]="c.id">{{ c.name }}</option>}</select></div>
          <div class="field"><label>Proveedor (opcional)</label><select [(ngModel)]="f.supplierId"><option [ngValue]="null">Sin proveedor</option>@for (s of store.suppliers(); track s.id) {<option [ngValue]="s.id">{{ s.name }}</option>}</select></div>
        </div>
        @if (f.combo) {
          <p><b>Productos del combo</b></p>
          @for (c of f.comboItems; track $index) {
            <div class="row" style="margin-bottom: 6px">
              <select class="grow" [(ngModel)]="c.productId" (ngModelChange)="sumaCombo(f)"><option value="">Elegí un producto</option>@for (p of simples(); track p.id) {<option [value]="p.id">{{ p.name }}</option>}</select>
              <input type="number" min="1" style="width: 80px" [(ngModel)]="c.qty" (ngModelChange)="sumaCombo(f)" />
              <button class="x neg" (click)="f.comboItems.splice($index, 1); sumaCombo(f)">🗑</button>
            </div>
          }
          <button (click)="f.comboItems.push({ productId: '', qty: 1 })">+ Agregar producto</button>
        }
        <div class="grid2" style="margin-top: 10px">
          @if (!f.combo) { <div class="field"><label>Costo</label><input type="number" [(ngModel)]="f.cost" /></div> }
          <div class="field"><label>Precio de venta (IVA incl.)</label><input type="number" [(ngModel)]="f.price" /></div>
          <div class="field"><label>Precio de oferta (0 = sin oferta)</label><input type="number" [(ngModel)]="f.offer" /></div>
          @if (!f.combo) {
            <div class="field"><label>Margen</label><input disabled [value]="margen(f)" /></div>
            @if (!f.id) { <div class="field"><label>Stock inicial</label><input type="number" [(ngModel)]="f.stock" /></div> }
            <div class="field"><label>Alerta de stock bajo</label><input type="number" [(ngModel)]="f.lowStock" /></div>
            <div class="field"><label>Stock ideal</label><input type="number" [(ngModel)]="f.idealStock" /></div>
            <div class="field"><label>IVA</label><select [(ngModel)]="f.iva"><option [ngValue]="21">21 %</option><option [ngValue]="10.5">10,5 %</option><option [ngValue]="0">Exento</option></select></div>
          }
        </div>
        <div class="mf"><button (click)="form.set(null)">Cancelar</button><button class="cta" [disabled]="!f.name.trim()" (click)="guardar(f)">Aceptar</button></div>
      </app-modal>
    }

    @if (bulk() === 'price') {
      <app-modal title="Actualización masiva de precios" (closed)="bulk.set('')">
        <p class="note info">Se aplica sobre el precio principal de {{ selected().length }} producto(s).</p>
        <div class="grid2">
          <div class="field"><label>¿Qué actualizar?</label><select [(ngModel)]="bp.target"><option value="price">Precio de lista</option><option value="offer">Ofertas</option></select></div>
          <div class="field"><label>Tipo de ajuste</label><select [(ngModel)]="bp.mode"><option value="pct">Por porcentaje</option><option value="fijo">Por monto fijo</option></select></div>
        </div>
        <div class="field"><label>Valor (negativo para bajar)</label><input type="number" [(ngModel)]="bp.value" /></div>
        <label><input type="checkbox" style="height: auto" [(ngModel)]="bp.round" /> Redondear para eliminar centavos</label>
        <div class="mf"><button (click)="bulk.set('')">Cancelar</button><button class="cta" (click)="aplicarPrecio()">Aceptar</button></div>
      </app-modal>
    }
    @if (bulk() === 'cat' || bulk() === 'sup') {
      <app-modal [title]="bulk() === 'cat' ? 'Cambiar categoría' : 'Cambiar proveedor'" [width]="420" (closed)="bulk.set('')">
        <div class="field">
          @if (bulk() === 'cat') { <select [(ngModel)]="bulkTarget"><option value="">—</option>@for (c of store.categories(); track c.id) {<option [value]="c.id">{{ c.name }}</option>}</select> }
          @else { <select [(ngModel)]="bulkTarget"><option value="">Sin proveedor</option>@for (s of store.suppliers(); track s.id) {<option [value]="s.id">{{ s.name }}</option>}</select> }
        </div>
        <div class="mf"><button (click)="bulk.set('')">Cancelar</button><button class="cta" (click)="aplicarBulk()">Aceptar</button></div>
      </app-modal>
    }
    @if (bulkImport()) {
      <app-modal title="Carga masiva de productos" (closed)="bulkImport.set(false)">
        <p class="muted">Pegá filas separadas por tabulación o coma. Columnas: <b>A Nombre · B Código de barra · C Stock · D Precio · E Oferta · F Costo</b>.</p>
        <label><input type="checkbox" style="height: auto" [(ngModel)]="importHeader" /> La primera fila es el encabezado (se ignora)</label>
        <p><input type="file" accept=".csv,.txt,.tsv" style="height: auto" (change)="leerArchivo($event)" /></p>
        <textarea style="width: 100%; height: 140px; border: 1px solid var(--control-border-color); border-radius: 12px; padding: 8px" [(ngModel)]="importText"></textarea>
        <div class="mf"><span class="muted">{{ filasImport().length }} producto(s)</span><button (click)="bulkImport.set(false)">Cancelar</button><button class="cta" [disabled]="!filasImport().length" (click)="importar()">Importar</button></div>
      </app-modal>
    }
  `,
})
export class StockComponent {
  readonly store = inject(Store);
  readonly q = signal('');
  readonly fStock = signal<StockFilter>('');
  readonly fSupplier = signal('');
  readonly fCat = signal('');
  readonly fArchived = signal<'no' | 'si'>('no');
  readonly showFilters = signal(false);
  readonly listasOpen = signal(false);
  readonly selected = signal<string[]>([]);
  readonly menu = signal('');
  readonly editing = signal('');
  editValue = 0;
  readonly form = signal<any>(null);
  readonly bulk = signal<'' | 'price' | 'cat' | 'sup'>('');
  bulkTarget = '';
  bp = { target: 'price' as 'price' | 'offer', mode: 'pct' as 'pct' | 'fijo', value: 0, round: true };
  readonly bulkImport = signal(false);
  importText = '';
  importHeader = true;

  readonly activos = computed(() => this.store.db().products.filter((p) => !p.archived));
  private estado(p: Product): StockFilter {
    const s = this.store.stockOf(p);
    if (s <= 0) return 'sin';
    if (p.lowStock > 0 && s <= p.lowStock) return 'critico';
    return 'ideal';
  }
  readonly criticos = computed(() => this.activos().filter((p) => { const e = this.estado(p); return e === 'sin' || e === 'critico'; }).length);
  readonly ideal = computed(() => this.activos().filter((p) => this.estado(p) === 'ideal').length);
  readonly sinStock = computed(() => this.activos().filter((p) => this.estado(p) === 'sin').length);
  pct(n: number): number { const t = this.activos().length; return t ? Math.round((n / t) * 100) : 0; }

  readonly filtrados = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.store.db().products.filter((p) =>
      (this.fArchived() === 'si') === p.archived &&
      (!q || p.name.toLowerCase().includes(q) || p.barcode.includes(q)) &&
      (!this.fStock() || (this.fStock() === 'critico' ? ['critico', 'sin'].includes(this.estado(p)) : this.estado(p) === this.fStock())) &&
      (!this.fSupplier() || p.supplierId === this.fSupplier()) && (!this.fCat() || p.categoryId === this.fCat()));
  });
  readonly simples = computed(() => this.store.db().products.filter((p) => !p.combo.length && !p.archived));
  readonly todosMarcados = computed(() => this.filtrados().length > 0 && this.filtrados().every((p) => this.selected().includes(p.id)));
  catName(p: Product): string { return this.store.categories().find((c) => c.id === p.categoryId)?.name ?? ''; }
  claseStock(p: Product): string { const e = this.estado(p); return e === 'sin' ? 'b-red' : e === 'critico' ? 'b-amber' : 'b-green'; }
  marcar(id: string, on: boolean) { this.selected.update((s) => (on ? [...s, id] : s.filter((x) => x !== id))); }
  marcarTodos(on: boolean) { this.selected.set(on ? this.filtrados().map((p) => p.id) : []); }
  eliminar() { this.store.deleteProducts(this.selected()); this.selected.set([]); }

  editar(p: Product) { this.editing.set(p.id); this.editValue = p.stock; }
  guardarStock(p: Product) { this.store.setStock(p.id, Number(this.editValue)); this.editing.set(''); }

  openNew() { this.form.set({ combo: false, name: '', barcode: '', categoryId: null, supplierId: null, cost: 0, price: 0, offer: 0, stock: 0, lowStock: 0, idealStock: 0, iva: this.store.settings().defaultIva, comboItems: [] }); }
  openCombo() { this.form.set({ combo: true, name: '', barcode: '', categoryId: null, supplierId: null, cost: 0, price: 0, offer: 0, stock: 0, lowStock: 0, idealStock: 0, iva: 21, comboItems: [{ productId: '', qty: 1 }] }); }
  openEdit(p: Product) { this.form.set({ ...p, combo: p.combo.length > 0, comboItems: p.combo.map((c) => ({ ...c })) }); }
  margen(f: any): string { return f.cost > 0 ? `${Math.round(((f.price - f.cost) / f.cost) * 100)} %` : '—'; }
  sumaCombo(f: any) {
    f.price = r2(f.comboItems.reduce((s: number, c: any) => s + (this.store.product(c.productId)?.price ?? 0) * c.qty, 0));
  }
  guardar(f: any) {
    const combo = f.combo ? f.comboItems.filter((c: any) => c.productId && c.qty > 0) : [];
    const base = { name: f.name.trim(), barcode: f.barcode, categoryId: f.categoryId, supplierId: f.supplierId, cost: +f.cost || 0, price: +f.price || 0, offer: +f.offer || 0, lowStock: +f.lowStock || 0, idealStock: +f.idealStock || 0, iva: f.iva, combo };
    this.store.saveProduct(f.id ? { id: f.id, ...base } : base, f.id ? 0 : +f.stock || 0);
    this.form.set(null);
  }
  aplicarPrecio() { this.store.bulkPrice(this.selected(), this.bp.target, this.bp.mode, +this.bp.value || 0, this.bp.round); this.bulk.set(''); }
  aplicarBulk() {
    const ids = this.selected(), v = this.bulkTarget || null;
    ids.forEach((id) => this.store.saveProduct(this.bulk() === 'cat' ? { id, name: this.store.product(id)!.name, categoryId: v } : { id, name: this.store.product(id)!.name, supplierId: v }));
    this.bulk.set(''); this.bulkTarget = '';
  }

  leerArchivo(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    f.text().then((t) => (this.importText = t));
  }
  filasImport() { return this.parse(); }
  private parse() {
    const lines = this.importText.split(/\r?\n/).filter((l) => l.trim());
    return (this.importHeader ? lines.slice(1) : lines).map((l) => l.split(/\t|;|,/).map((x) => x.trim())).filter((c) => c[0]);
  }
  importar() {
    this.parse().forEach((c) => this.store.saveProduct({ name: c[0], barcode: c[1] ?? '', price: +c[3] || 0, offer: +c[4] || 0, cost: +c[5] || 0 }, +c[2] || 0));
    this.bulkImport.set(false); this.importText = '';
  }
}
