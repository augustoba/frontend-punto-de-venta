# Próxima sesión — dónde quedamos y qué falta

Última actualización: 2026-09-18 (sesión pausada a pedido del usuario). El retomado automático (cron) fue cancelado.
Seguimiento detallado: `docs/MEJORAS.md`. Historial técnico: `docs/ROADMAP.md`. Análisis de Ventario: `backend-punto-de-venta/referencia-ventario/ANALISIS_COMPARATIVO.md`. Análisis de Envi: `backend-punto-de-venta/referencia-envi/`.

## 1. Páginas de referencia que ya vimos (no hace falta volver a explorarlas)
| Referencia | Dirección | Fecha | Notas |
|---|---|---|---|
| **Envi (maxkiosco)** | https://maxkiosco.myenvi.website | 2026-09-18 | Demo con acceso limitado en el tiempo. Se recorrieron todas las pantallas: `/sales`, `/reports` (6 pestañas), `/budgets`, `/invoices`, `/products`, `/purchases`, `/stock-transfers`, `/accounting`, `/customers`, `/suppliers`, `/employees`, `/employees-schedules`, `/settings` (4 pestañas), `/categories`, `/pricing-history`, `/stock-history`, `/stock-adjustments`, `/cash-register-manager`, `/cash-register`. |
| **Ventario** | https://www.ventario.com.ar/bienvenida | 2026-09-18 | Cuenta de prueba PRO de 7 días, vacía. Se recorrieron: `/bienvenida`, `/dashboard`, `/inventario/productos`, `/inventario/promociones`, `/inventario/compras`, `/inventario/control-stock`, `/inventario/auditoria`, `/caja/control`, `/fiados`, `/caja/tesoreria`, `/tienda-online/{configuracion,catalogo,pedidos,cupones}`, `/clientes`, `/vendedores`, `/providers`, `/movimientos/gastos`, `/history`, `/reports`, `/fiscal`, `/presupuestos`, `/configuracion`, POS en `/overlay`. Falta ver: `/integraciones/mercadolibre`. |

## 2. Cómo levantar todo
- **API** (`backend-punto-de-venta/pos-api`): `./mvnw spring-boot:run` (puerto 8081; MySQL `puntoventa`, usuario/clave `root`/`root`, se crea sola). Tests: `./mvnw -q test` (74 pasan).
- **Front** (`frontend-punto-de-venta`): `npx ng serve --port 4200` (proxy `/api` → 8081). Tests: `npx ng test --watch=false --browsers=ChromeHeadless` (44 pasan).
- **Login:** `admin` / `admin` (cambiarla en Accesos; en producción definir `AUTH_SECRET` y `ADMIN_PASSWORD`).
- **Git:** ambos repos en `main`, con remoto `origin` en GitHub (`augustoba/...`). El usuario pidió **commit y push al terminar cada paso**, con el trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## 3. Estado de las mejoras (resumen; el detalle está en MEJORAS.md)
- ✅ #1 Dashboard · ✅ #2 Primeros pasos + guía de primera visita por pantalla + recorrido del POS · ✅ #3 POS (accesos rápidos, modo Rápida F1, recargo, grilla, atajos F).
- ✅ Extras pedidos: dinero recibido y vuelto en el cobro; botón «Lector» visible (caja y alta de producto); botones −/+ del carrito compactos; código de barras escaneable en el alta; fotos de producto; Servicios sin stock; listas de precios; depósitos y transferencias.
- 🔄 **#4 Devoluciones y cambios:** el **backend está hecho y publicado** (B18: `com.pdv.returns`, 7 pruebas). **Falta el front** (ver 4.1).
- 🔄 **Fusión Reportes → Dashboard** (pedido del usuario): **hecha en código, con build y 44 pruebas verdes, pero NO verificada en Chrome** (se perdió la pestaña). Ver 4.0.

## 4. Lo que falta, en orden

### 4.0 Verificar y cerrar la fusión Reportes + Dashboard
Qué se hizo: el Dashboard ahora tiene solapas **Resumen | Tesorería | Stock | Productos | Clientes | Rentabilidad**; «Resumen» es el tablero y el resto son los reportes de antes (`ReportesComponent` en modo `embebido` con `tabFija`). Se quitó «Reportes» del menú; `/reportes` redirige a `/dashboard`. Se agregó al Resumen la tarjeta «Ventas por medio de pago» (lo valioso de la antigua pestaña Ventas de Reportes). La guía del Dashboard ganó un paso sobre las solapas.
Pendiente: mirarlo en el navegador (que no haya títulos dobles, que las solapas carguen bien y que la tarjeta de medios de pago se vea). Si el código antiguo de la pestaña «ventas» de `reportes.component.ts` ya no se usa, borrarlo.

### 4.1 #4 Devoluciones — parte del front
- Acción **«Devolver»** en el menú ⋮ de Ventas (y en el detalle de la venta).
- Modal: productos y cantidades (usa `GET /api/sales/{id}/returnable`), motivo, si vuelve al stock o es merma, y forma de reintegro (efectivo / transferencia / tarjeta / a cuenta corriente / cambio).
- Listado de devoluciones y **nota de crédito imprimible** (`NC-000001-NNNNNN`, de prueba).
- Agregar en `core/api.ts`, `mappers.ts`, `remote.ts` (hidratar `returns`), `remote-ops.ts` (`registerReturn`), `models.ts` (`SaleReturn`) y la contraparte en el **modo local** del `store.ts` (con pruebas).
- Ajustes derivados: el Dashboard y Tesorería no deben contar las devoluciones (`sourceType 'devolucion'`) como gasto; la ganancia bruta del Dashboard debe restar lo devuelto; agregar `'Devolución'` al mapa de íconos de motivos del historial de stock.
- Historial de ventas: pestaña o filtro «Devoluciones».

### 4.2 Resto de la prioridad 1
- **#5 Control de stock con motivos:** registrar ingreso/egreso con motivo (baja por pérdida o daño, consumo interno, ajuste manual), proveedor y nota; historial con el usuario; reporte de **pérdidas**.
- **#6 Auditoría de stock:** asistente Iniciar → Descargar planilla → Importar → Revisar y aplicar (conteo físico contra el sistema).
- **#7 Reportes nuevos** (como solapas o tarjetas del Dashboard): Reposición (qué reponer e inversión estimada), Rotación ABC, Stock bajo, Valorización.

### 4.3 Prioridad 2 (de MEJORAS.md)
#8 motor de promociones (3×2, combo a precio fijo, vigencias, métricas) · #9 Libro IVA Ventas/Compras con exportación CSV · #10 producto: subcategoría, marca, stock mínimo visible, códigos alternativos, hasta 3 imágenes, variantes, importar desde Excel · #11 cuentas corrientes con vencimientos y saldo a favor, clientes con categorías y origen, alta sin duplicados · #12 presupuestos con PDF, WhatsApp y seña · #13 Gastos como pantalla, control de caja en tiempo real, PIN de administrador, plata personal · #14 órdenes de compra separadas de las compras y borradores compartidos.

### 4.4 Lo que el usuario pidió sumar
- **Venta por peso** (pidió hacerla): cantidades decimales (kg/lt). Hoy el stock y las líneas son enteros. Toca stock y libro de stock (backend `int` → decimal), ventas, compras, combos, impresión, mappers y modo local; unidad Uni/Kg/Lt en el producto (Ventario lo tiene en el formulario).
- «Todas las mejoras que faltaban»: además de lo anterior, los ítems que están como «Próximamente» en Ajustes: **Envíos en la caja**, **Conciliación bancaria**, **Múltiples monedas**; y los diferidos (lotes, ARCA, canal de tienda online como integración con Estilos Pequeños, MercadoLibre, referidos, horarios de atención, perfil con % de avance).

## 5. Pendientes chicos / deudas conocidas
- No se probó la **cámara real** (pide permiso al navegador) ni la **impresión del ticket con vuelto** en una impresora.
- Falta ver `/integraciones/mercadolibre` en Ventario.
- Limpieza a cargo del usuario: carpeta sobrante `punto de venta/pos-web/` y el backend viejo de ecommerce en la raíz de `backend-punto-de-venta` (todavía mezclan este proyecto con «Estilos Pequeños»).
- Antes de producción: `AUTH_SECRET`, `ADMIN_PASSWORD`, cambiar la clave `admin`.
- Warning inofensivo de Angular NG8107 en `compras.component.ts`.

## 6. Cosas que aprendí y conviene recordar
- Los comandos de Bash con scripts largos o comillas complicadas fallan: **escribir los scripts de Python con la herramienta Write** (a `%TEMP%`) y ejecutarlos.
- Un **segundo `@HostListener` del mismo evento en la misma clase no se registra**: en la caja los atajos F pasan por el único oyente `atajo`.
- Las pruebas del backend corren en **H2**: no detectan palabras reservadas de MySQL (`real`, `day`, `order`, `group`, `key`…); probar contra MySQL real al agregar columnas.
- Con el **arqueo activo** hay que abrir la caja para vender (también por API); al abrir con un saldo distinto del último cierre se genera un movimiento de diferencia.
- El mapa de pestañas de Chrome de la herramienta se pierde entre sesiones: llamar a `tabs_context_mcp` (con `createIfEmpty`) antes de usar el navegador.
- Las sesiones de prueba de caja que se abran por la UI conviene **cerrarlas** al terminar (por API: `POST /api/cash/close`).
- El usuario prefiere que no se le pregunte qué sigue: seguir en orden, commitear y pushear al terminar cada paso, y anotar todo en MEJORAS.md.
