import { Component, inject } from '@angular/core';
import { Api } from './core/api';
import { Auth } from './core/auth';
import { Store } from './core/store';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'punto-de-venta';
  private readonly api = inject(Api);
  private readonly store = inject(Store);
  private readonly auth = inject(Auth);
  /** Se conecta acá (y no en el shell) para que también valga en /caja, que va fuera del shell. */
  constructor() {
    this.api.ping().then((up) => {
      const s = this.auth.session();
      if (up && s) { this.store.setUser(s.username); this.store.connect(); }
    });
  }
}
