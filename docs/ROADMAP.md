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
| F1 | Ventas (listado con KPIs, buscador, tabla; datos de muestra) | `vistas/01-ventas.html` | ✅ (sin backend) |
| F1b | Núcleo de datos y lógica (`core/models.ts`, `core/store.ts`, 14 tests) | `ANALISIS_*.md` | ✅ |
| F2 | Caja registradora + modal de cobro + atajos | `vistas/02`, `03`, `ANALISIS.md` | ⬜ |
| F3 | Stock (listado, filtros, edición en línea, masivos, combo) | `vistas/05`, `ANALISIS_stock.md` | ⬜ |
| F4 | Clientes y proveedores (ficha, cuenta corriente, movimientos) | `vistas/08`, `ANALISIS_cuentas_corrientes.md` | ⬜ |
| F5 | Cuentas y saldos (libro, cheques, centros de costos) | `vistas/07`, `ANALISIS_tesoreria.md` | ⬜ |
| F6 | Cierres de caja + apertura/cierre | `vistas/12`, `ANALISIS_caja.md` | ⬜ |
| F7 | Compras y pedidos (asistente 3 pasos, recepción) | `vistas/06`, `ANALISIS_facturas_compras.md` | ⬜ |
| F8 | Presupuestos y facturas | `vistas/14` | ⬜ |
| F9 | Reportes (6 pestañas) | `vistas/04` | ⬜ |
| F10 | Empleados, horas, categorías, ajustes | `vistas/09`, `10`, `11` | ⬜ |
| F11 | Login y conexión con la API (reemplaza los datos de muestra) | — | ⬜ |

## Bitácora
- **F0/F1** (2026-09-18): recreado el front (`ng new` en el lugar, tras vaciar el repo viejo). Shell con el menú de Envi (`nav.ts`), pantalla Ventas con datos de muestra. Verificado en el navegador (`/ventas`). Sin backend todavía.
- **F1b** (2026-09-18): `core/store.ts` = única fuente de verdad, guarda en `localStorage` (`pos-db-v1`) hasta que exista la API (F11). Implementa las reglas de Envi: libro de movimientos por cuenta (caja/banco), libro de stock (sin tope negativo), cuenta corriente de clientes/proveedores con saldo corrido, ventas (deuda si no está paga, asiento en la cuenta, descuento automático por transferencia opcional, baja de stock incl. combos), apertura/cierre de caja con asientos de diferencia, compras Borrador→Pedido→Recibido, presupuestos, cheques, centros de costos, categorías, empleados/horas. `core/store.spec.ts`: 14 pruebas (`npx ng test --watch=false --browsers=ChromeHeadless`). Decisión: `transferDiscount` arranca en 0 (en Envi el demo tenía 10%); se configura en Ajustes.
