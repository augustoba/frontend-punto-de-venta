import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../shared/modal.component';
import { Store } from '../../core/store';

const COLORES = ['#e5476b', '#ef7c3a', '#f4a340', '#f2c531', '#8a8f3c', '#8fc24a', '#2cbfa5', '#6fc2a5', '#5aa9e6', '#1f8fa8', '#1f5fb0', '#666666', '#aaaaaa', '#a267ac', '#d970c0'];
const EMOJIS = ['🛒', '🍞', '🥤', '🍺', '🥛', '🍪', '🧴', '🧹', '📦', '💡', '🚗', '🏢', '💳', '💰', '👥', '📰', '🔧', '🎁', '🍎', '🥩'];

/** Categorías y subcategorías (compartidas por el catálogo y la tesorería). */
@Component({
  selector: 'app-categorias',
  imports: [FormsModule, ModalComponent],
  template: `
    <h1>Categorías</h1>
    <p class="sub" style="margin-bottom: 2px">Organizá tu catálogo en categorías.</p>
    <p class="sub" style="margin-top: 0">Organizá tus movimientos con categorías y subcategorías.</p>
    <div class="toolbar"><input class="search" placeholder="Buscar categoría o subcategoría..." [ngModel]="q()" (ngModelChange)="q.set($event)" /><span class="sp"></span>
      <button><i class="fa-solid fa-filter"></i>Filtrar</button>
      <button class="cta" (click)="nueva()"><i class="fa-solid fa-plus"></i>Nueva categoría</button></div>
    @for (c of lista(); track c.id) {
      <div class="cat-card">
        <div class="cat-head"><span>Categoría</span><span>Acciones</span></div>
        <div class="cat-row main">
          <span class="cat-tile" [style.background]="c.color + '33'">{{ c.emoji }}</span>
          <b class="grow" [style.color]="c.color">{{ c.name }} <span class="badge b-blue">{{ c.subs.length }}</span></b>
          <button class="pillbtn" (click)="sub.set({ catId: c.id, name: '' })"><i class="fa-solid fa-plus"></i>Subcategoría</button>
          <button class="sq blue" (click)="editar(c)" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="sq" (click)="store.deleteCategory(c.id)" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
        @for (s of c.subs; track s.id) {
          <div class="cat-row subrow">
            <span class="cat-tile sm" [style.background]="c.color + '33'">{{ c.emoji }}</span>
            <span class="grow" [style.color]="c.color">{{ s.name }}</span>
            <button class="sq blue" (click)="renombrar.set({ catId: c.id, id: s.id, name: s.name })" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="sq danger" (click)="store.deleteSubcategory(c.id, s.id)" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
          </div>
        }
      </div>
    }
    @if (form(); as f) {
      <app-modal [title]="f['id'] ? 'Editar categoría' : 'Nueva categoría'" [width]="460" (closed)="form.set(null)">
        <div class="field"><label>Categoría</label><input [(ngModel)]="f['name']" /></div>
        <div class="field" style="margin-top: 10px"><label>Color (obligatorio)</label><div class="row" style="flex-wrap: wrap; gap: 8px">
          @for (c of colores; track c) { <i style="width: 22px; height: 22px; border-radius: 50%; cursor: pointer" [style.background]="c" [style.outline]="f['color'] === c ? '2px solid #333' : 'none'" (click)="f['color'] = c"></i> }</div></div>
        <div class="field" style="margin-top: 10px"><label>Emoji (obligatorio)</label><div class="row" style="flex-wrap: wrap; gap: 6px">
          @for (e of emojis; track e) { <button style="height: 34px; width: 34px; padding: 0" [style.outline]="f['emoji'] === e ? '2px solid #333' : 'none'" (click)="f['emoji'] = e">{{ e }}</button> }</div></div>
        <div class="mf"><button (click)="form.set(null)">Cancelar</button><button class="cta" [disabled]="!f['name']?.trim() || !f['color'] || !f['emoji']" (click)="guardar(f)">Aceptar</button></div>
      </app-modal>
    }
    @if (renombrar(); as r) {
      <app-modal title="Editar subcategoría" [width]="400" (closed)="renombrar.set(null)">
        <div class="field"><label>Nombre</label><input [(ngModel)]="r['name']" /></div>
        <div class="mf"><button (click)="renombrar.set(null)">Cancelar</button><button class="cta" [disabled]="!r['name']?.trim()" (click)="store.renameSubcategory(r['catId'], r['id'], r['name'].trim()); renombrar.set(null)">Aceptar</button></div>
      </app-modal>
    }
    @if (sub(); as s) {
      <app-modal title="Nueva subcategoría" [width]="400" (closed)="sub.set(null)">
        <div class="field"><label>Nombre</label><input [(ngModel)]="s['name']" /></div>
        <div class="mf"><button (click)="sub.set(null)">Cancelar</button><button class="cta" [disabled]="!s['name']?.trim()" (click)="store.addSubcategory(s['catId'], s['name'].trim()); sub.set(null)">Aceptar</button></div>
      </app-modal>
    }
  `,
})
export class CategoriasComponent {
  readonly renombrar = signal<any>(null);
  readonly store = inject(Store);
  readonly colores = COLORES; readonly emojis = EMOJIS;
  readonly q = signal(''); readonly form = signal<any>(null); readonly sub = signal<any>(null);
  readonly lista = computed(() => { const q = this.q().trim().toLowerCase(); return this.store.categories().filter((c) => !q || c.name.toLowerCase().includes(q) || c.subs.some((s) => s.name.toLowerCase().includes(q))); });
  nueva() { this.form.set({ name: '', color: '', emoji: '' }); }
  editar(c: any) { this.form.set({ id: c.id, name: c.name, color: c.color, emoji: c.emoji }); }
  guardar(f: any) { this.store.saveCategory({ id: f.id, name: f.name.trim(), emoji: f.emoji, color: f.color }); this.form.set(null); }
}
