# Roadmap: llevar el POS al nivel de Envi (por partes)

Fuente de la referencia: `../backend-punto-de-venta/referencia-envi/` (README.md, `ANALISIS_*.md`, `vistas/*.html`, `tokens.css`).
Se trabaja **de a una parte chica por vez** (pedido del cliente y del dueño del repo): cada parte queda cerrada (back + front + prueba + esta doc) antes de empezar la siguiente. Si se corta la sesión, se retoma desde la primera parte que no esté en ✅.

Leyenda: ⬜ pendiente · 🔄 en curso · ✅ hecha.

## Cómo retomar (para quien continúe, humano o Claude)
1. Leer este archivo y el `README.md` de `referencia-envi`.
2. Tomar la primera parte ⬜/🔄 de abajo. Leer solo el `ANALISIS_*.md` que indica la parte.
3. Al terminar: tildar ✅, anotar archivos tocados y decisiones en "Bitácora", y agregar la línea al historial de `PROYECTO.md`.
4. No mezclar partes. No tocar lo que no figura en la parte.

## Estado de partes

### Etapa A — Diseño (solo front, sin riesgo de datos)
| Parte | Qué | Estado |
|---|---|---|
| A1 | Sistema de diseño opt-in `pnl-*` (`src/panel-theme.css`) | ✅ |
| A2 | Layout del panel con estilo Envi (sidebar claro agrupado, topbar, fondo degradé) | ⬜ |
| A3 | Pantalla piloto: Ventas/Pedidos con KPIs + filtros + tabla + modal detalle | ⬜ |
| A4 | Cobro (modal "Guardar venta") y caja registradora (2 columnas, atajos) | ⬜ |
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
