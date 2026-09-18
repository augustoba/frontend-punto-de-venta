import { Routes } from '@angular/router';
import { adminGuard, permissionGuard, superAdminGuard } from './core/guards/admin.guard';
import { productResolver } from './features/admin/admin-product-form/product.resolver';
import { orderResolver } from './features/admin/admin-order-detail/order.resolver';

export const routes: Routes = [
  // Punto de venta independiente: NO hay tienda pública. La raíz lleva al panel.
  // (Las páginas del ecommerce quedan en el repo sin ruta; ver docs/ROADMAP_ENVI.md, parte P0.)
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login/admin-login.component').then(
        (m) => m.AdminLoginComponent
      ),
    title: 'Ingresar | Admin',
  },
  {
    path: 'admin/recuperar',
    loadComponent: () =>
      import('./features/admin/admin-recover/admin-recover.component').then(
        (m) => m.AdminRecoverComponent
      ),
    title: 'Recuperar contraseña | Admin',
  },
  {
    path: 'admin/restablecer-clave',
    loadComponent: () =>
      import('./features/admin/admin-reset-password/admin-reset-password.component').then(
        (m) => m.AdminResetPasswordComponent
      ),
    title: 'Elegir contraseña nueva | Admin',
  },
  {
    path: 'admin/recibo/:id',
    canActivate: [adminGuard, permissionGuard],
    data: { permission: 'ORDERS_VIEW' },
    loadComponent: () =>
      import('./features/admin/admin-receipt/admin-receipt.component').then(
        (m) => m.AdminReceiptComponent
      ),
    resolve: { order: orderResolver },
    title: 'Recibo',
  },
  {
    path: 'admin/recibo-cambio/:id',
    canActivate: [adminGuard, permissionGuard],
    data: { permission: 'EXCHANGES_USE' },
    loadComponent: () =>
      import('./features/admin/admin-receipt/admin-exchange-receipt.component').then(
        (m) => m.AdminExchangeReceiptComponent
      ),
    title: 'Recibo de cambio',
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent
      ),
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
        title: 'Inicio | Admin',
      },
      {
        path: 'productos',
        canActivate: [permissionGuard],
        data: { permission: 'PRODUCTS_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-products/admin-products.component').then(
            (m) => m.AdminProductsComponent
          ),
        title: 'Productos | Admin',
      },
      {
        path: 'productos/nuevo',
        canActivate: [permissionGuard],
        data: { permission: 'PRODUCTS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-product-form/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent
          ),
        resolve: { product: productResolver },
        title: 'Nuevo producto | Admin',
      },
      {
        path: 'productos/:id/editar',
        canActivate: [permissionGuard],
        data: { permission: 'PRODUCTS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-product-form/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent
          ),
        resolve: { product: productResolver },
        title: 'Editar producto | Admin',
      },
      {
        path: 'qr-producto/:id',
        canActivate: [permissionGuard],
        data: { permission: 'PRODUCTS_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-product-qr/admin-product-qr.component').then(
            (m) => m.AdminProductQrComponent
          ),
        resolve: { product: productResolver },
        title: 'QR del producto | Admin',
      },
      {
        path: 'codigo-producto/:id',
        canActivate: [permissionGuard],
        data: { permission: 'PRODUCTS_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-product-barcode/admin-product-barcode.component').then(
            (m) => m.AdminProductBarcodeComponent
          ),
        resolve: { product: productResolver },
        title: 'Código de barras | Admin',
      },
      {
        path: 'turnos',
        canActivate: [permissionGuard],
        data: { permission: 'SHIFTS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-shifts/admin-shifts.component').then(
            (m) => m.AdminShiftsComponent
          ),
        title: 'Turnos | Admin',
      },
      {
        path: 'ventas/nueva',
        canActivate: [permissionGuard],
        data: { permission: 'POS_USE' },
        loadComponent: () =>
          import('./features/admin/admin-pos/admin-pos.component').then((m) => m.AdminPosComponent),
        title: 'Venta en el local | Admin',
      },
      {
        path: 'kiosco',
        canActivate: [permissionGuard],
        data: { permission: 'POS_USE' },
        loadComponent: () =>
          import('./features/admin/admin-kiosco/admin-kiosco.component').then((m) => m.AdminKioscoComponent),
        title: 'Punto de venta | Admin',
      },
      {
        path: 'cambios',
        canActivate: [permissionGuard],
        data: { permission: 'EXCHANGES_USE' },
        loadComponent: () =>
          import('./features/admin/admin-exchange/admin-exchanges.component').then(
            (m) => m.AdminExchangesComponent
          ),
        title: 'Cambios | Admin',
      },
      {
        path: 'caja',
        canActivate: [permissionGuard],
        data: { permission: 'CASH_REGISTER_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-cash-register/admin-cash-register.component').then(
            (m) => m.AdminCashRegisterComponent
          ),
        title: 'Caja | Admin',
      },
      {
        path: 'cambios/nuevo',
        canActivate: [permissionGuard],
        data: { permission: 'POS_USE' },
        loadComponent: () =>
          import('./features/admin/admin-exchange/admin-exchange-new.component').then(
            (m) => m.AdminExchangeNewComponent
          ),
        title: 'Registrar cambio | Admin',
      },
      {
        path: 'pedidos',
        canActivate: [permissionGuard],
        data: { permission: 'ORDERS_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-orders/admin-orders.component').then(
            (m) => m.AdminOrdersComponent
          ),
        title: 'Pedidos | Admin',
      },
      {
        path: 'pedidos/:id',
        canActivate: [permissionGuard],
        data: { permission: 'ORDERS_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-order-detail/admin-order-detail.component').then(
            (m) => m.AdminOrderDetailComponent
          ),
        resolve: { order: orderResolver },
        title: 'Pedido | Admin',
      },
      {
        path: 'carrusel',
        canActivate: [permissionGuard],
        data: { permission: 'CAROUSEL_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-hero-slides/admin-hero-slides.component').then(
            (m) => m.AdminHeroSlidesComponent
          ),
        title: 'Carrusel | Admin',
      },
      {
        path: 'inicio',
        canActivate: [permissionGuard],
        data: { permission: 'CAROUSEL_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-page-blocks/admin-page-blocks.component').then(
            (m) => m.AdminPageBlocksComponent
          ),
        title: 'Página de inicio | Admin',
      },
      {
        path: 'parametrias',
        canActivate: [permissionGuard],
        data: { permission: 'PARAMS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-params/admin-params.component').then(
            (m) => m.AdminParamsComponent
          ),
        title: 'Parametrías | Admin',
      },
      {
        path: 'proveedores',
        canActivate: [permissionGuard],
        data: { permission: 'SUPPLIERS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-suppliers/admin-suppliers.component').then(
            (m) => m.AdminSuppliersComponent
          ),
        title: 'Proveedores | Admin',
      },
      {
        path: 'talles',
        canActivate: [permissionGuard],
        data: { permission: 'SIZE_SCALES_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-size-scales/admin-size-scales.component').then(
            (m) => m.AdminSizeScalesComponent
          ),
        title: 'Talles | Admin',
      },
      {
        path: 'promociones',
        canActivate: [permissionGuard],
        data: { permission: 'DISCOUNTS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-promos/admin-promos.component').then(
            (m) => m.AdminPromosComponent
          ),
        title: 'Descuentos | Admin',
      },
      {
        path: 'cupones',
        canActivate: [permissionGuard],
        data: { permission: 'COUPONS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-coupons/admin-coupons.component').then(
            (m) => m.AdminCouponsComponent
          ),
        title: 'Cupones | Admin',
      },
      {
        path: 'campanias',
        canActivate: [permissionGuard],
        data: { permission: 'MARKETING_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-campaigns/admin-campaigns.component').then(
            (m) => m.AdminCampaignsComponent
          ),
        title: 'Campañas | Admin',
      },
      {
        path: 'usuarios',
        canActivate: [permissionGuard],
        data: { permission: 'USERS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-users/admin-users.component').then(
            (m) => m.AdminUsersComponent
          ),
        title: 'Usuarios y roles | Admin',
      },
      {
        path: 'metricas',
        canActivate: [permissionGuard],
        data: { permission: 'METRICS_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-metrics/admin-metrics.component').then(
            (m) => m.AdminMetricsComponent
          ),
        title: 'Métricas | Admin',
      },
      {
        path: 'gastos',
        canActivate: [permissionGuard],
        data: { permission: 'EXPENSES_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-expenses/admin-expenses.component').then(
            (m) => m.AdminExpensesComponent
          ),
        title: 'Gastos | Admin',
      },
      {
        path: 'balance',
        canActivate: [permissionGuard],
        data: { permission: 'FINANCE_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-balance/admin-balance.component').then(
            (m) => m.AdminBalanceComponent
          ),
        title: 'Balance | Admin',
      },
      {
        path: 'movimientos-stock',
        canActivate: [permissionGuard],
        data: { permission: 'STOCK_MOVEMENTS_VIEW' },
        loadComponent: () =>
          import('./features/admin/admin-stock-movements/admin-stock-movements.component').then(
            (m) => m.AdminStockMovementsComponent
          ),
        title: 'Movimientos de stock | Admin',
      },
      {
        path: 'config',
        canActivate: [permissionGuard],
        data: { permission: 'PLATFORM_SETTINGS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-config-hub.component').then(
            (m) => m.AdminConfigHubComponent
          ),
        title: 'Configuración del sitio | Admin',
      },
      {
        path: 'config/apariencia',
        canActivate: [permissionGuard],
        data: { permission: 'PLATFORM_SETTINGS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-appearance/admin-appearance.component').then(
            (m) => m.AdminAppearanceComponent
          ),
        title: 'Apariencia | Admin',
      },
      {
        path: 'config/identidad',
        canActivate: [permissionGuard],
        data: { section: 'identity', permission: 'PLATFORM_SETTINGS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-config-section.component').then(
            (m) => m.AdminConfigSectionComponent
          ),
        title: 'Identidad y contacto | Admin',
      },
      {
        path: 'config/redes',
        canActivate: [permissionGuard],
        data: { section: 'social', permission: 'PLATFORM_SETTINGS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-config-section.component').then(
            (m) => m.AdminConfigSectionComponent
          ),
        title: 'Redes sociales | Admin',
      },
      {
        path: 'config/nosotros',
        canActivate: [permissionGuard],
        data: { section: 'about', permission: 'PLATFORM_SETTINGS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-config-section.component').then(
            (m) => m.AdminConfigSectionComponent
          ),
        title: 'Sobre nosotros | Admin',
      },
      {
        path: 'config/whatsapp',
        canActivate: [permissionGuard],
        data: { section: 'whatsapp', permission: 'PLATFORM_SETTINGS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-config-section.component').then(
            (m) => m.AdminConfigSectionComponent
          ),
        title: 'Mensaje de WhatsApp | Admin',
      },
      {
        path: 'config/pagos',
        canActivate: [permissionGuard],
        data: { section: 'pagos', permission: 'PAYMENTS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-config-section.component').then(
            (m) => m.AdminConfigSectionComponent
          ),
        title: 'Medios de pago | Admin',
      },
      {
        path: 'config/mercadopago',
        canActivate: [permissionGuard],
        data: { permission: 'PAYMENTS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-mercadopago.component').then(
            (m) => m.AdminMercadoPagoComponent
          ),
        title: 'Mercado Pago | Admin',
      },
      {
        path: 'config/arca',
        canActivate: [permissionGuard],
        data: { permission: 'PAYMENTS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-arca.component').then(
            (m) => m.AdminArcaComponent
          ),
        title: 'Facturación (ARCA) | Admin',
      },
      {
        path: 'config/ayuda',
        canActivate: [permissionGuard],
        data: { permission: 'PLATFORM_SETTINGS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-help/admin-help.component').then((m) => m.AdminHelpComponent),
        title: 'Cómo comprar + FAQ | Admin',
      },
      {
        path: 'config/servicios',
        canActivate: [permissionGuard],
        data: { permission: 'PLATFORM_SETTINGS_MANAGE' },
        loadComponent: () =>
          import('./features/admin/admin-config/admin-mail-settings.component').then(
            (m) => m.AdminMailSettingsComponent
          ),
        title: 'Servicio de mail | Admin',
      },
      { path: 'ajustes', redirectTo: 'config', pathMatch: 'full' },
      {
        path: 'superadmin/cloudinary',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/admin-superadmin/admin-superadmin-cloudinary.component').then(
            (m) => m.AdminSuperadminCloudinaryComponent
          ),
        title: 'Cloudinary | Admin',
      },
      {
        path: 'superadmin/mail',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/admin-superadmin/admin-superadmin-mail.component').then(
            (m) => m.AdminSuperadminMailComponent
          ),
        title: 'Mail (SMTP) | Admin',
      },
      {
        path: 'superadmin/tiendas',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/admin-superadmin/admin-superadmin-tiendas.component').then(
            (m) => m.AdminSuperadminTiendasComponent
          ),
        title: 'Tiendas | Admin',
      },
      {
        path: 'superadmin/planes',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/admin-superadmin/admin-plans.component').then(
            (m) => m.AdminPlansComponent
          ),
        title: 'Planes | Admin',
      },
      {
        path: 'cuenta',
        loadComponent: () =>
          import('./features/admin/admin-account/admin-account.component').then(
            (m) => m.AdminAccountComponent
          ),
        title: 'Mi cuenta | Admin',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
