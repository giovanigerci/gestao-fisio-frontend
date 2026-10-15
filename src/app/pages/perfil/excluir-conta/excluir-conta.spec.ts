import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DadosDaConta } from './dados-da-conta';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';

describe('DadosDaConta', () => {
  let fixture: ComponentFixture<DadosDaConta>;
  let component: DadosDaConta;
  let http: HttpTestingController;
  let simulado: ReturnType<typeof simularDialogNativo>;
  let exclusoes: number;

  const el = () => fixture.nativeElement as HTMLElement;
  const botao = (texto: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent!.trim().startsWith(texto)) as HTMLButtonElement;

  beforeEach(() => {
    simulado = simularDialogNativo();
    // jsdom não implementa URL.createObjectURL/revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:teste');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DadosDaConta);
    component = fixture.componentInstance;
    exclusoes = 0;
    component.contaExcluida.subscribe(() => exclusoes++);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    simulado.restaurar();
  });

  function abrirExclusao(resumo = { clinicas: 2, pacientes: 1, agendamentos: 30 }) {
    botao('Excluir conta').click();
    http.expectOne((r) => r.url.endsWith('/auth/me/dados/')).flush(resumo);
    fixture.detectChanges();
  }

  function preencher(senha = 'minha-senha') {
    component.senha.set(senha);
    component.ciente.set(true);
    fixture.detectChanges();
  }

  describe('exportar', () => {
    it('baixa o ZIP com a data no nome', () => {
      const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toMatch(/^gestao-fisio-dados-\d{4}-\d{2}-\d{2}\.zip$/);
      });

      botao('Exportar').click();
      const req = http.expectOne((r) => r.url.endsWith('/auth/me/exportar/'));
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['zip']));

      expect(clique).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:teste');
      clique.mockRestore();
    });

    it('falha na exportação avisa e deixa tentar de novo', () => {
      botao('Exportar').click();
      http.expectOne((r) => r.url.endsWith('/auth/me/exportar/')).flush(new Blob(), { status: 500, statusText: 'Erro' });
      fixture.detectChanges();

      expect(el().querySelector('[role="alert"]')!.textContent).toContain('Não foi possível gerar a exportação');
      expect(botao('Exportar').disabled).toBe(false);
    });
  });

  describe('excluir a conta', () => {
    it('o modal mostra o que será apagado, com as quantidades', () => {
      abrirExclusao();
      const lista = el().querySelector('.dc-lista')!.textContent!;

      expect(lista).toContain('1 paciente,');
      expect(lista).toContain('30 sessões');
      expect(lista).toContain('2 clínicas');
    });

    it('sem as quantidades (falha na busca), o aviso continua aparecendo', () => {
      botao('Excluir conta').click();
      http.expectOne((r) => r.url.endsWith('/auth/me/dados/')).flush(null, { status: 500, statusText: 'Erro' });
      fixture.detectChanges();

      expect(el().querySelector('.dc-lista')!.textContent).toContain('Todos os seus pacientes');
    });

    it('só libera o botão com a senha e a confirmação de que é definitivo', () => {
      abrirExclusao();
      expect(component.podeExcluir()).toBe(false);

      component.senha.set('minha-senha');
      expect(component.podeExcluir()).toBe(false);

      component.ciente.set(true);
      expect(component.podeExcluir()).toBe(true);
    });

    it('sem confirmar, não chama a API', () => {
      abrirExclusao();
      component.senha.set('minha-senha');

      component.excluir();

      http.expectNone((r) => r.url.endsWith('/auth/excluir-conta/'));
    });

    it('oferece a exportação dentro do modal, antes de excluir', () => {
      abrirExclusao();

      expect(el().querySelector('.dc-exportar')!.textContent).toContain('guarda do prontuário');
      expect(botao('Exportar meus dados')).toBeTruthy();
    });

    it('excluir envia a senha e avisa a página para encerrar a sessão', () => {
      abrirExclusao();
      preencher();

      component.excluir();
      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/auth/excluir-conta/'));
      expect(req.request.body).toEqual({ senha: 'minha-senha' });
      req.flush({ detail: 'Conta excluída.' });

      expect(exclusoes).toBe(1);
    });

    it('senha errada aparece no campo e a conta continua', () => {
      abrirExclusao();
      preencher('errada');

      component.excluir();
      http.expectOne((r) => r.url.endsWith('/auth/excluir-conta/'))
        .flush({ senha: ['Senha incorreta.'] }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(el().querySelector('#conta-senha-erro')!.textContent).toContain('Senha incorreta.');
      expect(exclusoes).toBe(0);
      expect(component.excluindo()).toBe(false);
    });

    it('muitas tentativas: explica em vez de mostrar erro genérico', () => {
      abrirExclusao();
      preencher('errada');

      component.excluir();
      http.expectOne((r) => r.url.endsWith('/auth/excluir-conta/')).flush(null, { status: 429, statusText: 'Too Many Requests' });
      fixture.detectChanges();

      expect(el().querySelector('.form-alert--error')!.textContent).toContain('Muitas tentativas');
    });

    it('fechar o modal limpa a senha digitada', () => {
      abrirExclusao();
      preencher();

      component.fecharExclusao();
      fixture.detectChanges();

      expect(component.senha()).toBe('');
      expect(el().querySelector('dialog')).toBeNull();
    });
  });
});
