import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Registrar, mascararEmail } from './registrar';
import { environment } from '../../../environments/environment';

const URL_CODIGO = `${environment.apiUrl}/auth/registrar/enviar-codigo/`;
const URL_REGISTRAR = `${environment.apiUrl}/auth/registrar/`;
const URL_LOGIN = `${environment.apiUrl}/auth/token/`;

describe('mascararEmail', () => {
  it('mostra só a primeira letra do usuário', () => {
    expect(mascararEmail('joao.silva@gmail.com')).toBe('j***@gmail.com');
  });
});

describe('Registrar', () => {
  let component: Registrar;
  let http: HttpTestingController;
  let router: Router;

  function preencher() {
    component.username.set('dr_novo');
    component.email.set('Novo@Exemplo.com');
    component.password.set('SenhaForte@123');
    component.telefone.set('11999999999');
    component.especialidade.set('Ortopedia');
    component.crefito.set('99999-F');
  }

  function irParaEtapaDoCodigo() {
    preencher();
    component.enviarCodigo();
    http.expectOne(URL_CODIGO).flush({ detail: 'ok' });
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component = TestBed.createComponent(Registrar).componentInstance;
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('e-mail é obrigatório (validação local, sem chamar a API)', () => {
    preencher();
    component.email.set('');

    component.enviarCodigo();

    expect(component.mensagensErro('email')).toEqual(['Este campo é obrigatório.']);
    http.expectNone(URL_CODIGO);
  });

  it('envia os dados para receber o código e vai para a etapa do código', () => {
    irParaEtapaDoCodigo();

    expect(component.etapa()).toBe('codigo');
    expect(component.segundosParaReenvio()).toBe(60);
    expect(component.emailMascarado()).toBe('n***@exemplo.com');
  });

  it('erro de validação no envio mantém a etapa de dados com as mensagens', () => {
    preencher();
    component.enviarCodigo();
    http.expectOne(URL_CODIGO).flush(
      { email: ['Este e-mail já está em uso.'] },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.etapa()).toBe('dados');
    expect(component.mensagensErro('email')).toEqual(['Este e-mail já está em uso.']);
  });

  it('senha recusada marca erro, e voltar a digitar a senha limpa o erro', () => {
    preencher();
    component.enviarCodigo();
    http.expectOne(URL_CODIGO).flush(
      { password: ['A senha deve ter pelo menos 8 caracteres...'] },
      { status: 400, statusText: 'Bad Request' }
    );
    expect(component.temErro('password')).toBe(true);

    component.aoDigitarSenha('OutraSenha456');

    expect(component.temErro('password')).toBe(false);
    expect(component.password()).toBe('OutraSenha456');
  });

  it('código precisa ter 6 dígitos antes de chamar a API', () => {
    irParaEtapaDoCodigo();
    component.codigo.set('123');

    component.confirmarCodigo();

    expect(component.temErro('codigo')).toBe(true);
    http.expectNone(URL_REGISTRAR);
  });

  it('código certo cria a conta, faz login e vai para a agenda', () => {
    irParaEtapaDoCodigo();
    component.codigo.set('123456');

    component.confirmarCodigo();
    const req = http.expectOne(URL_REGISTRAR);
    expect(req.request.body).toEqual(expect.objectContaining({ email: 'Novo@Exemplo.com', codigo: '123456' }));
    req.flush({ username: 'dr_novo', email: 'novo@exemplo.com' }, { status: 201, statusText: 'Created' });
    http.expectOne(URL_LOGIN).flush({ detail: 'ok' });

    expect(router.navigate).toHaveBeenCalledWith(['/agenda']);
  });

  it('código errado mostra o erro e continua na etapa do código', () => {
    irParaEtapaDoCodigo();
    component.codigo.set('000000');

    component.confirmarCodigo();
    http.expectOne(URL_REGISTRAR).flush(
      { codigo: ['Código inválido ou expirado.'] },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.etapa()).toBe('codigo');
    expect(component.mensagensErro('codigo')).toEqual(['Código inválido ou expirado.']);
  });

  it('erro em outro campo na confirmação volta para a etapa de dados', () => {
    irParaEtapaDoCodigo();
    component.codigo.set('123456');

    component.confirmarCodigo();
    http.expectOne(URL_REGISTRAR).flush(
      { username: ['Este nome de usuário já está em uso.'] },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.etapa()).toBe('dados');
    expect(component.temErro('username')).toBe(true);
  });

  it('reenvio só é liberado depois da contagem de 60s', () => {
    irParaEtapaDoCodigo();

    component.reenviarCodigo();
    http.expectNone(URL_CODIGO);

    vi.advanceTimersByTime(60_000);
    expect(component.segundosParaReenvio()).toBe(0);

    component.reenviarCodigo();
    http.expectOne(URL_CODIGO).flush({ detail: 'ok' });
    expect(component.reenviado()).toBe(true);
    expect(component.segundosParaReenvio()).toBe(60);
  });

  it('voltar para os dados mantém o que foi preenchido', () => {
    irParaEtapaDoCodigo();

    component.voltarParaDados();

    expect(component.etapa()).toBe('dados');
    expect(component.email()).toBe('Novo@Exemplo.com');
    expect(component.username()).toBe('dr_novo');
  });
});
