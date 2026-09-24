import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { guestGuard } from './guest-guard';
import { authInterceptor } from '../interceptors/auth-interceptor';
import { PerfilService } from '../services/perfil.service';
import { environment } from '../../environments/environment';

@Component({ template: '' })
class Pagina {}

const URL_ME = `${environment.apiUrl}/auth/me/`;
const URL_REFRESH = `${environment.apiUrl}/auth/token/refresh/`;

describe('guestGuard', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Pagina, canActivate: [guestGuard] },
          { path: 'agenda', component: Pagina },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('usuário logado é redirecionado para /agenda e o perfil fica em cache', async () => {
    const navegacao = harness.navigateByUrl('/login');
    const req = await vi.waitFor(() => http.expectOne(URL_ME));
    expect(req.request.withCredentials).toBe(true);
    req.flush({ id: 1, username: 'dr_silva' });
    await navegacao;

    expect(router.url).toBe('/agenda');
    TestBed.inject(PerfilService).carregar().subscribe();
    http.expectNone(URL_ME);
  });

  it('visitante (401) acessa /login sem disparar refresh de token', async () => {
    const navegacao = harness.navigateByUrl('/login');
    const req = await vi.waitFor(() => http.expectOne(URL_ME));
    req.flush({ detail: 'Não autenticado.' }, { status: 401, statusText: 'Unauthorized' });
    await navegacao;

    expect(router.url).toBe('/login');
    http.expectNone(URL_REFRESH);
  });

  it('API fora do ar é tratada como visitante', async () => {
    const navegacao = harness.navigateByUrl('/login');
    const req = await vi.waitFor(() => http.expectOne(URL_ME));
    req.error(new ProgressEvent('error'), { status: 0 });
    await navegacao;

    expect(router.url).toBe('/login');
  });
});
