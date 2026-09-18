# Mejoras a hacer (a partir del análisis de Ventario)

Origen: `backend-punto-de-venta/referencia-ventario/ANALISIS_COMPARATIVO.md`.
Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⏸ diferido a propósito.

## Prioridad 1
| # | Mejora | Estado | Fecha | Notas |
|---|---|---|---|---|
| 1 | **Dashboard** (tarjetas, análisis financiero, top días/productos, ventas por hora, alertas) | ✅ | 2026-09-18 | `/dashboard` es ahora la pantalla de inicio. 4 tarjetas de color, análisis diario (barras/línea) con selector de mes, resumen financiero (bruta, egresos, neta, tendencia), gastos, top 5 días, ventas por hora, top productos, márgenes bajos, cuentas corrientes, caja, proveedores, stock bajo y últimos movimientos. 3 pruebas. |
| 2 | **Primeros pasos** + píldora de progreso + recorrido guiado del POS + estados vacíos que guían | ⬜ | | |
| 3 | **POS**: chips de categoría y grilla con foto, Recargo, atajos F1/F4/F6/F7/F8, indicador de escáner, accesos rápidos | ⬜ | | |
| 4 | **Devoluciones / cambios** (stock y dinero) y notas de crédito de prueba | ⬜ | | |
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
