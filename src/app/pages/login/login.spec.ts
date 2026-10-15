import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Login } from './login';

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

  it('os documentos legais ficam na base da página, fora do bloco do formulário', () => {
    const legal = (fixture.nativeElement as HTMLElement).querySelector('.login-page > .login-legal')!;
    const destinos = [...legal.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(destinos).toEqual(['/termos', '/privacidade']);
  });
});
