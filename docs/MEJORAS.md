# Mejoras a hacer (a partir del análisis de Ventario)

Origen: `backend-punto-de-venta/referencia-ventario/ANALISIS_COMPARATIVO.md`.
Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⏸ diferido a propósito.

## Prioridad 1
| # | Mejora | Estado | Fecha | Notas |
|---|---|---|---|---|
| 1 | **Dashboard** (tarjetas, análisis financiero, top días/productos, ventas por hora, alertas) | ✅ | 2026-09-18 | `/dashboard` es ahora la pantalla de inicio. 4 tarjetas de color, análisis diario (barras/línea) con selector de mes, resumen financiero (bruta, egresos, neta, tendencia), gastos, top 5 días, ventas por hora, top productos, márgenes bajos, cuentas corrientes, caja, proveedores, stock bajo y últimos movimientos. 3 pruebas. |
| 2 | **Primeros pasos** + píldora de progreso + recorrido guiado del POS + estados vacíos que guían | ✅ | 2026-09-18 | `/primeros-pasos` (2 esenciales + 3 recomendados, con avance real calculado de los datos), píldora «Configuración N %» en el encabezado (se oculta al 100 %), botón de ayuda flotante, recorrido de 9 pasos en la caja (arranca solo la primera vez si se puede vender; botón «?» para repetirlo) y estados vacíos con botón de acción en Stock, Ventas, Clientes y Proveedores. 3 pruebas. **Ampliado:** guía de primera visita en cada pantalla del menú (`core/guias.ts`, 20 guías de 2 a 5 pasos), una sola vez por pantalla; el botón de ayuda la repite y en Primeros pasos hay «Ver de nuevo las guías». 3 pruebas más. |
| 3 | **POS**: chips de categoría y grilla con foto, Recargo, atajos F1/F4/F6/F7/F8, indicador de escáner, accesos rápidos | ✅ | 2026-09-18 | Barra de 6 accesos de color (Caja, Proveedores, Gastos F7, Cierre F4, Historial F6, Dashboard); indicador «LECTOR ACTIVO/EN PAUSA»; modo **Rápida (F1)** con F8 que guarda al toque en efectivo; **Descuento y Recargo** en el carrito y en el cobro (recargo también en el servidor y en el modo local); grilla de productos con foto/precio según la lista, chips por categoría y aviso de sin stock. 2 pruebas (local) + 1 (API). Nota técnica: un segundo `@HostListener` del mismo evento en la misma clase no se registra; los atajos F pasan por el oyente único `atajo`. |
| 4 | **Devoluciones / cambios** (stock y dinero) y notas de crédito de prueba | 🔄 | 2026-09-18 | Backend hecho y publicado (B18, 74 pruebas). Falta el front: acción «Devolver» en Ventas, modal con productos/cantidades/motivo/forma de reintegro, listado de devoluciones, nota de crédito imprimible, ajuste del Dashboard y reportes (las devoluciones no son gastos), hidratación y modo local. |
| 5 | **Control de stock con motivos** (baja, consumo interno, ajuste manual) + reporte de pérdidas | ⬜ | | |
| 6 | **Auditoría de stock** (conteo físico vs. sistema, planilla, revisar y aplicar) | ⬜ | | |
| 7 | **Reportes**: Reposición (qué reponer), Rotación ABC, Stock bajo, Valorización | ⬜ | | |

## Prioridad 2
| # | Mejora | Estado | Fecha | Notas |
|---|---|---|---|---|
| 8 | Motor de promociones (3×2, combo precio fijo, vigencias, métricas) | ⬜ | | |
| 9 | Libro IVA Ventas / Compras + exportación CSV | ⬜ | | |
| 10 | Producto: subcategoría, marca, stock mínimo visible, códigos alternativos, hasta 3 imágenes, variantes, importar desde Excel | ⬜ | | |
| 11 | Cuentas corrientes con vencimientos y saldo a favor; clientes con categorías y origen; alta sin duplicados | ⬜ | | |
| 12 | Presupuestos: PDF con logo, WhatsApp, seña | ⬜ | | |
| 13 | Gastos como pantalla; Control de caja en tiempo real; PIN de administrador; plata personal del dueño | ⬜ | | |
| 14 | Órdenes de compra separadas de las compras; borradores compartidos | ⬜ | | |

## Prioridad 3 / integraciones
| # | Mejora | Estado | Fecha | Notas |
|---|---|---|---|---|
| 15 | Canal de tienda online (catálogo público, pedidos en tablero, cupones) — integración con Estilos Pequeños | ⏸ | | Se diseña como integración, no como duplicado |
| 16 | MercadoLibre, referidos, horarios de atención, perfil con % de avance | ⬜ | | |
| 17 | Venta por peso, múltiples monedas, lotes, ARCA | ⏸ | | Ver «Cambios posibles» en ROADMAP.md |

## Bitácora
- 2026-09-18: creado este tablero. Se empieza por la prioridad 1, en orden.
- 2026-09-18: ✅ #1 Dashboard. Siguiente: #2 Primeros pasos.
- 2026-09-18: ✅ #2 Primeros pasos, recorrido del POS y estados vacíos. Siguiente: #3 mejoras del POS.
- 2026-09-18: ✅ #2 ampliado: guías de primera visita por pantalla (idea del usuario, vista en Ventario).
- 2026-09-18: ✅ #3 mejoras del POS. Siguiente: #4 devoluciones.
- 2026-09-18: 🔄 #4 devoluciones: backend listo (B18). Programado retomado automático cada 30 min (CronCreate, sólo mientras la sesión esté abierta).

## Pedidos del usuario fuera del análisis
| Mejora | Estado | Fecha | Notas |
|---|---|---|---|
| Cobro en efectivo: **dinero recibido y vuelto** (el cajero no calcula) | ✅ | 2026-09-18 | En el cobro, «Dinero recibido» con atajos de billetes (Exacto y los más cercanos), vuelto en verde o «faltan» en rojo; no deja guardar si falta plata (sólo en efectivo); aviso «Vuelto $X» al guardar y el ticket imprime recibido y vuelto. |
| Caja: botón **Lector** visible junto al de la cámara | ✅ | 2026-09-18 | El ícono de código de barras abre el modo «esperando el lector»; la cámara tiene su propio ícono. Igual que en el alta de producto. |
- 2026-09-18: ✅ pedidos del usuario: vuelto en el cobro y botón de lector en la caja.
