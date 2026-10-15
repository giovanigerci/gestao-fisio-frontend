import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ExcluirConta } from './excluir-conta';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';

describe('ExcluirConta', () => {
  let fixture: ComponentFixture<ExcluirConta>;
  let component: ExcluirConta;
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
    fixture = TestBed.createComponent(ExcluirConta);
    component = fixture.componentInstance;
    exclusoes = 0;
    component.contaExcluida.subscribe(() => exclusoes++);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    simulado.restaurar();
  });

  function abrir(resumo: { clinicas: number; pacientes: number; agendamentos: number } | null = { clinicas: 2, pacientes: 1, agendamentos: 1414 }) {
    fixture.componentRef.setInput('resumo', resumo);
    botao('Excluir conta').click();
    fixture.detectChanges();
  }

  function preencher(senha = 'minha-senha') {
    component.senha.set(senha);
    component.ciente.set(true);
    fixture.detectChanges();
  }

  it('o card de risco fica separado, com o aviso para exportar antes', () => {
    expect(el().querySelector('.ec-card')!.textContent).toContain('Exporte seus dados antes');
  });

  it('o modal mostra o que será apagado, com as quantidades vindas da página (sem nova requisição)', () => {
    abrir();
    const lista = el().querySelector('.ec-lista')!.textContent!;

    expect(lista).toContain('1 paciente,');
    expect(lista).toContain('1.414 sessões');
    expect(lista).toContain('2 clínicas');
    http.expectNone((r) => r.url.endsWith('/auth/me/dados/'));
  });

  it('sem as quantidades, o aviso continua aparecendo', () => {
    abrir(null);

    expect(el().querySelector('.ec-lista')!.textContent).toContain('Todos os seus pacientes');
  });

  it('só libera o botão com a senha e a confirmação de que é definitivo', () => {
    abrir();
    expect(component.podeExcluir()).toBe(false);

    component.senha.set('minha-senha');
    expect(component.podeExcluir()).toBe(false);

    component.ciente.set(true);
    expect(component.podeExcluir()).toBe(true);
  });

  it('a confirmação é um toggle; o botão só sai do tom apagado com a senha e o toggle ligado', () => {
    abrir();
    const confirmar = () => el().querySelector('.ec-confirmar') as HTMLButtonElement;
    const toggle = el().querySelector('[role="switch"]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(confirmar().classList).toContain('ec-bloqueado');

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(confirmar().classList).toContain('ec-bloqueado');

    component.senha.set('minha-senha');
    fixture.detectChanges();
    expect(confirmar().classList).not.toContain('ec-bloqueado');
    expect(confirmar().disabled).toBe(false);
  });

  it('sem confirmar, não chama a API', () => {
    abrir();
    component.senha.set('minha-senha');

    component.excluir();

    http.expectNone((r) => r.url.endsWith('/auth/excluir-conta/'));
  });

  it('a exportação dentro do modal baixa o ZIP', () => {
    abrir();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    botao('Exportar meus dados').click();
    const req = http.expectOne((r) => r.url.endsWith('/auth/me/exportar/'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['zip']));
    fixture.detectChanges();

    expect(clique).toHaveBeenCalledTimes(1);
    expect(el().querySelector('.ec-exportou')).toBeTruthy();
    clique.mockRestore();
  });

  it('excluir envia a senha e avisa a página para encerrar a sessão', () => {
    abrir();
    preencher();

    component.excluir();
    fixture.detectChanges();
    const confirmar = el().querySelector('.ec-confirmar') as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    expect(confirmar.classList).not.toContain('ec-bloqueado'); // excluindo: continua vermelho
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/auth/excluir-conta/'));
    expect(req.request.body).toEqual({ senha: 'minha-senha' });
    req.flush({ detail: 'Conta excluída.' });

    expect(exclusoes).toBe(1);
  });

  it('senha errada aparece no campo e a conta continua', () => {
    abrir();
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
    abrir();
    preencher('errada');

    component.excluir();
    http.expectOne((r) => r.url.endsWith('/auth/excluir-conta/')).flush(null, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();

    expect(el().querySelector('.form-alert--error')!.textContent).toContain('Muitas tentativas');
  });

  it('fechar o modal limpa a senha digitada', () => {
    abrir();
    preencher();

    component.fechar();
    fixture.detectChanges();

    expect(component.senha()).toBe('');
    expect(el().querySelector('dialog')).toBeNull();
  });
});
