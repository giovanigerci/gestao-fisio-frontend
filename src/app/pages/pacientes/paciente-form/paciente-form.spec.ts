import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PacienteForm } from './paciente-form';
import { Paciente } from '../../../services/paciente.service';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';

describe('PacienteForm', () => {
  let fixture: ComponentFixture<PacienteForm>;
  let component: PacienteForm;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.fn>;
  let simulado: ReturnType<typeof simularDialogNativo>;

  const paciente: Paciente = {
    id: 4, profissional: 1, nome: 'Ana Souza', cpf: '12345678900', telefone: '41999990000', email: null,
    data_nascimento: '1992-03-14', endereco: '', historico_medico: 'Hérnia L4-L5', ultima_visita: null,
    total_sessoes: 0, status: 'Ativo',
  };

  function criar(id: string | null) {
    simulado = simularDialogNativo();
    navegar = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
        { provide: Router, useValue: { navigate: navegar } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PacienteForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;

  afterEach(() => {
    http.verify();
    simulado.restaurar();
  });

  describe('limite do histórico médico', () => {
    beforeEach(() => criar(null));

    function contador(): HTMLElement | null {
      fixture.detectChanges();
      return el().querySelector('.contador-historico');
    }

    it('o campo usa o mesmo limite do backend (10.000)', () => {
      const textarea: HTMLTextAreaElement = el().querySelector('textarea')!;

      expect(textarea.maxLength).toBe(10000);
    });

    it('contador fica escondido até 80% do limite', () => {
      component.historicoMedico.set('a'.repeat(7999));

      expect(contador()).toBeNull();
    });

    it('contador aparece a partir de 80% do limite, formatado em pt-BR', () => {
      component.historicoMedico.set('a'.repeat(8000));

      expect(contador()?.textContent?.trim()).toBe('8.000 / 10.000 caracteres');
      expect(contador()?.classList).not.toContain('contador-historico--limite');
    });

    it('contador fica em destaque ao atingir o limite', () => {
      component.historicoMedico.set('a'.repeat(10000));

      expect(contador()?.classList).toContain('contador-historico--limite');
    });
  });

  describe('novo paciente', () => {
    beforeEach(() => criar(null));

    it('campos organizados em seções (dados pessoais, contato, saúde)', () => {
      const secoes = [...el().querySelectorAll('legend')].map((l) => l.textContent!.trim());

      expect(secoes).toEqual(['Dados pessoais', 'Contato', 'Saúde']);
    });

    it('a idade só aparece ao sair do campo, com a data válida', () => {
      component.digitarDataNascimento('2000-01-01');
      fixture.detectChanges();
      expect(el().querySelector('.pf-idade')).toBeNull(); // ainda digitando

      component.validarDataNascimento();
      fixture.detectChanges();
      expect(el().querySelector('.pf-idade')!.textContent).toMatch(/\d+ anos/);
    });

    it('ano incompleto (ex: 0120) não vira uma idade absurda: mostra o erro e nenhuma idade', () => {
      component.digitarDataNascimento('0120-05-10');
      component.validarDataNascimento();
      fixture.detectChanges();

      expect(el().querySelector('.pf-idade')).toBeNull();
      expect(el().querySelector('#paciente-nascimento-erro')!.textContent).toContain('máximo 120 anos');
    });

    it('voltar a digitar esconde a idade até sair do campo de novo', () => {
      component.digitarDataNascimento('2000-01-01');
      component.validarDataNascimento();
      component.digitarDataNascimento('2001-01-01');
      fixture.detectChanges();

      expect(el().querySelector('.pf-idade')).toBeNull();
    });

    it('sem os obrigatórios, aponta o erro em cada campo e não envia', () => {
      component.salvar();
      fixture.detectChanges();

      expect(component.temErro('nome')).toBe(true);
      expect(component.temErro('cpf')).toBe(true);
      expect(component.temErro('telefone')).toBe(true);
      expect(el().querySelector('#paciente-cpf')!.getAttribute('aria-invalid')).toBe('true');
    });

    it('leva o foco ao primeiro campo com erro (no celular ele pode estar fora da tela)', async () => {
      component.nome.set('Bruno Lima');
      component.salvar();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement?.id).toBe('paciente-cpf');
    });

    it('data no futuro vira erro no próprio campo ao sair dele', () => {
      component.dataNascimento.set('2999-01-01');
      component.validarDataNascimento();
      fixture.detectChanges();

      expect(el().querySelector('#paciente-nascimento-erro')!.textContent).toContain('data futura');

      component.dataNascimento.set('1990-05-05');
      component.validarDataNascimento();
      expect(component.temErro('data_nascimento')).toBe(false);
    });

    it('salvar cria o paciente (e-mail vazio vai como null) e volta para a lista', () => {
      component.nome.set('Bruno Lima');
      component.cpf.set('98765432100');
      component.telefone.set('41988887777');

      component.salvar();
      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/pacientes/'));
      expect(req.request.body).toMatchObject({ nome: 'Bruno Lima', email: null, data_nascimento: null });
      req.flush({ ...paciente, id: 9 });

      expect(navegar).toHaveBeenCalledWith(['/pacientes']);
      expect(component.confirmarSaida()).toBe(true);
    });

    it('fechar com alterações pergunta antes de descartar', async () => {
      component.nome.set('Rascunho');

      const resposta = component.confirmarSaida() as Promise<boolean>;
      fixture.detectChanges();
      expect(el().querySelector('app-confirm-modal')!.textContent).toContain('Descartar alterações?');

      component.responderDescarte(true);
      expect(await resposta).toBe(true);
    });

    it('na criação não há botão de excluir', () => {
      expect(el().querySelector('.mf-btn--perigo')).toBeNull();
    });
  });

  describe('editar paciente', () => {
    beforeEach(() => {
      criar('4');
      http.expectOne((r) => r.url.endsWith('/pacientes/4/')).flush(paciente);
      fixture.detectChanges();
    });

    it('carrega os dados, mostra o nome no subtítulo e não conta como alteração', () => {
      expect(component.nome()).toBe('Ana Souza');
      expect(el().querySelector('.pf-idade')).toBeTruthy(); // data salva já é válida
      expect(el().querySelector('.modal-subtitulo')!.textContent).toContain('Ana Souza');
      expect(component.temAlteracoes()).toBe(false);
      expect(component.confirmarSaida()).toBe(true);
    });

    it('salvar atualiza com PUT', () => {
      component.historicoMedico.set('Hérnia L4-L5. Evitar flexão com carga.');
      component.salvar();

      const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/pacientes/4/'));
      expect(req.request.body).toMatchObject({ historico_medico: 'Hérnia L4-L5. Evitar flexão com carga.' });
      req.flush(paciente);
      expect(navegar).toHaveBeenCalledWith(['/pacientes']);
    });

    it('excluir pede confirmação e volta para a lista', () => {
      (el().querySelector('.mf-btn--perigo') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el().querySelector('app-confirm-modal')!.textContent).toContain('Ana Souza');

      component.confirmarExclusao();
      http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/pacientes/4/')).flush(null);

      expect(navegar).toHaveBeenCalledWith(['/pacientes']);
    });

    it('CPF já cadastrado (erro da API) aparece no próprio campo', () => {
      component.salvar();
      http.expectOne((r) => r.method === 'PUT').flush({ cpf: ['CPF já cadastrado.'] }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(el().querySelector('#paciente-cpf-erro')!.textContent).toContain('CPF já cadastrado.');
    });
  });
});
