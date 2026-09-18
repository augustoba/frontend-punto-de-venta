import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth, authInterceptor } from './auth';

describe('sesión', () => {
  let http: HttpClient, ctl: HttpTestingController, auth: Auth;
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient); ctl = TestBed.inject(HttpTestingController); auth = TestBed.inject(Auth);
  });

  it('el login guarda el token y los pedidos siguientes lo llevan', async () => {
    const p = auth.login('ana', 'clave123');
    const l = ctl.expectOne('/api/auth/login');
    expect(l.request.headers.has('Authorization')).toBeFalse();
    l.flush({ token: 'T0KEN', user: { username: 'ana', role: 'VENDEDOR' } });
    await p;
    expect(auth.session()?.username).toBe('ana');
    http.get('/api/accounts').subscribe();
    expect(ctl.expectOne('/api/accounts').request.headers.get('Authorization')).toBe('Bearer T0KEN');
  });

  it('un 401 cierra la sesión', async () => {
    const p = auth.login('ana', 'clave123');
    ctl.expectOne('/api/auth/login').flush({ token: 'T', user: { username: 'ana', role: 'ADMIN' } });
    await p;
    http.get('/api/accounts').subscribe({ error: () => {} });
    ctl.expectOne('/api/accounts').flush({ error: 'Iniciá sesión' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.session()).toBeNull();
    expect(auth.token()).toBeNull();
  });
});
