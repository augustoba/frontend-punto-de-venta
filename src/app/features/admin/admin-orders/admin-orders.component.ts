import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { ExportService } from '../../../core/services/export.service';
import { Order, OrderStatus, PAYMENT_LABELS } from '../../../core/models/order.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, SkeletonComponent, PaginationComponent],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css',
})
export class AdminOrdersComponent {
  private readonly orderService = inject(OrderService);
  private readonly exporter = inject(ExportService);

  exportCsv(): void {
    this.exporter.download('/admin/export/orders.csv', 'pedidos.csv', {
      search: this.search().trim() || undefined,
      status: this.statusFilter() || undefined,
      from: this.from() || undefined,
      to: this.to() || undefined,
    });
  }

  readonly orders = this.orderService.orders;
  readonly status = this.orderService.status;
  readonly page = this.orderService.page;
  readonly totalPages = this.orderService.totalPages;
  readonly totalElements = this.orderService.totalElements;
  readonly reload = () => this.orderService.reload();
  readonly goToPage = (n: number) => this.orderService.loadPage(n);

  // --- filtros ---
  readonly search = signal('');
  readonly statusFilter = signal<OrderStatus | ''>('');
  readonly from = signal('');
  readonly to = signal('');

  // --- KPIs (calculados sobre la página cargada; el total de pedidos viene del backend) ---
  readonly pendingOnPage = computed(() => this.orders().filter((o) => o.status === 'PENDIENTE').length);
  readonly amountOnPage = computed(() =>
    this.orders()
      .filter((o) => o.status !== 'CANCELADO')
      .reduce((sum, o) => sum + o.total, 0)
  );

  readonly statusLabel: Record<OrderStatus, string> = {
    PENDIENTE: 'Pendiente',
    PROCESADO: 'Confirmado',
    CANCELADO: 'Cancelado',
  };

  paymentLabel(o: Order): string {
    return o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] : '—';
  }

  readonly hasFilters = computed(
    () => !!this.search() || !!this.statusFilter() || !!this.from() || !!this.to()
  );

  constructor() {
    this.orderService.ensureLoaded();
  }

  applyFilters(): void {
    this.orderService.setFilters({
      search: this.search(),
      status: this.statusFilter(),
      from: this.from(),
      to: this.to(),
    });
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.from.set('');
    this.to.set('');
    this.applyFilters();
  }
}
