import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Login } from './login';
import { MENSAGEM_MUITAS_TENTATIVAS } from '../../shared/utils/form-errors';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('o rodapé mostra o e-mail de contato do suporte', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('.login-ajuda a')!;

    expect(link.getAttribute('href')).toBe('mailto:contato@gestao-fisio.com');
    expect(link.textContent).toContain('contato@gestao-fisio.com');
  });

  describe('erro ao entrar', () => {
    function entrarComResposta(status: number) {
      const http = TestBed.inject(HttpTestingController);
      component.username.set('gio');
      component.password.set('senha123');
      component.entrar();
      http.expectOne((r) => r.url.endsWith('/auth/token/')).flush({ detail: 'erro' }, { status, statusText: 'Erro' });
    }

    it('credenciais erradas: usuário ou senha inválidos', () => {
      entrarComResposta(401);

      expect(component.erro()).toBe('Usuário ou senha inválidos.');
      expect(component.carregando()).toBe(false);
    });

    it('limite de tentativas: explica em vez de dizer que a senha está errada', () => {
      entrarComResposta(429);

      expect(component.erro()).toBe(MENSAGEM_MUITAS_TENTATIVAS);
    });
  });

  it('os documentos legais ficam na base da página, fora do bloco do formulário', () => {
    const legal = (fixture.nativeElement as HTMLElement).querySelector('.login-page > .login-legal')!;
    const destinos = [...legal.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(destinos).toEqual(['/termos', '/privacidade']);
  });
});
