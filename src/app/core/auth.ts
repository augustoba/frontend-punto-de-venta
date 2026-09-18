import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Api } from './api';

export interface Session { username: string; role: 'ADMIN' | 'VENDEDOR'; }
const KEY = 'pos-session-v1';

function load(): { token: string; user: Session } | null {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return s?.token ? s : null; } catch { return null; }
}

/** Sesión del usuario: token y datos guardados en el navegador; el servidor valida cada pedido. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private saved = load();
  readonly session = signal<Session | null>(this.saved?.user ?? null);

  token(): string | null { return this.saved?.token ?? null; }
  isAdmin(): boolean { return this.session()?.role === 'ADMIN'; }

  async login(username: string, password: string): Promise<void> {
    const r = await firstValueFrom(this.http.post<{ token: string; user: { username: string; role: Session['role'] } }>('/api/auth/login', { username, password }));
    this.saved = { token: r.token, user: { username: r.user.username, role: r.user.role } };
    try { localStorage.setItem(KEY, JSON.stringify(this.saved)); } catch { /* sin storage */ }
    this.session.set(this.saved.user);
  }

  logout(): void {
    this.saved = null;
    try { localStorage.removeItem(KEY); } catch { /* sin storage */ }
    this.session.set(null);
    this.router.navigateByUrl('/login');
  }
}

/** Agrega el token a cada pedido a la API; si el servidor responde 401 la sesión venció y vuelve al login. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const t = auth.token();
  const isLogin = req.url.endsWith('/api/auth/login');
  const r = t && req.url.startsWith('/api/') && !isLogin ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req;
  return next(r).pipe(catchError((e: HttpErrorResponse) => {
    if (e.status === 401 && !isLogin && auth.session()) auth.logout();
    return throwError(() => e);
  }));
};

/** Con la API activa exige sesión; sin API (modo local) deja pasar. */
export const authGuard: CanActivateFn = async () => {
  const api = inject(Api), auth = inject(Auth), router = inject(Router);
  const up = api.online() ?? (await api.ping());
  if (!up) return true;
  return auth.session() ? true : router.parseUrl('/login');
};
