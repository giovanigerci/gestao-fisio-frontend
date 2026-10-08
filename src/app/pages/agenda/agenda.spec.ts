import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Agenda } from './agenda';
import { AgendamentoService } from '../../services/agendamento.service';
import { formatarDataISO } from '../../shared/utils/datas';

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
