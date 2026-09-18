import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { ModalComponent } from '../../shared/modal.component';

interface PriceList { id: number; name: string; percent: number; main: boolean; }

/** Listas de precios: «Principal» (0 %) y las que se creen con un ajuste porcentual (Mayorista −15, Recargo +10). Requiere la API. */
@Component({
  selector: 'app-listas-precios',
  imports: [FormsModule, ModalComponent],
  template: `
    <app-modal title="Listas de precios" [width]="520" (closed)="closed.emit()">
      <p class="sub" style="margin-top:0">Cada lista ajusta el precio base en un porcentaje. En la caja elegís la lista de la venta. Un valor negativo es un descuento.</p>
      <table>
        <tr><th>Lista</th><th>Ajuste</th><th></th></tr>
        @for (l of listas(); track l.id) {
          <tr><td><b>{{ l.name }}</b>@if (l.main) { <span class="badge b-blue" style="margin-left:6px">base</span> }</td>
            <td>{{ l.percent > 0 ? '+' : '' }}{{ l.percent }} %</td>
            <td>@if (!l.main) { <button (click)="editar(l)">Editar</button> <button (click)="borrar(l)">Eliminar</button> }</td></tr>
        }
      </table>
      <div class="row" style="margin-top:14px">
        <label class="grow">NOMBRE<input name="ln" [(ngModel)]="nombre" placeholder="Mayorista" /></label>
        <label style="width:120px">AJUSTE %<input name="lp" type="number" [(ngModel)]="pct" /></label>
      </div>
      @if (error()) { <div style="color:#8a1c1c;margin-top:8px">{{ error() }}</div> }
      <div class="mf">
        @if (editId()) { <button (click)="limpiar()">Cancelar edición</button> }
        <button class="cta" [disabled]="!nombre.trim() || pct === null" (click)="guardar()">{{ editId() ? 'Guardar cambios' : 'Agregar lista' }}</button>
      </div>
    </app-modal>
  `,
})
export class ListasPreciosComponent {
  private readonly api = inject(Api);
  readonly closed = output<void>();
  readonly listas = signal<PriceList[]>([]);
  readonly error = signal('');
  readonly editId = signal<number | null>(null);
  nombre = '';
  pct: number | null = 0;

  constructor() { this.cargar(); }

  private msg(e: any): string { return e?.error?.error ?? 'No se pudo completar la operación (¿está activa la API?)'; }
  async cargar() { try { this.listas.set((await this.api.get<any[]>('/api/price-lists')).map((l) => ({ ...l, percent: Number(l.percent) }))); } catch (e) { this.error.set(this.msg(e)); } }

  editar(l: PriceList) { this.editId.set(l.id); this.nombre = l.name; this.pct = l.percent; this.error.set(''); }
  limpiar() { this.editId.set(null); this.nombre = ''; this.pct = 0; }

  async guardar() {
    this.error.set('');
    const body = { name: this.nombre, percent: this.pct };
    try {
      if (this.editId()) await this.api.put(`/api/price-lists/${this.editId()}`, body); else await this.api.post('/api/price-lists', body);
      this.limpiar(); await this.cargar();
    } catch (e) { this.error.set(this.msg(e)); }
  }

  async borrar(l: PriceList) {
    this.error.set('');
    try { await this.api.del(`/api/price-lists/${l.id}`); await this.cargar(); } catch (e) { this.error.set(this.msg(e)); }
  }
}
