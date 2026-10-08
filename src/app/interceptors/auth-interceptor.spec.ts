import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from './auth-interceptor';
import { SKIP_AUTH_RETRY } from './auth-context';
import { PerfilService } from '../services/perfil.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;
  let limpar: ReturnType<typeof vi.spyOn>;

  const NAO_AUTORIZADO = { status: 401, statusText: 'Unauthorized' };
  const refreshes = () => controle.match((r) => r.url.endsWith('/auth/token/refresh/'));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    limpar = vi.spyOn(TestBed.inject(PerfilService), 'limpar');
  });

  afterEach(() => {
    controle.verify();
    vi.useRealTimers();
  });

  it('envia os cookies em toda requisição', () => {
    http.get('/api/pacientes/').subscribe();

    expect(controle.expectOne('/api/pacientes/').request.withCredentials).toBe(true);
    controle.match(() => true).forEach((r) => r.flush([]));
  });

  it('com 401, renova a sessão e repete a requisição', () => {
    let resposta: unknown;
    http.get('/api/pacientes/').subscribe((r) => (resposta = r));

    controle.expectOne('/api/pacientes/').flush(null, NAO_AUTORIZADO);
    refreshes()[0].flush({});
    controle.expectOne('/api/pacientes/').flush(['ok']);

    expect(resposta).toEqual(['ok']);
  });

  it('várias requisições com 401 ao mesmo tempo fazem um refresh só (o token é rotacionado a cada uso)', () => {
    const respostas: unknown[] = [];
    http.get('/api/financeiro/resumo/').subscribe((r) => respostas.push(r));
    http.get('/api/financeiro/evolucao/').subscribe((r) => respostas.push(r));

    controle.expectOne('/api/financeiro/resumo/').flush(null, NAO_AUTORIZADO);
    controle.expectOne('/api/financeiro/evolucao/').flush(null, NAO_AUTORIZADO);
    const pedidos = refreshes();
    expect(pedidos.length).toBe(1);
    pedidos[0].flush({});

    controle.expectOne('/api/financeiro/resumo/').flush('resumo');
    controle.expectOne('/api/financeiro/evolucao/').flush('evolucao');
    expect(respostas).toEqual(['resumo', 'evolucao']);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('terminado um refresh, um 401 novo faz outro', () => {
    http.get('/api/a/').subscribe();
    controle.expectOne('/api/a/').flush(null, NAO_AUTORIZADO);
    refreshes()[0].flush({});
    controle.expectOne('/api/a/').flush('ok');

    http.get('/api/b/').subscribe();
    controle.expectOne('/api/b/').flush(null, NAO_AUTORIZADO);

    expect(refreshes().length).toBe(1);
    controle.match(() => true).forEach((r) => r.flush({}));
  });

  it('refresh recusado (sessão expirada): limpa o perfil e vai para o login', () => {
    http.get('/api/pacientes/').subscribe({ error: () => {} });

    controle.expectOne('/api/pacientes/').flush(null, NAO_AUTORIZADO);
    refreshes()[0].flush(null, NAO_AUTORIZADO);

    expect(limpar).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('backend fora do ar no refresh: tenta de novo antes de desistir', () => {
    vi.useFakeTimers();
    let resposta: unknown;
    http.get('/api/pacientes/').subscribe((r) => (resposta = r));

    controle.expectOne('/api/pacientes/').flush(null, NAO_AUTORIZADO);
    refreshes()[0].flush(null, { status: 503, statusText: 'Service Unavailable' });
    vi.advanceTimersByTime(3000);
    refreshes()[0].flush({});
    controle.expectOne('/api/pacientes/').flush('ok');

    expect(resposta).toBe('ok');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('a própria requisição de token não tenta renovar', () => {
    http.post('/api/auth/token/', {}).subscribe({ error: () => {} });

    controle.expectOne('/api/auth/token/').flush(null, NAO_AUTORIZADO);

    expect(refreshes().length).toBe(0);
  });

  it('respeita SKIP_AUTH_RETRY (ex: checagem de sessão do guestGuard)', () => {
    http.get('/api/auth/me/', { context: new HttpContext().set(SKIP_AUTH_RETRY, true) }).subscribe({ error: () => {} });

    controle.expectOne('/api/auth/me/').flush(null, NAO_AUTORIZADO);

    expect(refreshes().length).toBe(0);
  });
});
