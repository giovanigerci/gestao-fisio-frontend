import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Financeiro } from './financeiro';
import { EvolucaoReceita, HistoricoReceita, ResumoFinanceiro } from '../../services/financeiro.service';

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
      { clinica: 1, clinica__nome: 'Studio', clinica__cor: 1, total_atendimentos: 3, receita_total: 120 },
      { clinica: 2, clinica__nome: 'Centro', clinica__cor: 2, total_atendimentos: 1, receita_total: 80 },
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

describe('Financeiro — aba Histórico', () => {
  let fixture: ComponentFixture<Financeiro>;
  let component: Financeiro;
  let http: HttpTestingController;

  const historico = (agrupar: 'mes' | 'ano', variacao: number | null = 25): HistoricoReceita => ({
    agrupar,
    periodos: (agrupar === 'mes' ? ['2026-09', '2026-10'] : ['2025', '2026']).map((periodo) => ({
      periodo, receita: 500, atendimentos: 5, receita_periodo_anterior: 400,
    })),
    resumo: {
      total: 1000,
      media: 500,
      melhor_periodo: { periodo: agrupar === 'mes' ? '2026-09' : '2025', receita: 500, atendimentos: 5, receita_periodo_anterior: 400 },
      total_periodo_anterior: 800,
      variacao_percentual: variacao,
    },
  });

  const pedidosHistorico = () => http.match((req) => req.url.endsWith('/resumo-financeiro/historico/'));

  function abrirHistorico() {
    component.aba.set('historico');
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Financeiro);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // a aba Período carrega ao abrir a tela; aqui só interessa o histórico
    http.expectOne((req) => req.url.endsWith('/resumo-financeiro/')).flush({ por_clinica: [], total_geral: 0 });
    http.expectOne((req) => req.url.endsWith('/evolucao/')).flush(null);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('só busca o histórico quando a aba é aberta', () => {
    expect(pedidosHistorico().length).toBe(0);

    abrirHistorico();
    const [pedido] = pedidosHistorico();
    expect(pedido.request.params.get('agrupar')).toBe('mes');
    pedido.flush(historico('mes'));
  });

  it('uma resposta não dispara outra busca (sem loop de requisições)', () => {
    abrirHistorico();
    pedidosHistorico()[0].flush(historico('mes'));
    fixture.detectChanges();

    expect(pedidosHistorico().length).toBe(0);
  });

  it('voltar a um agrupamento já carregado usa o cache, sem nova requisição', () => {
    abrirHistorico();
    pedidosHistorico()[0].flush(historico('mes'));

    component.agrupar.set('ano');
    fixture.detectChanges();
    pedidosHistorico()[0].flush(historico('ano'));

    component.agrupar.set('mes');
    fixture.detectChanges();
    component.aba.set('periodo');
    fixture.detectChanges();
    abrirHistorico();

    expect(pedidosHistorico().length).toBe(0);
    expect(component.historico()?.agrupar).toBe('mes');
  });

  it('resposta atrasada de outro agrupamento não substitui o que está na tela', () => {
    abrirHistorico();
    pedidosHistorico()[0].flush(historico('mes'));

    component.agrupar.set('ano');
    fixture.detectChanges();
    const [pedidoAno] = pedidosHistorico();
    component.agrupar.set('mes');
    fixture.detectChanges();
    pedidoAno.flush(historico('ano'));

    expect(component.historico()?.agrupar).toBe('mes');
    expect(component.atualizandoHistorico()).toBe(false);
  });

  it('mostra os cartões, a variação e o gráfico', () => {
    abrirHistorico();
    pedidosHistorico()[0].flush(historico('mes'));
    fixture.detectChanges();
    const cartoes = fixture.nativeElement.querySelectorAll('.fin-kpi');

    expect(cartoes.length).toBe(3);
    expect(cartoes[0].textContent).toContain('+25%');
    expect(cartoes[2].textContent).toContain('Setembro de 2026');
    expect(fixture.nativeElement.querySelectorAll('app-grafico').length).toBe(1);
  });

  it('sem receita no período anterior, explica em vez de mostrar variação', () => {
    abrirHistorico();
    pedidosHistorico()[0].flush(historico('mes', null));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fin-kpi-delta')).toBeNull();
    expect(fixture.nativeElement.querySelector('.fin-kpis').textContent).toContain('Sem receita nos 12 meses anteriores');
  });

  it('por ano não mostra variação (o ano atual ainda está em andamento)', () => {
    component.agrupar.set('ano');
    abrirHistorico();
    pedidosHistorico()[0].flush(historico('ano'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fin-kpi-delta')).toBeNull();
    expect(fixture.nativeElement.querySelector('.fin-kpis').textContent).toContain('Receita desde 2025');
  });
});
