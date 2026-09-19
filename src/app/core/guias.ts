import { TourStep } from '../shared/tour.component';

/**
 * Guía de la primera visita a cada pantalla del menú (la ruta es la clave). Se muestra una sola vez y se puede repetir con el botón de ayuda.
 * Los selectores son genéricos (`.kpis`, `.toolbar`, `table`…): si el elemento no está, el paso se muestra centrado.
 */
export const GUIAS: Record<string, TourStep[]> = {
  dashboard: [
    { titulo: 'Tu resumen del negocio', texto: 'Acá ves cómo viene el negocio de un vistazo: ventas, ganancia, gastos, caja y stock.' },
    { titulo: 'Tarjetas del día', texto: 'Productos, ventas de la semana, lo vendido hoy y las alertas de stock. Se actualizan solas.', selector: '.gcards' },
    { titulo: 'Solapas de reportes', texto: 'Resumen es el tablero del negocio. Tesorería, Stock, Productos, Clientes y Rentabilidad son los reportes: elegí una solapa para analizarla.', selector: '.tabs' },
    { titulo: 'Análisis financiero', texto: 'Ganancia y egresos día por día. Cambiá el mes con las flechas y alterná entre barras y línea.', selector: '.dash-grid > .card:first-child' },
    { titulo: 'Más abajo', texto: 'Top de días y productos, ventas por hora, márgenes bajos, cuentas corrientes y últimos movimientos.' },
  ],
  'historial-precios': [
    { titulo: 'Historial de precios', texto: 'Cada cambio de precio, costo u oferta queda registrado con fecha, quién lo hizo y la variación.' },
    { titulo: 'Buscá un producto', texto: 'Usá «Buscar por producto» o Filtrar para ver la evolución de uno solo.', selector: '.toolbar' },
  ],
  'historial-stock': [
    { titulo: 'Historial de stock', texto: 'El libro de todos los movimientos: ventas, compras, ajustes y creación de productos, con stock anterior y resultante.' },
    { titulo: 'Filtros', texto: 'Filtrá por producto o tipo de movimiento para investigar una diferencia.', selector: '.toolbar' },
  ],
  'ajustes-stock': [
    { titulo: 'Ajustes de stock', texto: 'Resumen por día de los ajustes manuales: cuántos productos se tocaron, entradas y salidas.' },
  ],
  'cierres-caja': [
    { titulo: 'Cierres de caja', texto: 'Cada turno con su apertura, cierre y diferencia entre lo contado y lo registrado.' },
    { titulo: 'Diferencias por empleado', texto: 'Mirá quién tiene más diferencias y configurá la alerta desde los botones de la barra.', selector: '.toolbar' },
    { titulo: 'Verificar y anotar', texto: 'En cada turno podés agregar notas y marcar el cierre como verificado.', selector: 'table' },
  ],
  ventas: [
    { titulo: 'Ventas', texto: 'Todas las ventas del negocio, con el detalle de cada una.' },
    { titulo: 'Resumen de hoy', texto: 'Cantidad vendida, monto y cómo se pagó.', selector: '.kpis' },
    { titulo: 'Buscar y filtrar', texto: 'Buscá por cliente o vendedor y filtrá por fecha, cliente o medio de pago.', selector: '.toolbar' },
    { titulo: 'Nueva venta', texto: 'Este botón abre la caja registradora para cobrar.', selector: '.toolbar .cta' },
    { titulo: 'Detalle y acciones', texto: '«Ver más» muestra los productos; el menú ⋮ permite generar factura o eliminar la venta.', selector: 'table' },
  ],
  presupuestos: [
    { titulo: 'Presupuestos', texto: 'Armá cotizaciones para tus clientes y convertilas en venta con un clic.' },
    { titulo: 'Estados', texto: 'Activos, vencidos, vendidos y rechazados: el resumen te dice cómo vienen.', selector: '.kpis' },
    { titulo: 'Nuevo presupuesto', texto: 'Cargá cliente, productos y vencimiento. Después podés imprimirlo o convertirlo en venta.', selector: '.toolbar .cta' },
  ],
  facturas: [
    { titulo: 'Facturas', texto: 'Comprobantes emitidos. Por ahora son facturas de prueba, sin validez fiscal.' },
    { titulo: 'Nueva factura', texto: 'También podés emitirlas desde el cobro en la caja o desde una venta.', selector: '.toolbar .cta' },
  ],
  stock: [
    { titulo: 'Stock', texto: 'Tu catálogo de productos con precios, costos e inventario.' },
    { titulo: 'Indicadores', texto: 'Cantidad de productos, stock crítico y el estado general del inventario.', selector: '.kpis' },
    { titulo: 'Buscar y filtrar', texto: 'Buscá por nombre o código de barras y filtrá por stock, proveedor o categoría.', selector: '.toolbar' },
    { titulo: 'Nuevo producto', texto: 'Creá un producto (o un combo, o cargá muchos de una vez con la carga masiva desde la flecha).', selector: '.menu.split' },
    { titulo: 'Editar stock al toque', texto: 'Tocá el número de inventario de un producto para corregirlo; el menú ⋮ tiene historial de precios y stock.', selector: 'table' },
  ],
  compras: [
    { titulo: 'Compras y pedidos', texto: 'Pedí mercadería a tus proveedores y registrá cuando llega.' },
    { titulo: 'Crear pedido', texto: 'Elegís proveedor, cargás productos y revisás costos. El stock recién cambia al registrar la recepción.', selector: '.toolbar .cta' },
    { titulo: 'Estados', texto: 'Borrador → Pedido → Recibido. Al recibir se actualiza el stock y el costo, y se genera el pago o la deuda.', selector: 'table' },
  ],
  transferencias: [
    { titulo: 'Transferencias de stock', texto: 'Mové mercadería entre depósitos sin cambiar el stock total.' },
    { titulo: 'Depósitos', texto: 'Creá depósitos con «Nuevo depósito» y mirá el stock de cada producto en cada uno.', selector: 'table' },
    { titulo: 'Nueva transferencia', texto: 'Elegí origen, destino y productos. Se valida que haya stock en el origen.', selector: '.toolbar .cta' },
  ],
  cuentas: [
    { titulo: 'Cuentas y saldos', texto: 'El dinero del negocio: cajas, bancos, cuentas corrientes y cheques.' },
    { titulo: 'Saldos', texto: 'Total en cajas y bancos, lo que te deben, lo que debés y los cheques.', selector: '.kpis' },
    { titulo: 'Movimientos', texto: 'Cada ingreso y egreso queda en el libro. «Crear movimiento» registra ingresos, egresos o pasos entre cuentas.', selector: '.toolbar' },
    { titulo: 'Centros de costos', texto: 'Repartí los costos fijos entre tus rubros para ver la rentabilidad real.', selector: '.toolbar' },
  ],
  clientes: [
    { titulo: 'Clientes', texto: 'Tus clientes, sus datos y sus deudas.' },
    { titulo: 'Cuenta corriente', texto: 'La columna de saldo muestra si están al día o te deben. El botón ⇄ registra un pago o movimiento.', selector: 'table' },
    { titulo: 'Nuevo cliente', texto: 'Cargá los datos básicos. Podés hacerlo también desde el cobro en la caja.', selector: '.toolbar .cta' },
  ],
  proveedores: [
    { titulo: 'Proveedores', texto: 'Quién te abastece, cuánto le debés y cómo viene cada cuenta corriente.' },
    { titulo: 'Registrar movimiento', texto: 'Cargá pagos, compras, notas de crédito o ajustes de saldo.', selector: '.toolbar' },
  ],
  empleados: [
    { titulo: 'Empleados', texto: 'Tu equipo y las horas trabajadas en el período.' },
    { titulo: 'Crear empleado', texto: 'Cargá nombre, rol y fecha de ingreso. Las horas se registran en «Horas trabajadas».', selector: '.toolbar .cta' },
  ],
  horas: [
    { titulo: 'Horas trabajadas', texto: 'Registrá entradas y salidas de cada empleado para llevar el control de horas.' },
    { titulo: 'Nueva entrada / salida', texto: 'Elegí empleado, fecha y horario. La salida debe ser posterior a la entrada.', selector: '.toolbar .cta, .empty-hero .cta' },
  ],
  accesos: [
    { titulo: 'Accesos', texto: 'Tu contraseña y los usuarios que pueden ingresar al sistema.' },
    { titulo: 'Cambiar contraseña', texto: 'Hacelo apenas ingreses por primera vez. Si sos administrador también creás y desactivás usuarios.' },
  ],
  ajustes: [
    { titulo: 'Ajustes', texto: 'Configurá cómo funciona tu negocio. Todo se guarda al instante.' },
    { titulo: 'Pestañas', texto: 'Mi negocio (logo, color, contacto), Ventas y caja, Productos y stock y Finanzas.', selector: '.tabs' },
    { titulo: 'Logo y color', texto: 'Tocá el recuadro del logo para subir tu imagen y elegí el color del negocio.' },
  ],
  categorias: [
    { titulo: 'Categorías', texto: 'Organizá tus productos y tus movimientos de dinero con categorías y subcategorías.' },
    { titulo: 'Nueva categoría', texto: 'Cada una lleva un color y un emoji. Después agregás subcategorías con «+ Subcategoría».', selector: '.toolbar .cta' },
  ],
};

const prefijo = 'pos-guia-';
export const guiaVista = (ruta: string): boolean => { try { return localStorage.getItem(prefijo + ruta) === '1'; } catch { return true; } };
export const marcarGuiaVista = (ruta: string): void => { try { localStorage.setItem(prefijo + ruta, '1'); } catch { /* sin storage */ } };
/** «Ver de nuevo las guías»: borra las marcas de visto. */
export const reiniciarGuias = (): void => { try { Object.keys(localStorage).filter((k) => k.startsWith(prefijo)).forEach((k) => localStorage.removeItem(k)); } catch { /* sin storage */ } };
