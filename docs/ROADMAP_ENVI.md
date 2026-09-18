# Roadmap: llevar el POS al nivel de Envi (por partes)

Fuente de la referencia: `../backend-punto-de-venta/referencia-envi/` (README.md, `ANALISIS_*.md`, `vistas/*.html`, `tokens.css`).
Se trabaja **de a una parte chica por vez** (pedido del cliente y del dueño del repo): cada parte queda cerrada (back + front + prueba + esta doc) antes de empezar la siguiente. Si se corta la sesión, se retoma desde la primera parte que no esté en ✅.

Leyenda: ⬜ pendiente · 🔄 en curso · ✅ hecha.

## Cómo retomar (para quien continúe, humano o Claude)
1. Leer este archivo y el `README.md` de `referencia-envi`.
2. Tomar la primera parte ⬜/🔄 de abajo. Leer solo el `ANALISIS_*.md` que indica la parte.
3. Al terminar: tildar ✅, anotar archivos tocados y decisiones en "Bitácora", y agregar la línea al historial de `PROYECTO.md`.
4. No mezclar partes. No tocar lo que no figura en la parte.

## Contexto importante (decisión del dueño, 2026-09-18)
Este repo (y su backend hermano) es **el punto de venta como proyecto INDIVIDUAL**. Más adelante se va a **migrar/integrar al ecommerce**, pero por ahora **no tiene nada que ver con el ecommerce ni con "Estilos Pequeños"**. El código heredó la base del ecommerce (tienda pública, talles, WhatsApp, marca), y se va aislando por partes. La referencia a copiar es **Envi** (`../backend-punto-de-venta/referencia-envi/`), no el panel de Estilos Pequeños.

## Estado de partes

### Etapa P — Aislar el POS del ecommerce
| Parte | Qué | Estado |
|---|---|---|
| P0 | Sin tienda pública (`/` → `/admin`), sin marca visible, defaults neutros (front + back) | ✅ |
| P1 | Borrar el código muerto de la tienda (catalog, cart, product-detail, orders, help, servicios de carrito/WhatsApp) | ⬜ |
| P2 | Productos genéricos (sin talles/`sizeStocks`) para kiosco/almacén | ⬜ |
| P3 | Limpiar textos "Estilos Pequeños"/Cloudinary por defecto restantes y `PROYECTO.md`/`CLAUDE.md` de ambos repos | ⬜ |

### Etapa A — Diseño (solo front, sin riesgo de datos)
| Parte | Qué | Estado |
|---|---|---|
| A1 | Sistema de diseño opt-in `pnl-*` (`src/panel-theme.css`) | ✅ |
| A2 | Layout del panel con estilo Envi (sidebar claro agrupado, topbar, fondo degradé) | ✅ |
| A3 | Pantalla piloto: Pedidos con KPIs + filtros + tabla (detalle queda en su página) | ✅ |
| A4 | Venta en el local (POS): buscador+grilla+resumen y tarjeta de cobro (la caja de turnos queda en A5) | ✅ |
| A5 | Resto de listados con el patrón (Stock, Proveedores, Gastos, Turnos) | ⬜ |
| A6 | Reportes con pestañas (torta, línea vs mes anterior, barras por día) | ⬜ |

### Etapa B — Lógica (back + front, de a una)
| Parte | Qué | Referencia | Estado |
|---|---|---|---|
| B1 | Cuentas (caja/banco) + libro de movimientos + transferencia entre cuentas | `ANALISIS_tesoreria.md` | ⬜ |
| B2 | Cuenta corriente de clientes (saldo corrido, pago, devolución, aumento de deuda) | `ANALISIS_cuentas_corrientes.md` | ⬜ |
| B3 | Arqueo de caja: apertura/cierre con esperado vs real, diferencias, verificado | `ANALISIS_caja.md` | ⬜ |
| B4 | Descuentos: por línea (monto/%/precio final) + automático por medio de pago | `ANALISIS_presupuestos_descuentos.md` | ⬜ |
| B5 | Pedidos de compra Borrador→Pedido→Recibido con recepción y deuda a proveedor | `ANALISIS_facturas_compras.md` | ⬜ |
| B6 | Libro de movimientos de stock con tipos + edición en línea | `ANALISIS_stock.md` | ⬜ |
| B7 | Listas de precios (Principal/Mayorista) y combos | `ANALISIS_stock.md` | ⬜ |
| B8 | Presupuestos → convertir a venta | `ANALISIS_presupuestos_descuentos.md` | ⬜ |
| B9 | Cheques, centros de costos y rentabilidad por categoría | `ANALISIS_tesoreria.md` | ⬜ |

Orden sugerido de la etapa B: B1 → B2 → B3 (dependen del libro) → B4 → B5 → B6 → resto.

## Guía de diseño (Etapa A)
- Tema claro. Fondo `#f3f1ed` + degradé cálido; tarjetas de vidrio translúcidas; botón principal `#21213b`; fuente Montserrat (hoy el panel usa Nunito/Baloo: decidir en A2 si se cambia solo dentro del panel).
- Todo se hace con las clases `pnl-*` de `src/panel-theme.css` (raíz `.pnl` + `.pnl-page`). No usar colores sueltos: usar variables `--pnl-*`.
- Patrón de pantalla: título + subtítulo → fila de KPIs (`pnl-kpis`/`pnl-kpi`) → toolbar (buscar, filtrar, acción principal) → tabla (`pnl-table`) con menú ⋮ por fila → paginación (`pnl-pager`).
- Chips de estado: `pnl-badge-{blue|green|amber|red|gray}`. Avatares: `pnl-avatar`.
- Modales: `pnl-backdrop` + `pnl-modal`.
- Modo oscuro existente (`data-mode="dark"`): por ahora el panel nuevo es solo claro; reasignar `--pnl-*` en `[data-mode="dark"] .pnl` es tarea futura.

## Bitácora
- **A1** (2026-09-18): creado `src/panel-theme.css` (tokens `--pnl-*` + clases `pnl-*`) e importado en `src/styles.css`. No cambia nada visible hasta que un componente use las clases. `npm install` hecho para poder compilar.
- **A2** (2026-09-18): `admin-layout.component.html` reescrito con `pnl pnl-page`, sidebar claro (`pnl-side`, `pnl-nav-item`, `pnl-nav-sub`, `pnl-count`) y topbar (`pnl-topbar`). El `.ts` no cambió (mismos grupos, badges, drawer mobile). Fuente: se mantiene Nunito/Baloo (decisión: no cambiar tipografía todavía). Las pantallas hijas siguen con su estilo actual sobre el fondo degradé; se migran en A3-A6. Verificado: `ng build` OK. Pendiente de verificar a ojo con backend corriendo (no se levantó MySQL en esta sesión).
- **A3** (2026-09-18): `admin-orders` (`/admin/pedidos`) migrado al patrón: título/subtítulo, 3 KPIs (`pnl-kpi`), toolbar con búsqueda + recargar + CSV, panel de filtros (`pnl-card`), tabla `pnl-table` con columnas nuevas **Origen** (Web/Local, `order.channel`) y **Pago** (`PAYMENT_LABELS`), chips de estado y avatar del cliente. La lógica (filtros, paginación, CSV) no cambió; se agregaron en el `.ts` `pendingOnPage`, `amountOnPage`, `statusLabel`, `paymentLabel()`. Los KPIs "Pendientes" y "Monto" se calculan **sobre la página cargada** (limitación: no hay endpoint de resumen; se podría agregar en B-etapa). El detalle del pedido sigue siendo una página aparte (`admin-order-detail`, no migrada todavía → A5). Verificado: `ng build` OK; sin verificar a ojo.
- **A4** (2026-09-18): `admin-pos` migrado a `pnl-*` sin tocar el `.ts` ni un solo binding. Izquierda: buscador + escáner (`pnl-toolbar`), grilla de productos con talles como botones, y tarjeta "Resumen de la venta" con chip de cantidad de productos. Derecha (sticky en desktop): tarjeta de cobro con secciones "Cliente y vendedor" / "Pago", medios como botones (el activo en `pnl-btn-cta`), avisos de vuelto/falta con `pnl-note`, cupón, subtotal/descuento/cupón y **Total a cobrar** grande, botón "Registrar venta" de 48px. **No incluido** (a propósito, es lógica nueva y va en la etapa B): selector de cliente del padrón, "Está pago" → cuenta corriente (B2), descuento por línea (B4), atajos de teclado, lista de precios (B7). Las pantallas de turnos y caja (`admin-shifts`, `admin-cash-register`) se migran en A5 junto con el arqueo (B3). Verificado: `ng build` OK; sin verificar a ojo.
- **P0** (2026-09-18): front: `app.routes.ts` sin las 5 rutas públicas (`''`, `producto/:id`, `carrito`, `como-comprar`, `mis-pedidos`); `''` redirige a `admin` (el comodín `**` también cae ahí). `index.html` → título "Punto de venta"; `SettingsService.DEFAULTS` neutros (nombre "Punto de venta", sin texto/redes); login/recuperar sin alt de marca; quitado el botón "Ver tienda" del menú. Back: `SiteSettingsService.defaults()`, `AppProperties` (tenant), `application.yml` (`TENANT_NAME`) y título de OpenAPI → "Punto de venta". **No** se tocó la base de datos existente: el nombre y textos ya guardados se editan desde el panel (Ajustes/Config). Quedan a propósito: Cloudinary (`estilospequenos` como preset por defecto, es config funcional), placeholders de mails, `database/seed.sql` y el código de la tienda sin ruta (P1/P3). Verificado: `ng build` y `mvnw compile` OK.
