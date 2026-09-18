import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { PlaceholderComponent } from './pages/placeholder.component';
import { ALL_ITEMS } from './nav';
import { authGuard } from './core/auth';

/** Pantallas ya construidas (el resto usa PlaceholderComponent). */
const BUILT: Record<string, () => Promise<any>> = {
  ventas: () => import('./pages/ventas/ventas.component').then((m) => m.VentasComponent),
  stock: () => import('./pages/stock/stock.component').then((m) => m.StockComponent),
  cuentas: () => import('./pages/cuentas/cuentas.component').then((m) => m.CuentasComponent),
  'cierres-caja': () => import('./pages/cierres/cierres.component').then((m) => m.CierresComponent),
  compras: () => import('./pages/compras/compras.component').then((m) => m.ComprasComponent),
  presupuestos: () => import('./pages/presupuestos/presupuestos.component').then((m) => m.PresupuestosComponent),
  facturas: () => import('./pages/facturas/facturas.component').then((m) => m.FacturasComponent),
  reportes: () => import('./pages/reportes/reportes.component').then((m) => m.ReportesComponent),
  'historial-stock': () => import('./pages/historiales/historiales.component').then((m) => m.HistorialesComponent),
  'historial-precios': () => import('./pages/historiales/historiales.component').then((m) => m.HistorialesComponent),
  'ajustes-stock': () => import('./pages/historiales/historiales.component').then((m) => m.HistorialesComponent),
  categorias: () => import('./pages/categorias/categorias.component').then((m) => m.CategoriasComponent),
  empleados: () => import('./pages/empleados/empleados.component').then((m) => m.EmpleadosComponent),
  horas: () => import('./pages/empleados/empleados.component').then((m) => m.EmpleadosComponent),
  transferencias: () => import('./pages/transferencias/transferencias.component').then((m) => m.TransferenciasComponent),
  accesos: () => import('./pages/accesos/accesos.component').then((m) => m.AccesosComponent),
  ajustes: () => import('./pages/ajustes/ajustes.component').then((m) => m.AjustesComponent),
  clientes: () => import('./pages/partes/partes.component').then((m) => m.PartesComponent),
  proveedores: () => import('./pages/partes/partes.component').then((m) => m.PartesComponent),
};

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent), title: 'Ingresar - Punto de venta' },
  // Caja registradora: pantalla completa, sin menú lateral (como en Envi)
  { path: 'caja', loadComponent: () => import('./pages/caja/caja.component').then((m) => m.CajaComponent), title: 'Caja registradora - Punto de venta', canActivate: [authGuard] },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ventas' },
      ...ALL_ITEMS.map((i) =>
        BUILT[i.path]
          ? { path: i.path, loadComponent: BUILT[i.path], title: `${i.label} - Punto de venta` }
          : { path: i.path, component: PlaceholderComponent, title: `${i.label} - Punto de venta` }
      ),
    ],
  },
  { path: '**', redirectTo: '' },
];
