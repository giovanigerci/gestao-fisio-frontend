import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { AgendamentoForm } from './agendamento-form';
import { Agendamento } from '../../../services/agendamento.service';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';

describe('AgendamentoForm', () => {
  let fixture: ComponentFixture<AgendamentoForm>;
  let component: AgendamentoForm;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.fn>;
  let simulado: ReturnType<typeof simularDialogNativo>;

  const sessao: Agendamento = {
    id: 12, profissional: 1, clinica: 2, paciente: 1, data: '2026-10-05', hora_inicio: '08:00:00', hora_fim: '09:00:00',
    status: 'AG', eh_experimental: false, valor_calculado: 80,
  };

  function criar(id: string | null, data: string | null = '2026-10-05') {
    simulado = simularDialogNativo();
    navegar = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(id ? { id } : {}),
              queryParamMap: convertToParamMap(data ? { data } : {}),
            },
          },
        },
        { provide: Router, useValue: { navigate: navegar } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AgendamentoForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/pacientes/opcoes/')).flush([{ id: 1, nome: 'Ana Souza' }, { id: 2, nome: 'Bruno Lima' }]);
    http.expectOne((r) => r.url.endsWith('/clinicas/opcoes/')).flush([{ id: 2, nome: 'Donare', cor: 1 }, { id: 3, nome: 'Movi', cor: 2 }]);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const previas = () => http.match((r) => r.url.endsWith('/agendamentos/verificar-recorrencia/'));

  /** Espera o debounce da prévia (300 ms) com o relógio real: o relógio falso não alcança o effect do toObservable. */
  async function esperarPrevia() {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 320));
  }

  function preencher() {
    component.paciente.set(1);
    component.clinica.set(2);
    component.mudarHoraInicio('08:00');
  }

  afterEach(() => {
    http.verify();
    simulado.restaurar();
  });

  describe('nova sessão', () => {
    beforeEach(() => criar(null));

    it('já vem com o dia escolhido na agenda, por extenso no subtítulo', () => {
      expect(component.data()).toBe('2026-10-05');
      expect(el().querySelector('.modal-subtitulo')!.textContent).toContain('Segunda, 5 de outubro');
    });

    it('clínicas como chips na cor de cada uma', () => {
      const chips = el().querySelectorAll<HTMLElement>('.sf-chip');

      expect(chips.length).toBe(2);
      expect(chips[0].style.getPropertyValue('--cor-chip')).toBe('var(--color-clinic-1)');
      expect(chips[1].textContent).toContain('Movi');
    });

    it('o início sugere o fim uma hora depois', () => {
      component.mudarHoraInicio('08:30');

      expect(component.horaFim()).toBe('09:30');
    });

    it('sem os obrigatórios, aponta o erro em cada campo e não envia', () => {
      component.data.set('');
      component.salvar();
      fixture.detectChanges();

      expect(component.temErro('paciente')).toBe(true);
      expect(component.temErro('clinica')).toBe(true);
      expect(component.temErro('data')).toBe(true);
      expect(el().querySelector('#sessao-paciente')!.getAttribute('aria-invalid')).toBe('true');
    });

    it('salvar uma sessão única volta para a agenda no dia dela', () => {
      preencher();
      component.salvar();

      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/agendamentos/'));
      expect(req.request.body).toMatchObject({ paciente: 1, clinica: 2, data: '2026-10-05', hora_inicio: '08:00', hora_fim: '09:00' });
      req.flush({ ...sessao, id: 30 });

      expect(navegar).toHaveBeenCalledWith(['/agenda'], { queryParams: { data: '2026-10-05' } });
    });

    it('o contador de semanas fica entre 1 e 12', () => {
      component.repeticoes.set(12);
      component.mudarSemanas(1);
      expect(component.repeticoes()).toBe(12);

      component.repeticoes.set(1);
      component.mudarSemanas(-1);
      expect(component.repeticoes()).toBe(1);
    });

    it('fechar com alterações pergunta antes de descartar', async () => {
      component.paciente.set(2);

      const resposta = component.confirmarSaida() as Promise<boolean>;
      fixture.detectChanges();
      expect(el().querySelector('app-confirm-modal')!.textContent).toContain('Descartar alterações?');
      component.responderDescarte(true);

      expect(await resposta).toBe(true);
    });

    it('fechar sem mexer em nada não pergunta', () => {
      expect(component.confirmarSaida()).toBe(true);
    });
  });

  describe('repetir toda semana', () => {
    beforeEach(async () => {
      criar(null);
      preencher();
      component.repetirSemanal.set(true);
      await esperarPrevia();
    });

    it('mostra as datas antes de salvar e marca as que o paciente já tem sessão no horário', () => {
      const [req] = previas();
      expect(req.request.params.get('repeticoes')).toBe('4');
      req.flush({ datas: [
        { data: '2026-10-05', conflito: false }, { data: '2026-10-12', conflito: false },
        { data: '2026-10-19', conflito: true }, { data: '2026-10-26', conflito: false },
      ] });
      fixture.detectChanges();

      const datas = el().querySelectorAll('.sf-data');
      expect(datas.length).toBe(4);
      expect(datas[2].classList).toContain('sf-data--ocupada');
      expect(datas[2].textContent).toContain('Seg, 19/10');
      expect(el().querySelector('.sf-aviso')!.textContent).toContain('será pulada');
      expect(component.rotuloSalvar()).toBe('Criar 3 sessões');
    });

    it('mudar as semanas atualiza a prévia (uma requisição só, depois do debounce)', async () => {
      previas()[0].flush({ datas: [] });
      component.mudarSemanas(1);
      component.mudarSemanas(1);
      await esperarPrevia();

      const reqs = previas();
      expect(reqs.length).toBe(1);
      expect(reqs[0].request.params.get('repeticoes')).toBe('6');
      reqs[0].flush({ datas: [] });
    });

    it('todas as datas ocupadas: não há o que criar', () => {
      previas()[0].flush({ datas: [{ data: '2026-10-05', conflito: true }] });
      fixture.detectChanges();

      expect(component.rotuloSalvar()).toBe('Nenhuma data livre');
      expect(component.podeSalvar()).toBe(false);
    });

    it('salvar cria a série com o número de semanas', () => {
      previas()[0].flush({ datas: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map((data) => ({ data, conflito: false })) });
      component.salvar();

      const req = http.expectOne((r) => r.url.endsWith('/agendamentos/recorrente/'));
      expect(req.request.body).toMatchObject({ paciente: 1, repeticoes: 4 });
      req.flush({ agendamentos_criados: [], agendamentos_conflitantes: [] });
      expect(navegar).toHaveBeenCalledWith(['/agenda'], { queryParams: { data: '2026-10-05' } });
    });
  });

  describe('editar sessão', () => {
    beforeEach(() => {
      criar('12', null);
      http.expectOne((r) => r.url.endsWith('/agendamentos/12/')).flush(sessao);
      fixture.detectChanges();
    });

    it('carrega os dados sem contar como alteração e não oferece repetir', () => {
      expect(component.paciente()).toBe(1);
      expect(component.horaInicio()).toBe('08:00');
      expect(component.temAlteracoes()).toBe(false);
      expect(el().querySelector('#sessao-repetir-rotulo')).toBeNull();
    });

    it('salvar atualiza com PUT', () => {
      component.ehExperimental.set(true);
      component.salvar();

      const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/agendamentos/12/'));
      expect(req.request.body).toMatchObject({ eh_experimental: true });
      req.flush(sessao);
      expect(navegar).toHaveBeenCalled();
    });
  });
});
