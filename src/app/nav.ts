/** Navegación del panel (réplica del menú de Envi). Una sola fuente de verdad: menú + rutas. */
export interface NavItem {
  label: string;
  path: string;
  subtitle: string;
  /** Ícono Font Awesome (sin el prefijo fa-). */
  icon: string;
  /** Si está, el ítem se muestra dentro de un desplegable con ese nombre. */
  group?: string;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Inicio',
    items: [
      { label: 'Dashboard', path: 'dashboard', subtitle: 'Resumen de tu negocio.', icon: 'gauge-high' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { label: 'Reportes', path: 'reportes', subtitle: 'Analizá el rendimiento de tu negocio con reportes.', icon: 'chart-line' },
      { label: 'Historial de precios', path: 'historial-precios', subtitle: 'Seguí cómo cambiaron los precios de tus productos.', icon: 'chart-simple', group: 'Historial' },
      { label: 'Historial de stock', path: 'historial-stock', subtitle: 'Revisá todos los movimientos de stock de tus productos.', icon: 'chart-simple', group: 'Historial' },
      { label: 'Ajustes de stock', path: 'ajustes-stock', subtitle: 'Revisá los ajustes masivos de stock: quién los hizo, cuándo y qué tocaron.', icon: 'sliders', group: 'Historial' },
      { label: 'Cierres de caja', path: 'cierres-caja', subtitle: 'Consultá los cierres de caja de cada turno.', icon: 'cash-register', group: 'Historial' },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { label: 'Ventas', path: 'ventas', subtitle: 'Creá, editá y monitoreá las ventas de tu negocio.', icon: 'tag' },
      { label: 'Presupuestos', path: 'presupuestos', subtitle: 'Armá presupuestos y convertilos en ventas.', icon: 'file-lines' },
      { label: 'Facturas', path: 'facturas', subtitle: 'Emití y consultá las facturas de tu negocio.', icon: 'file-invoice' },
    ],
  },
  {
    title: 'Productos y servicios',
    items: [
      { label: 'Stock', path: 'stock', subtitle: 'Cargá productos, gestioná stock y actualizá precios.', icon: 'boxes-stacked' },
      { label: 'Compras y pedidos', path: 'compras', subtitle: 'Registrá las compras a proveedores y seguí sus pedidos.', icon: 'bag-shopping' },
      { label: 'Transferencias de stock', path: 'transferencias', subtitle: 'Seguí las transferencias de stock entre depósitos.', icon: 'truck-ramp-box' },
    ],
  },
  {
    title: 'Cuentas corrientes',
    items: [
      { label: 'Cuentas y saldos', path: 'cuentas', subtitle: 'Revisá el dinero disponible por caja y banco, y seguí cada movimiento.', icon: 'building-columns' },
      { label: 'Clientes', path: 'clientes', subtitle: 'Gestioná tus clientes, sus datos y sus deudas.', icon: 'user-group' },
      { label: 'Proveedores', path: 'proveedores', subtitle: 'Controlá quién te abastece, cuánto le debés y cómo viene cada cuenta corriente.', icon: 'truck' },
    ],
  },
  {
    title: 'Usuarios',
    items: [
      { label: 'Empleados', path: 'empleados', subtitle: 'Controlá el equipo de cada sucursal, sus permisos y las horas trabajadas.', icon: 'users', group: 'Empleados' },
      { label: 'Horas trabajadas', path: 'horas', subtitle: 'Controlá las horas que trabaja cada empleado.', icon: 'clock', group: 'Empleados' },
      { label: 'Accesos', path: 'accesos', subtitle: 'Tu contraseña y los usuarios que pueden ingresar.', icon: 'key' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { label: 'Ajustes', path: 'ajustes', subtitle: 'Configurá cómo funciona tu negocio dentro de la app.', icon: 'gear' },
      { label: 'Categorías', path: 'categorias', subtitle: 'Organizá tu catálogo en categorías.', icon: 'tags', group: 'Listas y catálogos' },
    ],
  },
];

export const ALL_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);
