# Punto de venta — front (Angular 19)

Proyecto **individual** (por ahora sin relación con el ecommerce; más adelante se migra). Réplica de la lógica y las vistas de **Envi**.
Referencia completa: `../backend-punto-de-venta/referencia-envi/` (README, `ANALISIS_*.md`, `vistas/*.html`, `tokens.css`).

> Historia: este repo tenía antes el front de un ecommerce (Estilos Pequeños). Se recreó desde cero el 2026-09-18. El estado anterior está en el tag git `base-ecommerce-antes-de-recrear`.

## Cómo correr
```
npm install
npm start        # http://localhost:4200
```

## Estructura
- `src/styles.css` — tokens y componentes visuales de Envi (copiados de `referencia-envi/tokens.css`).
- `src/app/nav.ts` — menú y rutas (una sola fuente de verdad).
- `src/app/shell/` — sidebar + topbar.
- `src/app/pages/` — una carpeta por pantalla. Las que no están construidas usan `PlaceholderComponent`.
- Para construir una pantalla: crear `pages/<nombre>/<nombre>.component.ts` y registrarla en `BUILT` de `app.routes.ts`.

## Cómo retomar
1. Leer este archivo y el `README.md` de `referencia-envi`.
2. Tomar la primera parte ⬜ de la lista. Leer solo su `ANALISIS_*.md` y su `vistas/NN-*.html`.
3. Al terminar: tildar ✅, anotar en la bitácora, commitear (una parte = un commit).

## Partes (front)
| # | Pantalla / tema | Referencia | Estado |
|---|---|---|---|
| F0 | Proyecto nuevo + shell (menú, topbar) + estilos Envi | `tokens.css` | ✅ |
| F1 | Ventas (KPIs del día, filtros, tabla, detalle, anular, exportar CSV) | `vistas/01-ventas.html` | ✅ |
| F1b | Núcleo de datos y lógica (`core/models.ts`, `core/store.ts`, 14 tests) | `ANALISIS_*.md` | ✅ |
| F2 | Caja registradora + cobro + descuentos + arqueo (apertura/cierre) + atajos | `vistas/02`, `03`, `ANALISIS_caja.md` | ✅ |
| F3 | Stock (listado, filtros, edición en línea, masivos, combo, carga masiva) | `vistas/05`, `ANALISIS_stock.md` | ✅ |
| F4 | Clientes y proveedores (ficha, cuenta corriente, movimientos) | `vistas/08`, `ANALISIS_cuentas_corrientes.md` | ✅ |
| F5 | Cuentas y saldos (libro, cheques, centros de costos) | `vistas/07`, `ANALISIS_tesoreria.md` | ✅ |
| F6 | Cierres de caja (turnos, diferencias por empleado, verificado) | `vistas/12`, `ANALISIS_caja.md` | ✅ |
| F7 | Compras y pedidos (asistente 3 pasos, recepción) | `vistas/06`, `ANALISIS_facturas_compras.md` | ✅ |
| F8 | Presupuestos y facturas | `vistas/14` | ✅ |
| F9 | Reportes (6 pestañas con gráficos) | `vistas/04` | ✅ |
| F10 | Empleados, horas, categorías, ajustes, historiales (stock, precios, ajustes) | `vistas/09`, `10`, `11`, `13` | ✅ |
| F11a | Infraestructura API: proxy `/api`→8081, `HttpClient`, `core/api.ts`, indicador de conexión | — | ✅ |
| F11b+ | Migrar los módulos del store a la API, uno por uno (tesorería → catálogo → personas → ventas/caja → compras → resto) y login | — | ⬜ |

## Bitácora
- **F0/F1** (2026-09-18): recreado el front (`ng new` en el lugar, tras vaciar el repo viejo). Shell con el menú de Envi (`nav.ts`), pantalla Ventas con datos de muestra. Verificado en el navegador (`/ventas`). Sin backend todavía.
- **F1b** (2026-09-18): `core/store.ts` = única fuente de verdad, guarda en `localStorage` (`pos-db-v1`) hasta que exista la API (F11). Implementa las reglas de Envi: libro de movimientos por cuenta (caja/banco), libro de stock (sin tope negativo), cuenta corriente de clientes/proveedores con saldo corrido, ventas (deuda si no está paga, asiento en la cuenta, descuento automático por transferencia opcional, baja de stock incl. combos), apertura/cierre de caja con asientos de diferencia, compras Borrador→Pedido→Recibido, presupuestos, cheques, centros de costos, categorías, empleados/horas. `core/store.spec.ts`: 14 pruebas (`npx ng test --watch=false --browsers=ChromeHeadless`). Decisión: `transferDiscount` arranca en 0 (en Envi el demo tenía 10%); se configura en Ajustes.
- **F1/F2/F3** (2026-09-18): `pages/ventas`, `pages/caja` (ruta `/caja` fuera del shell, pantalla completa), `pages/stock`, más `shared/modal.component.ts` y `shared/format.ts` (pipes `money`, `fdate`, `ftime`). Caja: buscador con Enter (código exacto agrega directo), carrito, descuento por línea (monto/%/precio final sincronizados), modal de cobro (cliente con «* Nuevo cliente *», medio, «Está pago» → cuenta corriente, descuento global, factura, imprimir ticket), promociones, atajos (Alt+F/S/Q/M/+/-/X), crear producto rápido, arqueo (abrir/cerrar/otras operaciones cuando `settings.arqueo` está activo), «Convertir presupuesto» vía `?presupuesto=ID`. Verificado en el navegador: crear producto → vender → aparece en Ventas. Pendiente en Stock: listas de precios (Principal/Mayorista) y transferencias entre depósitos.
- **F4** (2026-09-18): `pages/partes` (un componente para `/clientes` y `/proveedores`, según la ruta): KPIs, listado, ficha con saldo corrido, alta/edición, «Registrar movimiento» con saldo resultante en vivo (cliente: pago/devolución/aumento de deuda; proveedor: pago/compra/nota de crédito/ajuste; el pago mueve dinero de la cuenta elegida). Verificado que renderiza en el navegador.
- **F5/F6** (2026-09-18): `pages/cuentas` (KPIs, cuentas caja/banco con alta/edición, libro de movimientos con filtro, ingreso/egreso con subcategoría obligatoria, movimiento entre cuentas, cheques a cobrar/pagar con resumen anual, centros de costos con 4 criterios y costos fijos) y `pages/cierres` (turnos con apertura/cierre/diferencia, alerta por umbral, verificado, notas, diferencias por empleado). Verificado: la venta hecha en la caja aparece como ingreso en Cuentas.
- **F7** (2026-09-18): `pages/compras`: KPIs, listado, asistente (proveedor → productos con último costo/variación % → resumen con PDF por impresión, CSV, copiar texto), guardado como Borrador, «Confirmar que lo envié» → Pedido, detalle y «Registrar recepción» (sube stock, actualiza costo, egreso de la cuenta si está pago o deuda con el proveedor). Pendiente: transferencias de stock entre depósitos (requieren depósitos, ver Ajustes).
- **F8** (2026-09-18): `pages/presupuestos` (KPIs, estados activo/vencido/vendido/rechazado/archivado, alta/edición con IVA 21% incluido, duplicar, imprimir, **convertir a venta** → abre la caja con el carrito y el cliente; al cobrar pasa a Vendido) y `pages/facturas` (facturas de prueba sin validez fiscal; también se generan desde Ventas y desde el cobro). Se agregó `SaleLine.cost/categoryId` (costo congelado al vender) para los reportes.
- **F9** (2026-09-18): `pages/reportes`: Ventas (torta por medio de pago con día navegable, «sólo cobradas», tarjetas día/semana/mes con comisión, línea mensual vs mes anterior, barras por día de la semana), Tesorería (ingresos/gastos por categoría en un rango, excluye transferencias entre cuentas), Stock (cantidad y valor a venta/costo, movimientos de 30 días), Productos (ranking con costo congelado y margen), Clientes (top mes/año/siempre) y Rentabilidad (costo fijo de los centros de costos repartido por facturación). Verificado en el navegador.
- **F10** (2026-09-18): `pages/historiales` (libro de stock con filtros, historial de precios con variación %, ajustes manuales por día), `pages/categorias` (categorías/subcategorías con color y emoji obligatorios), `pages/empleados` (empleados y **horas trabajadas** con la validación salida > entrada; sirve a `/empleados` y `/horas`), `pages/ajustes` (3 pestañas; cada switch/valor se guarda al instante y gobierna el comportamiento: arqueo, descuento automático por transferencia, etc.). **Sin construir:** `transferencias` (requiere depósitos múltiples; en el demo de Envi tampoco se podía usar sin activarlos) y facturación fiscal real (ARCA). Siguen como «en construcción».
- **F11a** (2026-09-18): `proxy.conf.json` (`/api` → `localhost:8081`, enlazado en `angular.json`), `provideHttpClient()`, `core/api.ts` (un método por recurso de la API) e indicador en el topbar (🟢 API / 🟠 Local según responda `/api/settings`). El store sigue en `localStorage` como respaldo: la migración por módulo (F11b+) es aparte porque el store es síncrono y cada pantalla lo lee directo; conviene hacerla módulo a módulo para no romper pantallas. La API todavía no tiene autenticación, por eso el login queda para el final.
- **F11b** (2026-09-18): `core/mappers.ts` traduce lo que devuelve pos-api al modelo del front (cuentas, movimientos, categorías, productos, libros de stock y precios, clientes, proveedores, cuenta corriente, ventas, sesiones de caja, compras, presupuestos, facturas, cheques, centros de costos, empleados, fichajes, ajustes). Funciones puras con 8 pruebas (`mappers.spec.ts`). Decisión: el store no se migra módulo a módulo porque una venta toca stock, caja y deuda a la vez; se agrega una capa de sincronización (hidratar desde la API y, con la API activa, escribir en el servidor y recargar) y se enciende con un flag cuando cubra todos los módulos.
