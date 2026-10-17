import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AlterarEmail } from './alterar-email';
import { PerfilService } from '../../../services/perfil.service';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';

describe('AlterarEmail', () => {
  let fixture: ComponentFixture<AlterarEmail>;
  let component: AlterarEmail;
  let http: HttpTestingController;
  let simulado: ReturnType<typeof simularDialogNativo>;
  let alterados: number;

  const el = () => fixture.nativeElement as HTMLElement;
  const solicitar = () => http.expectOne((r) => r.url.endsWith('/auth/me/email/'));
  const confirmar = () => http.expectOne((r) => r.url.endsWith('/auth/me/email/confirmar/'));

  beforeEach(() => {
    simulado = simularDialogNativo();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AlterarEmail);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('emailAtual', 'joao@exemplo.com');
    alterados = 0;
    component.alterado.subscribe(() => alterados++);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    simulado.restaurar();
  });

  function irParaOCodigo(email = 'novo@exemplo.com') {
    component.digitar('email', email);
    component.digitar('senha_atual', 'SenhaForte123');
    component.enviarCodigo();
    solicitar().flush({ detail: 'ok' });
    fixture.detectChanges();
  }

  it('mostra o e-mail atual e pede o novo com a senha', () => {
    expect(el().textContent).toContain('joao@exemplo.com');
    expect(el().querySelector('#email-novo')).toBeTruthy();
    expect(el().querySelector('#email-senha')).toBeTruthy();
  });

  it('campos vazios ou e-mail inválido não chamam a API', () => {
    component.digitar('email', 'sem-arroba');
    component.enviarCodigo();

    expect(component.temErro('email')).toBe(true);
    expect(component.temErro('senha_atual')).toBe(true);
    http.expectNone((r) => r.url.endsWith('/auth/me/email/'));
  });

  it('envia o novo e-mail e a senha e passa para o código', () => {
    component.digitar('email', ' novo@exemplo.com ');
    component.digitar('senha_atual', 'SenhaForte123');
    component.enviarCodigo();

    const req = solicitar();
    expect(req.request.body).toEqual({ email: 'novo@exemplo.com', senha_atual: 'SenhaForte123' });
    req.flush({ detail: 'ok' });
    fixture.detectChanges();

    expect(component.etapa()).toBe('codigo');
    expect(el().textContent).toContain('novo@exemplo.com');
    expect(el().querySelector('#email-codigo')).toBeTruthy();
  });

  it('senha errada aparece no próprio campo', () => {
    component.digitar('email', 'novo@exemplo.com');
    component.digitar('senha_atual', 'errada');
    component.enviarCodigo();
    solicitar().flush({ senha_atual: ['Senha atual incorreta.'] }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(el().querySelector('#email-senha-erro')!.textContent).toContain('Senha atual incorreta.');
    expect(component.etapa()).toBe('email');
  });

  it('confirma com o código, atualiza o perfil e avisa a página', () => {
    irParaOCodigo();
    component.digitarCodigo('12a3456');

    component.confirmar();
    const req = confirmar();
    expect(req.request.body).toEqual({ email: 'novo@exemplo.com', codigo: '123456' });
    req.flush({ id: 1, email: 'novo@exemplo.com' });

    expect(alterados).toBe(1);
    expect(TestBed.inject(PerfilService).perfil()?.email).toBe('novo@exemplo.com');
  });

  it('código incompleto não chama a API', () => {
    irParaOCodigo();
    component.digitarCodigo('123');

    component.confirmar();

    expect(component.temErro('codigo')).toBe(true);
    http.expectNone((r) => r.url.endsWith('/auth/me/email/confirmar/'));
  });

  it('código errado fica no campo do código', () => {
    irParaOCodigo();
    component.digitarCodigo('000000');
    component.confirmar();
    confirmar().flush({ codigo: ['Código inválido ou expirado.'] }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(el().querySelector('#email-codigo-erro')!.textContent).toContain('Código inválido ou expirado.');
    expect(alterados).toBe(0);
  });

  it('e-mail ocupado nesse meio-tempo volta para o primeiro passo', () => {
    irParaOCodigo();
    component.digitarCodigo('123456');
    component.confirmar();
    confirmar().flush({ email: ['Este e-mail já está em uso.'] }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(component.etapa()).toBe('email');
    expect(el().querySelector('#email-novo-erro')!.textContent).toContain('Este e-mail já está em uso.');
  });

  it('reenviar só fica disponível depois da contagem', () => {
    irParaOCodigo();
    const reenviar = [...el().querySelectorAll('button')].find((b) => b.textContent!.includes('Reenviar'))!;

    expect(reenviar.disabled).toBe(true);
    expect(reenviar.textContent).toContain('Reenviar em 60s');
  });

  it('"Usar outro e-mail" volta para o primeiro passo', () => {
    irParaOCodigo();

    component.usarOutroEmail();
    fixture.detectChanges();

    expect(el().querySelector('#email-novo')).toBeTruthy();
  });
});
