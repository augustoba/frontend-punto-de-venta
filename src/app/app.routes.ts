import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { PlaceholderComponent } from './pages/placeholder.component';
import { ALL_ITEMS } from './nav';

/** Pantallas ya construidas (el resto usa PlaceholderComponent). */
const BUILT: Record<string, () => Promise<any>> = {
  ventas: () => import('./pages/ventas/ventas.component').then((m) => m.VentasComponent),
  stock: () => import('./pages/stock/stock.component').then((m) => m.StockComponent),
  clientes: () => import('./pages/partes/partes.component').then((m) => m.PartesComponent),
  proveedores: () => import('./pages/partes/partes.component').then((m) => m.PartesComponent),
};

export const routes: Routes = [
  // Caja registradora: pantalla completa, sin menú lateral (como en Envi)
  { path: 'caja', loadComponent: () => import('./pages/caja/caja.component').then((m) => m.CajaComponent), title: 'Caja registradora - Punto de venta' },
  {
    path: '',
    component: ShellComponent,
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
