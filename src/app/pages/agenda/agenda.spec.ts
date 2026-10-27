import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Agenda } from './agenda';
import { AgendamentoService } from '../../services/agendamento.service';
import { formatarDataISO } from '../../shared/utils/datas';

beforeEach(() => localStorage.clear());

describe('Agenda — semana de domingo a sábado', () => {
  let component: Agenda;

  function semanaDe(dia: Date) {
    component.dataReferencia.set(dia);
    return {
      inicio: formatarDataISO(component.inicioSemana()),
      fim: formatarDataISO(component.fimSemana()),
      dias: component.diasDaSemana().map((d) => d.diaSemanaAbrev),
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    component = TestBed.createComponent(Agenda).componentInstance;
  });

  it('a semana começa no domingo e termina no sábado', () => {
    const semana = semanaDe(new Date(2026, 9, 7)); // quarta, 07/10/2026

    expect(semana.inicio).toBe('2026-10-04');
    expect(semana.fim).toBe('2026-10-10');
    expect(semana.dias).toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
  });

  it('no domingo, a semana começa no próprio dia', () => {
    expect(semanaDe(new Date(2026, 9, 4)).inicio).toBe('2026-10-04');
  });

  it('no sábado, a semana ainda é a que começou no domingo anterior', () => {
    expect(semanaDe(new Date(2026, 9, 10)).inicio).toBe('2026-10-04');
  });
});

describe('Agenda — depois de salvar uma sessão no modal', () => {
  let component: Agenda;
  let http: HttpTestingController;
  let service: AgendamentoService;
  let fixture: ComponentFixture<Agenda>;

  const buscas = () => http.match((req) => req.url.endsWith('/agendamentos/') && req.method === 'GET');

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 10, 0)); // quarta, 07/10/2026
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AgendamentoService);
    fixture = TestBed.createComponent(Agenda);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable(); // o effect que busca a semana
    buscas().forEach((req) => req.flush([]));
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  async function salvarSessao(data: string) {
    service.criar({ data }).subscribe();
    http.expectOne((req) => req.method === 'POST').flush({ id: 1, data });
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('na mesma semana, seleciona o dia e recarrega sem trocar a agenda pelo spinner', async () => {
    await salvarSessao('2026-10-09');

    expect(component.dataSelecionada()).toBe('2026-10-09');
    expect(component.carregando()).toBe(false);
    const [req] = buscas();
    expect(req.request.params.get('data_inicio')).toBe('2026-10-04');
    req.flush([]);
  });

  it('em outra semana, vai para a semana da sessão', async () => {
    await salvarSessao('2026-10-21');

    expect(component.dataSelecionada()).toBe('2026-10-21');
    const [req] = buscas();
    expect(req.request.params.get('data_inicio')).toBe('2026-10-18');
    req.flush([]);
  });
});

describe('Agenda — busca da semana', () => {
  it('"Hoje" estando na semana atual não busca de novo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Agenda);
    fixture.detectChanges();
    await fixture.whenStable();
    http.match(() => true).forEach((req) => req.flush([]));

    fixture.componentInstance.irParaHoje();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(http.match(() => true).length).toBe(0);
    vi.useRealTimers();
  });
});

describe('Agenda — visão do mês', () => {
  let component: Agenda;
  let http: HttpTestingController;
  let fixture: ComponentFixture<Agenda>;

  const buscas = () => http.match((req) => req.url.endsWith('/agendamentos/') && req.method === 'GET');
  const periodo = (req: ReturnType<typeof buscas>[number]) =>
    `${req.request.params.get('data_inicio')} a ${req.request.params.get('data_fim')}`;

  async function iniciar(agora: Date) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(agora);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Agenda);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    buscas().forEach((req) => req.flush([]));
  }

  async function atualizar() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('trocar para Mês busca o mês inteiro numa requisição só', async () => {
    await iniciar(new Date(2026, 9, 7, 10, 0));

    component.mudarVisao('mes');
    await atualizar();

    const [req] = buscas();
    expect(periodo(req)).toBe('2026-10-01 a 2026-10-31');
    req.flush([]);
  });

  it('no mês, o nome do mês aparece só na navegação, sem repetir abaixo do título', async () => {
    await iniciar(new Date(2026, 7, 10, 10, 0));
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('.agenda-subtitle')?.textContent).toBe('9 – 15 de agosto');

    component.mudarVisao('mes');
    await atualizar();
    buscas().forEach((req) => req.flush([]));

    expect(elemento.querySelector('.agenda-subtitle')).toBeNull();
    expect(elemento.querySelector('.agenda-mes-nome')?.textContent).toContain('Agosto 2026');
  });

  it('às 22h30 do dia 31, o próximo mês é novembro inteiro', async () => {
    await iniciar(new Date(2026, 9, 31, 22, 30));
    component.mudarVisao('mes');
    await atualizar();
    buscas().forEach((req) => req.flush([]));

    component.proximoMes();
    await atualizar();

    const [req] = buscas();
    expect(periodo(req)).toBe('2026-11-01 a 2026-11-30');
    req.flush([]);
  });

  it('abrir um dia e ir para a semana mostra a semana daquele dia', async () => {
    await iniciar(new Date(2026, 9, 7, 10, 0));
    component.mudarVisao('mes');
    await atualizar();
    buscas().forEach((req) => req.flush([]));

    component.abrirDiaNoMes({ data: '2026-10-21', ancora: new DOMRect() });
    component.abrirDiaNaSemana();
    await atualizar();

    expect(component.visao()).toBe('semana');
    expect(component.diaAbertoNoMes()).toBeNull();
    expect(component.dataSelecionada()).toBe('2026-10-21');
    const [req] = buscas();
    expect(periodo(req)).toBe('2026-10-18 a 2026-10-24');
    req.flush([]);
  });

  it('sessão salva em outro mês leva a agenda para o mês dela', async () => {
    await iniciar(new Date(2026, 9, 7, 10, 0));
    component.mudarVisao('mes');
    await atualizar();
    buscas().forEach((req) => req.flush([]));

    const service = TestBed.inject(AgendamentoService);
    service.criar({ data: '2026-11-12' }).subscribe();
    http.expectOne((req) => req.method === 'POST').flush({ id: 1, data: '2026-11-12' });
    await atualizar();

    const [req] = buscas();
    expect(periodo(req)).toBe('2026-11-01 a 2026-11-30');
    req.flush([]);
  });

  it('trocando de mês rápido, a resposta atrasada do mês anterior é ignorada', async () => {
    await iniciar(new Date(2026, 9, 7, 10, 0));
    component.mudarVisao('mes');
    await atualizar();
    const [outubro] = buscas();

    component.proximoMes();
    await atualizar();
    const [novembro] = buscas();
    novembro.flush([{ id: 2, data: '2026-11-03' }]);
    outubro.flush([{ id: 1, data: '2026-10-07' }]);

    expect(component.agendamentos().map((a) => a.id)).toEqual([2]);
    expect(component.carregando()).toBe(false);
  });
});

describe('Agenda — visão lembrada no aparelho', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Agenda>;

  const buscas = () => http.match((req) => req.url.endsWith('/agendamentos/') && req.method === 'GET');

  async function abrirAgenda() {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Agenda);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('abre direto no mês quando foi a última escolha', async () => {
    localStorage.setItem('gf:agenda-visao', 'mes');

    await abrirAgenda();

    expect(fixture.componentInstance.visao()).toBe('mes');
    const [req] = buscas();
    expect(req.request.params.get('data_inicio')).toBe('2026-10-01');
    expect(req.request.params.get('data_fim')).toBe('2026-10-31');
    req.flush([]);
  });

  it('escolher no seletor guarda a visão para a próxima vez', async () => {
    await abrirAgenda();
    buscas().forEach((req) => req.flush([]));

    const botaoMes = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.agenda-visao-btn')]
      .find((b) => b.textContent?.includes('Mês'))!;
    botaoMes.click();
    fixture.detectChanges();
    await fixture.whenStable();
    buscas().forEach((req) => req.flush([]));

    expect(localStorage.getItem('gf:agenda-visao')).toBe('mes');
  });

  it('"Abrir na semana" a partir de um dia do mês não troca a preferência', async () => {
    localStorage.setItem('gf:agenda-visao', 'mes');
    await abrirAgenda();
    buscas().forEach((req) => req.flush([]));

    fixture.componentInstance.abrirDiaNoMes({ data: '2026-10-21', ancora: new DOMRect() });
    fixture.componentInstance.abrirDiaNaSemana();
    fixture.detectChanges();
    await fixture.whenStable();
    buscas().forEach((req) => req.flush([]));

    expect(fixture.componentInstance.visao()).toBe('semana');
    expect(localStorage.getItem('gf:agenda-visao')).toBe('mes');
  });
});

describe('Agenda — acessível pelo teclado', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Agenda>;
  const elemento = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Agenda);
    fixture.detectChanges();
    await fixture.whenStable();
    http.match((req) => req.url.endsWith('/agendamentos/')).forEach((req) =>
      req.flush([
        {
          id: 1, profissional: 1, clinica: 1, paciente: 1, data: '2026-10-07', hora_inicio: '08:00:00', hora_fim: '09:00:00',
          status: 'AG', eh_experimental: false, valor_calculado: 80, nome_paciente: 'Mariana Costa', nome_clinica: 'Movi',
          cor_clinica: 1,
        },
      ]),
    );
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('"+ Sessão" é um link de verdade para a nova sessão do dia escolhido', () => {
    const link = elemento().querySelector<HTMLAnchorElement>('a.agenda-btn-nova')!;

    expect(link.getAttribute('href')).toBe('/agenda/novo?data=2026-10-07');
  });

  it('o cartão da sessão é um botão e abre os detalhes', () => {
    const cartao = elemento().querySelector<HTMLButtonElement>('button.agenda-item-layout')!;

    cartao.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.agendamentoSelecionado()?.id).toBe(1);
    expect(elemento().querySelector('app-detalhes-da-sessao')).not.toBeNull();
  });

  it('o subtítulo da semana usa "de" minúsculo, como em português', () => {
    expect(elemento().querySelector('.agenda-subtitle')?.textContent).toBe('4 – 10 de outubro');
  });
});
