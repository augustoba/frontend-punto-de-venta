import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { CamaraScannerComponent } from '../../shared/camara-scanner.component';
import { ScanBuffer, beep } from '../../core/scanner';
import { ListasPreciosComponent } from './listas-precios.component';
import { ModalComponent } from '../../shared/modal.component';
import { MoneyPipe } from '../../shared/format';
import { Store, r2 } from '../../core/store';
import { Product } from '../../core/models';

type StockFilter = '' | 'ideal' | 'critico' | 'sin';

/** Stock / Productos (réplica de Envi /products). Ver referencia-envi/ANALISIS_stock.md */
@Component({
  selector: 'app-stock',
  imports: [FormsModule, ModalComponent, MoneyPipe, RouterLink, ListasPreciosComponent, CamaraScannerComponent],
  template: `
    <h1>Stock</h1>
    <p class="sub">Cargá productos, gestioná stock y actualizá precios.</p>

    <div class="kpis k3">
      <div class="kpi ic-box"><small>Productos</small><strong>{{ activos().length }}</strong></div>
      <div class="kpi ic-warn"><small>Stock crítico</small><strong>{{ criticos() }}</strong></div>
      <div class="kpi">
        <small>Estado del stock <span style="float: right">{{ activos().length }} PRODUCTOS</span></small>
        <div class="bar"><i [style.flex]="ideal()" style="background: var(--success)"></i><i [style.flex]="sinStock()" style="background: var(--danger)"></i></div>
        <div class="legend"><span><i class="dot" style="background: var(--success)"></i>Stock ideal {{ pct(ideal()) }}%</span><span><i class="dot" style="background: var(--danger)"></i>Sin stock {{ pct(sinStock()) }}%</span></div>
      </div>
    </div>

    <div class="toolbar">
      <input class="search" placeholder="Buscar..." [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <button (click)="showFilters.set(!showFilters())"><i class="fa-solid fa-filter"></i>Filtrar</button>
      <span class="sp"></span>
      <button class="iconbtn" (click)="refrescar()" title="Actualizar"><i class="fa-solid fa-rotate-right"></i></button>
      @if (listas().length) {
        <select class="lista-sel" [ngModel]="listaId()" (ngModelChange)="listaId.set($event)" title="Lista de precios">@for (l of listas(); track l.id) { <option [ngValue]="l.id">{{ l.name }}</option> }</select>
        <button class="iconbtn" (click)="listasOpen.set(true)" title="Administrar listas de precios"><i class="fa-solid fa-tags"></i></button>
      }
      <button class="iconbtn" (click)="exportar()" title="Exportar CSV"><i class="fa-solid fa-file-arrow-down"></i></button>
      <button class="iconbtn" (click)="imprimir()" title="Imprimir"><i class="fa-solid fa-print"></i></button>
      <div class="menu split">
        <button class="cta" (click)="openNew()"><i class="fa-solid fa-plus"></i>Nuevo producto</button><button class="cta caret" (click)="menu.set(menu() === 'new' ? '' : 'new')" title="Más opciones"><i class="fa-solid fa-chevron-down"></i></button>
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
        <th class="c">Img</th><th>Producto</th><th>Código de barra</th><th>Categoría</th><th>Proveedor</th><th class="right">Precio</th><th>Inventario</th><th></th>
      </tr>
      @for (p of filtrados(); track p.id) {
        <tr>
          <td><input type="checkbox" style="height: auto" [checked]="selected().includes(p.id)" (change)="marcar(p.id, $any($event.target).checked)" /></td>
          <td class="c">@if (p.image) { <img class="img-ph" [src]="p.image" [alt]="p.name" style="object-fit: cover" /> } @else { <span class="img-ph" title="Sin imagen disponible"><i class="fa-solid fa-bag-shopping"></i></span> }</td>
          <td><b>{{ p.name }}</b> @if (p.combo.length) { <span class="badge b-gray">Combo</span> }</td>
          <td>{{ p.barcode }}</td>
          <td>@if (catName(p); as c) { <span class="badge b-blue"><i class="fa-solid fa-circle-dot" style="margin-right: 5px; font-size: 10px"></i>{{ c }}</span> }</td>
          <td>{{ store.supplier(p.supplierId)?.name }}</td>
          <td class="right">
            @if (p.offer > 0 && !listaNoPrincipal()) { <s class="muted">{{ p.price | money }}</s><br /><b>{{ p.offer | money }}</b> } @else { <b>{{ precioVer(p) | money }}</b> }
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
        <tr><td colspan="9" class="empty">No hay productos. Creá el primero con «Nuevo producto».</td></tr>
      }
    </table>
    <div class="pager"><span>Mostrando {{ filtrados().length }} de {{ store.db().products.length }}</span></div>

    @if (listasOpen()) { <app-listas-precios (closed)="listasOpen.set(false)" /> }

    @if (form(); as f) {
      <app-modal [title]="f.combo ? (f.id ? 'Editar combo' : 'Nuevo combo') : (f.id ? 'Editar producto' : 'Nuevo producto')" [width]="640" (closed)="form.set(null)">
        <div class="grid2">
          <div class="field"><label>Nombre</label><input [(ngModel)]="f.name" /></div>
          @if (store.settings().productImages) {
            <div class="field foto-field"><label>Foto</label>
              <div class="row" style="gap: 10px">
                @if (f.image) { <img class="img-ph" [src]="f.image" alt="Foto" style="width: 56px; height: 56px; object-fit: cover" /> } @else { <span class="img-ph" style="width: 56px; height: 56px"><i class="fa-solid fa-image"></i></span> }
                <label class="pillbtn blue" style="cursor: pointer">Subir foto<input type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="subirFoto($event, f)" /></label>
                @if (f.image) { <button class="pillbtn" (click)="f.image = ''">Quitar</button> }
              </div>
              @if (fotoError()) { <small style="color: #8a1c1c">{{ fotoError() }}</small> }
            </div>
          }
          <div class="field"><label>Código de barra</label>
            <div class="search-wrap barcode-in" [class.esperando]="modoLector()">
              <input id="campo-codigo" [(ngModel)]="f.barcode" (keydown.enter)="$event.preventDefault()" placeholder="Escribilo o escanealo" inputmode="numeric" />
              <button type="button" class="bc2" [class.on]="modoLector()" (click)="activarLector()" title="Escanear con lector de mano"><i class="fa-solid fa-barcode"></i></button>
              <button type="button" class="bc" (click)="camaraCodigo.set(true)" title="Escanear con la cámara"><i class="fa-solid fa-camera"></i></button>
            </div>
            @if (modoLector()) { <small class="lector-on"><i class="fa-solid fa-satellite-dish"></i> Esperando el lector: escaneá el código del producto…</small> }
            @if (codigoRepetido(f); as otro) { <small style="color: #a5620a">Ya lo tiene «{{ otro }}».</small> }
            @else if (!modoLector()) { <small class="muted">Escribilo, tocá <b>lector</b> y escaneá, o usá la <b>cámara</b>.</small> }
          </div>
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
    @if (camaraCodigo()) { <app-camara-scanner [mensaje]="msgCodigo()" (codigo)="alLeerCodigo($event)" (closed)="camaraCodigo.set(false)" /> }
  `,
})
export class StockComponent {
  readonly store = inject(Store);
  private readonly api = inject(Api);
  constructor() { this.cargarListas(); }
  readonly q = signal('');
  readonly fStock = signal<StockFilter>('');
  readonly fSupplier = signal('');
  readonly fCat = signal('');
  readonly fArchived = signal<'no' | 'si'>('no');
  readonly showFilters = signal(false);
  readonly listasOpen = signal(false);
  /** Listas de precios del servidor; con una lista distinta de la Principal la tabla muestra `precio × (1 + %)`. */
  readonly listas = signal<{ id: number; name: string; percent: number; main: boolean }[]>([]);
  readonly listaId = signal<number | null>(null);
  listaNoPrincipal() { const l = this.listas().find((x) => x.id === this.listaId()); return !!l && !l.main; }
  precioVer(p: Product): number { const l = this.listas().find((x) => x.id === this.listaId()); return !l || l.main ? p.price : Math.round(p.price * (1 + l.percent / 100) * 100) / 100; }
  refrescar() { if (this.store.remote()) this.store.sync(); }
  private async cargarListas() {
    try {
      const ls = await this.api.get<any[]>('/api/price-lists');
      this.listas.set(ls.map((l) => ({ id: l.id, name: l.name, percent: Number(l.percent), main: !!l.main })));
      this.listaId.set(ls.find((l) => l.main)?.id ?? null);
    } catch { /* sin API: sólo el precio base */ }
  }
  exportar() {
    const filas = [['Producto', 'Código', 'Categoría', 'Proveedor', 'Precio', 'Costo', 'Stock'], ...this.filtrados().map((p) => [p.name, p.barcode, this.catName(p) ?? '', this.store.supplier(p.supplierId)?.name ?? '', this.precioVer(p), p.cost, this.store.stockOf(p)])];
    const url = URL.createObjectURL(new Blob([filas.map((r) => r.join(';')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'stock.csv'; a.click(); URL.revokeObjectURL(url);
  }
  /** Imprime sólo el listado de productos (lo que muestra la tabla con los filtros y la lista de precios elegida). */
  imprimir() {
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return;
    const esc = (x: unknown) => String(x ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
    const dinero = (n: number) => '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const lista = this.listas().find((l) => l.id === this.listaId())?.name ?? 'Principal';
    const filas = this.filtrados().map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.barcode)}</td><td>${esc(this.catName(p) ?? '')}</td><td>${esc(this.store.supplier(p.supplierId)?.name ?? '')}</td><td class="r">${dinero(this.precioVer(p))}</td><td class="r">${this.store.stockOf(p)}</td></tr>`).join('');
    w.document.write(`<html><head><title>Stock</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px}h1{font-size:18px;margin:0}p{margin:2px 0 14px;color:#555}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f3f3f3;font-size:11px;text-transform:uppercase}.r{text-align:right}</style></head><body><h1>${esc(this.store.settings().businessName)} · Stock</h1><p>Lista de precios: ${esc(lista)} · ${new Date().toLocaleString('es-AR')} · ${this.filtrados().length} productos</p><table><tr><th>Producto</th><th>Código</th><th>Categoría</th><th>Proveedor</th><th class="r">Precio</th><th class="r">Stock</th></tr>${filas}</table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }
  readonly fotoError = signal('');
  readonly camaraCodigo = signal(false);
  readonly modoLector = signal(false);
  private readonly scan = new ScanBuffer();
  /** Deja el campo del código «esperando» al lector de mano: la primera lectura completa lo carga. */
  activarLector() {
    this.modoLector.set(!this.modoLector());
    this.scan.reset();
    if (this.modoLector()) setTimeout(() => (document.getElementById('campo-codigo') as HTMLInputElement | null)?.focus());
  }
  @HostListener('window:keydown', ['$event'])
  teclaLector(e: KeyboardEvent) {
    if (!this.modoLector() || !this.form() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') { this.modoLector.set(false); return; }
    const code = this.scan.push(e.key, e.timeStamp);
    if (!code) return;
    e.preventDefault();
    this.form().barcode = code;
    this.modoLector.set(false);
    beep(true);
  }
  readonly msgCodigo = signal('');
  /** Nombre del producto que ya tiene ese código (para avisar antes de guardar un duplicado). */
  codigoRepetido(f: any): string {
    const c = String(f.barcode ?? '').trim();
    if (!c) return '';
    return this.store.db().products.find((p) => p.barcode === c && p.id !== f.id)?.name ?? '';
  }
  /** Código leído con la cámara: queda cargado en el formulario y se cierra el lector. */
  alLeerCodigo(code: string) {
    const f = this.form();
    if (f) f.barcode = code;
    beep(true);
    this.msgCodigo.set('✔ Código leído: ' + code);
    this.camaraCodigo.set(false);
  }
  /** Reduce la foto a 200 px (lado mayor) en JPEG y la deja en el formulario. */
  subirFoto(ev: Event, f: any) {
    const input = ev.target as HTMLInputElement, file = input.files?.[0];
    input.value = '';
    this.fotoError.set('');
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { this.fotoError.set('La foto debe ser PNG, JPG o WebP.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 200 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        f.image = c.toDataURL('image/jpeg', 0.82);
      };
      img.onerror = () => this.fotoError.set('No se pudo leer la imagen.');
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }
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
    const base = { image: f.image ?? '', name: f.name.trim(), barcode: f.barcode, categoryId: f.categoryId, supplierId: f.supplierId, cost: +f.cost || 0, price: +f.price || 0, offer: +f.offer || 0, lowStock: +f.lowStock || 0, idealStock: +f.idealStock || 0, iva: f.iva, combo };
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
