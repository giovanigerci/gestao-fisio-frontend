import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Financeiro } from './financeiro';
import { EvolucaoReceita, ResumoFinanceiro } from '../../services/financeiro.service';

describe('Financeiro', () => {
  let component: Financeiro;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 31, 22, 30));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    component = TestBed.createComponent(Financeiro).componentInstance;
  });

  afterEach(() => vi.useRealTimers());

  it('usa a data local de hoje, não a data UTC', () => {
    expect(component.dataReferencia()).toBe('2026-01-31');
    expect(component.periodoLabel()).toBe('Janeiro 2026');
  });

  it('avança e volta um mês sem pular fevereiro a partir do dia 31', () => {
    component.proximoPeriodo();
    expect(component.periodoLabel()).toBe('Fevereiro 2026');

    component.proximoPeriodo();
    expect(component.periodoLabel()).toBe('Março 2026');

    component.periodoAnterior();
    expect(component.periodoLabel()).toBe('Fevereiro 2026');
  });

  it('semana vai de domingo a sábado, igual à agenda', () => {
    component.trocarPeriodo('semana');
    expect(component.periodoLabel()).toBe('25 Jan - 31 Jan');

    component.proximoPeriodo();
    expect(component.periodoLabel()).toBe('1 Fev - 7 Fev');
  });

  it('navega por semana em passos de 7 dias', () => {
    component.trocarPeriodo('semana');
    component.proximoPeriodo();
    expect(component.dataReferencia()).toBe('2026-02-07');
  });
});

describe('Financeiro — carregamento e gráficos', () => {
  let fixture: ComponentFixture<Financeiro>;
  let component: Financeiro;
  let http: HttpTestingController;

  const evolucao = (realizado: number, previsto: number): EvolucaoReceita => ({
    periodo: { inicio: '2026-01-01', fim: '2026-01-02' },
    dias: [
      { data: '2026-01-01', realizado, acumulado: realizado, previsto: 0, acumulado_com_previsto: realizado },
      { data: '2026-01-02', realizado: 0, acumulado: realizado, previsto, acumulado_com_previsto: realizado + previsto },
    ],
    anterior: { inicio: '2025-12-01', fim: '2025-12-02', dias: [] },
    totais: { realizado, previsto, anterior: 0 },
  });

  const resumoComClinicas: ResumoFinanceiro = {
    por_clinica: [
      { clinica: 1, clinica__nome: 'Studio', total_atendimentos: 3, receita_total: 120 },
      { clinica: 2, clinica__nome: 'Centro', total_atendimentos: 1, receita_total: 80 },
    ],
    total_geral: 200,
  };

  function pendentes() {
    return {
      resumo: http.match((req) => req.url.endsWith('/resumo-financeiro/')),
      evolucao: http.match((req) => req.url.endsWith('/resumo-financeiro/evolucao/')),
    };
  }

  function responder(resumo: ResumoFinanceiro, dadosEvolucao: EvolucaoReceita) {
    const { resumo: [r], evolucao: [e] } = pendentes();
    r.flush(resumo);
    e.flush(dadosEvolucao);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); // jsdom não tem canvas
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Financeiro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Nenhuma requisição sobrando: protege contra o effect re-disparar a busca a cada resposta
    http.verify();
    vi.restoreAllMocks();
  });

  it('uma resposta não dispara uma nova busca (sem loop de requisições)', () => {
    responder(resumoComClinicas, evolucao(200, 50));
    fixture.detectChanges();

    const { resumo, evolucao: evo } = pendentes();
    expect(resumo.length + evo.length).toBe(0);
  });

  it('busca o resumo e a evolução em paralelo, com o mesmo período', () => {
    const { resumo, evolucao: evo } = pendentes();

    expect(resumo.length).toBe(1);
    expect(evo.length).toBe(1);
    expect(evo[0].request.params.get('periodo')).toBe(resumo[0].request.params.get('periodo'));
    expect(evo[0].request.params.get('data')).toBe(resumo[0].request.params.get('data'));
  });

  it('mostra os gráficos e a legenda das clínicas com valor e percentual', () => {
    responder(resumoComClinicas, evolucao(200, 50));
    const legenda = fixture.nativeElement.querySelectorAll('.fin-legenda-clinica');

    expect(fixture.nativeElement.querySelectorAll('app-grafico').length).toBe(2);
    expect(legenda.length).toBe(2);
    expect(legenda[0].textContent).toContain('Studio');
    expect(legenda[0].textContent).toContain('60%');
  });

  it('recarga mantém o conteúdo anterior esmaecido, sem voltar ao spinner', () => {
    responder(resumoComClinicas, evolucao(200, 50));

    component.proximoPeriodo();
    fixture.detectChanges();

    expect(component.carregando()).toBe(false);
    expect(fixture.nativeElement.querySelector('.fin-conteudo--atualizando')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.fin-graficos')).toBeTruthy();

    responder(resumoComClinicas, evolucao(300, 0));
    expect(fixture.nativeElement.querySelector('.fin-conteudo--atualizando')).toBeNull();
  });

  it('sem realizado nem previsto, mostra o estado vazio no lugar dos gráficos', () => {
    responder({ por_clinica: [], total_geral: 0 }, evolucao(0, 0));

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.fin-graficos')).toBeNull();
  });

  it('só com previsto, mostra a evolução e avisa que ainda não há receita realizada', () => {
    responder({ por_clinica: [], total_geral: 0 }, evolucao(0, 120));

    expect(fixture.nativeElement.querySelector('.fin-graficos')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.fin-sem-receita')).toBeTruthy();
  });
});
