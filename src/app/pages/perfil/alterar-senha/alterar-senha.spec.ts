import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AlterarSenha } from './alterar-senha';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';

describe('AlterarSenha', () => {
  let fixture: ComponentFixture<AlterarSenha>;
  let component: AlterarSenha;
  let http: HttpTestingController;
  let simulado: ReturnType<typeof simularDialogNativo>;
  let alteradas: number;
  let fechadas: number;

  const el = () => fixture.nativeElement as HTMLElement;
  const trocas = () => http.match((r) => r.url.endsWith('/auth/trocar-senha/'));

  beforeEach(() => {
    simulado = simularDialogNativo();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AlterarSenha);
    component = fixture.componentInstance;
    alteradas = 0;
    fechadas = 0;
    component.alterada.subscribe(() => alteradas++);
    component.fechar.subscribe(() => fechadas++);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    simulado.restaurar();
  });

  function preencher(atual = 'senha-atual-1', nova = 'NovaSenha123', confirmar = 'NovaSenha123') {
    component.digitar('senha_atual', atual);
    component.digitar('nova_senha', nova);
    component.digitar('confirmar_senha', confirmar);
  }

  it('abre como modal, com o checklist de requisitos da nova senha', () => {
    expect(el().querySelector('dialog h2')!.textContent).toContain('Alterar senha');
    expect(el().querySelector('app-requisitos-senha')).toBeTruthy();
  });

  it('campos vazios apontam o erro em cada campo e não chamam a API', () => {
    component.salvar();
    fixture.detectChanges();

    expect(component.temErro('senha_atual')).toBe(true);
    expect(component.temErro('nova_senha')).toBe(true);
    expect(component.temErro('confirmar_senha')).toBe(true);
    expect(trocas().length).toBe(0);
  });

  it('confirmação diferente da nova senha é recusada antes de enviar', () => {
    preencher('senha-atual-1', 'NovaSenha123', 'OutraSenha123');

    component.salvar();
    fixture.detectChanges();

    expect(el().querySelector('#senha-confirmar-erro')!.textContent).toContain('As senhas não coincidem.');
    expect(trocas().length).toBe(0);
  });

  it('o botão de olho mostra e esconde a senha', () => {
    const campo = el().querySelector('#senha-nova') as HTMLInputElement;
    expect(campo.type).toBe('password');

    (campo.parentElement!.querySelector('.as-olho') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campo.type).toBe('text');
    expect(campo.parentElement!.querySelector('.as-olho')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('salvar envia as três senhas e avisa a página', () => {
    preencher();

    component.salvar();
    const [req] = trocas();
    expect(req.request.body).toEqual({ senha_atual: 'senha-atual-1', nova_senha: 'NovaSenha123', confirmar_senha: 'NovaSenha123' });
    req.flush({ detail: 'Senha alterada com sucesso.' });

    expect(alteradas).toBe(1);
  });

  it('senha atual errada (erro da API) aparece no próprio campo', () => {
    preencher();

    component.salvar();
    trocas()[0].flush({ senha_atual: ['Senha atual incorreta.'] }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(el().querySelector('#senha-atual-erro')!.textContent).toContain('Senha atual incorreta.');
    expect(alteradas).toBe(0);
    expect(component.salvando()).toBe(false);
  });

  it('digitar de novo num campo com erro limpa o erro dele', () => {
    component.salvar();
    component.digitar('senha_atual', 'a');

    expect(component.temErro('senha_atual')).toBe(false);
    expect(component.temErro('nova_senha')).toBe(true);
  });

  it('cancelar fecha; enquanto salva, não fecha', () => {
    component.aoFechar();
    expect(fechadas).toBe(1);

    preencher();
    component.salvar();
    component.aoFechar();
    expect(fechadas).toBe(1);
    trocas()[0].flush({});
  });
});
