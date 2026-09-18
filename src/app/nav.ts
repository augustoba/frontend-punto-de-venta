/** Navegación del panel (réplica del menú de Envi). Una sola fuente de verdad: menú + rutas. */
export interface NavItem {
  label: string;
  path: string;
  subtitle: string;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Análisis',
    items: [
      { label: 'Reportes', path: 'reportes', subtitle: 'Analizá el rendimiento de tu negocio con reportes.' },
      { label: 'Historial de precios', path: 'historial-precios', subtitle: 'Seguí cómo cambiaron los precios de tus productos.' },
      { label: 'Historial de stock', path: 'historial-stock', subtitle: 'Revisá todos los movimientos de stock de tus productos.' },
      { label: 'Ajustes de stock', path: 'ajustes-stock', subtitle: 'Revisá los ajustes masivos de stock: quién los hizo, cuándo y qué tocaron.' },
      { label: 'Cierres de caja', path: 'cierres-caja', subtitle: 'Consultá los cierres de caja de cada turno.' },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { label: 'Ventas', path: 'ventas', subtitle: 'Creá, editá y monitoreá las ventas de tu negocio.' },
      { label: 'Presupuestos', path: 'presupuestos', subtitle: 'Armá presupuestos y convertilos en ventas.' },
      { label: 'Facturas', path: 'facturas', subtitle: 'Emití y consultá las facturas de tu negocio.' },
    ],
  },
  {
    title: 'Productos y servicios',
    items: [
      { label: 'Stock', path: 'stock', subtitle: 'Cargá productos, gestioná stock y actualizá precios.' },
      { label: 'Compras y pedidos', path: 'compras', subtitle: 'Registrá las compras a proveedores y seguí sus pedidos.' },
      { label: 'Transferencias de stock', path: 'transferencias', subtitle: 'Seguí las transferencias de stock entre depósitos.' },
    ],
  },
  {
    title: 'Cuentas corrientes',
    items: [
      { label: 'Cuentas y saldos', path: 'cuentas', subtitle: 'Revisá el dinero disponible por caja y banco, y seguí cada movimiento.' },
      { label: 'Clientes', path: 'clientes', subtitle: 'Gestioná tus clientes, sus datos y sus deudas.' },
      { label: 'Proveedores', path: 'proveedores', subtitle: 'Controlá quién te abastece, cuánto le debés y cómo viene cada cuenta corriente.' },
    ],
  },
  {
    title: 'Usuarios',
    items: [
      { label: 'Empleados', path: 'empleados', subtitle: 'Controlá el equipo de cada sucursal, sus permisos y las horas trabajadas.' },
      { label: 'Horas trabajadas', path: 'horas', subtitle: 'Controlá las horas que trabaja cada empleado.' },
      { label: 'Accesos', path: 'accesos', subtitle: 'Tu contraseña y los usuarios que pueden ingresar.' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { label: 'Ajustes', path: 'ajustes', subtitle: 'Configurá cómo funciona tu negocio dentro de la app.' },
      { label: 'Categorías', path: 'categorias', subtitle: 'Organizá tu catálogo en categorías.' },
    ],
  },
];

export const ALL_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);
