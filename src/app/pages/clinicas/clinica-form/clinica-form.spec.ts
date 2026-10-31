import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { ClinicaForm } from './clinica-form';
import { Clinica } from '../../../services/clinica.service';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';

describe('ClinicaForm', () => {
  let fixture: ComponentFixture<ClinicaForm>;
  let componente: ClinicaForm;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.fn>;
  let simulado: ReturnType<typeof simularDialogNativo>;

  const clinica: Clinica = {
    id: 7, profissional: 1, nome: 'Alfa', endereco: 'Rua A, 10', telefone: '41999990000',
    valor_por_atendimento: '80.00', ativo: true, cor: 3,
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
    fixture = TestBed.createComponent(ClinicaForm);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;

  afterEach(() => {
    http.verify();
    simulado.restaurar();
  });

  describe('nova clínica', () => {
    beforeEach(() => {
      criar(null);
      http.expectOne((req) => req.url.endsWith('/clinicas/opcoes/')).flush([
        { id: 1, nome: 'A', cor: 1 }, { id: 2, nome: 'B', cor: 2 },
      ]);
      fixture.detectChanges();
    });

    it('a prévia já mostra a cor que a clínica vai receber (a menos usada)', () => {
      expect(componente.previaCor()).toBe('var(--color-clinic-3)');
    });

    it('a prévia acompanha o que é digitado', () => {
      componente.nome.set('Beta Pilates');
      componente.valorPorAtendimento.set('60.00');
      fixture.detectChanges();

      expect(el().querySelector('.mf-previa-avatar')!.textContent).toContain('BP');
      expect(el().querySelector('.mf-previa-detalhe')!.textContent!.replace(/\s+/g, ' ')).toContain('R$ 60,00 por atendimento');
    });

    it('sem os campos obrigatórios, aponta o erro em cada campo e não envia', () => {
      componente.salvar();
      fixture.detectChanges();

      expect(componente.temErro('nome')).toBe(true);
      expect(componente.temErro('endereco')).toBe(true);
      expect(componente.temErro('valor_por_atendimento')).toBe(true);
      expect(el().querySelector('#clinica-nome')!.getAttribute('aria-invalid')).toBe('true');
    });

    it('salvar cria a clínica e volta para a listagem sem perguntar nada', async () => {
      componente.nome.set('Beta');
      componente.endereco.set('Av. das Flores, 382');
      componente.valorPorAtendimento.set('60.00');

      componente.salvar();
      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/clinicas/'));
      expect(req.request.body).toMatchObject({ nome: 'Beta', endereco: 'Av. das Flores, 382', valor_por_atendimento: '60.00' });
      req.flush({ ...clinica, id: 9 });

      expect(navegar).toHaveBeenCalledWith(['/clinicas']);
      expect(componente.confirmarSaida()).toBe(true);
    });

    it('fechar sem ter digitado nada não pergunta', () => {
      expect(componente.confirmarSaida()).toBe(true);
    });

    it('fechar com alterações pergunta antes e só sai se descartar', async () => {
      componente.nome.set('Rascunho');

      const resposta = componente.confirmarSaida() as Promise<boolean>;
      fixture.detectChanges();
      expect(el().querySelector('app-confirm-modal')!.textContent).toContain('Descartar alterações?');

      componente.responderDescarte(false);
      expect(await resposta).toBe(false);

      const segunda = componente.confirmarSaida() as Promise<boolean>;
      componente.responderDescarte(true);
      expect(await segunda).toBe(true);
    });

    it('não empilha uma segunda pergunta enquanto a primeira está aberta', () => {
      componente.nome.set('Rascunho');
      componente.confirmarSaida();

      expect(componente.confirmarSaida()).toBe(false);
    });

    it('na criação não há opção de ativar/inativar nem de excluir', () => {
      expect(el().querySelector('[role="switch"]')).toBeNull();
      expect(el().querySelector('.mf-btn--perigo')).toBeNull();
    });
  });

  describe('editar clínica', () => {
    beforeEach(() => {
      criar('7');
      http.expectOne((req) => req.url.endsWith('/clinicas/7/')).flush(clinica);
      fixture.detectChanges();
    });

    it('carrega os dados e a cor salva, sem contar como alteração', () => {
      expect(componente.nome()).toBe('Alfa');
      expect(componente.previaCor()).toBe('var(--color-clinic-3)');
      expect(componente.temAlteracoes()).toBe(false);
    });

    it('alternar ativa/inativa é uma alteração (pergunta ao fechar)', () => {
      (el().querySelector('[role="switch"]') as HTMLButtonElement).click();

      expect(componente.ativo()).toBe(false);
      expect(componente.confirmarSaida()).toBeInstanceOf(Promise);
      componente.responderDescarte(true);
    });

    it('salvar atualiza com PUT', () => {
      componente.endereco.set('Rua B, 20');
      componente.salvar();

      const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/clinicas/7/'));
      expect(req.request.body).toMatchObject({ endereco: 'Rua B, 20', ativo: true });
      req.flush(clinica);
      expect(navegar).toHaveBeenCalledWith(['/clinicas']);
    });

    it('excluir pede confirmação e volta para a listagem', () => {
      (el().querySelector('.mf-btn--perigo') as HTMLButtonElement).click();
      fixture.detectChanges();
      componente.confirmarExclusao();

      http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/clinicas/7/')).flush(null);
      expect(navegar).toHaveBeenCalledWith(['/clinicas']);
      expect(componente.confirmarSaida()).toBe(true);
    });

    it('erro da API no campo aparece no próprio campo', () => {
      componente.salvar();
      http.expectOne((r) => r.method === 'PUT').flush({ nome: ['Já existe.'] }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(el().querySelector('#clinica-nome-erro')!.textContent).toContain('Já existe.');
      expect(navegar).not.toHaveBeenCalled();
    });
  });
});
