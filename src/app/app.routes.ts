import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { PlaceholderComponent } from './pages/placeholder.component';
import { ALL_ITEMS } from './nav';

/** Pantallas ya construidas (el resto usa PlaceholderComponent). */
const BUILT: Record<string, () => Promise<any>> = {
  ventas: () => import('./pages/ventas/ventas.component').then((m) => m.VentasComponent),
};

export const routes: Routes = [
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
