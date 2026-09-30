import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequisitosSenha } from './requisitos-senha';

describe('RequisitosSenha', () => {
  let fixture: ComponentFixture<RequisitosSenha>;

  function atendidos(senha: string): string[] {
    fixture.componentRef.setInput('senha', senha);
    fixture.detectChanges();
    return fixture.componentInstance.requisitos().filter((r) => r.ok).map((r) => r.texto);
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(RequisitosSenha);
  });

  it('nenhum requisito atendido com senha vazia ou curta só de números', () => {
    expect(atendidos('')).toEqual([]);
    expect(atendidos('123')).toEqual([]);
  });

  it('marca cada requisito conforme a senha é digitada', () => {
    expect(atendidos('12345678')).toEqual(['Pelo menos 8 caracteres']);
    expect(atendidos('abc1')).toEqual(['Letras e números']);
    expect(atendidos('fisio2026')).toEqual(['Pelo menos 8 caracteres', 'Letras e números']);
  });

  it('aceita letras acentuadas', () => {
    expect(atendidos('ção12345')).toEqual(['Pelo menos 8 caracteres', 'Letras e números']);
  });

  it('destaca visualmente os requisitos atendidos', () => {
    atendidos('fisio2026');
    const itensOk = fixture.nativeElement.querySelectorAll('.requisitos-senha__item--ok');

    expect(itensOk.length).toBe(2);
  });

  describe('quando o backend recusa a senha (erro)', () => {
    function emVermelho(senha: string, erro = true): string[] {
      fixture.componentRef.setInput('senha', senha);
      fixture.componentRef.setInput('erro', erro);
      fixture.detectChanges();
      return fixture.componentInstance.requisitos().filter((r) => r.falhou).map((r) => r.texto);
    }

    it('sem erro nada fica vermelho, mesmo com a senha incompleta', () => {
      expect(emVermelho('123', false)).toEqual([]);
    });

    it('destaca em vermelho só os requisitos não atendidos', () => {
      expect(emVermelho('123')).toEqual(['Pelo menos 8 caracteres', 'Letras e números']);
      expect(emVermelho('12345678')).toEqual(['Letras e números']);
    });

    it('com os requisitos checáveis ok, o motivo só pode ser senha comum/parecida com o usuário', () => {
      expect(emVermelho('password123')).toEqual(['Não use senhas comuns nem parecidas com seu usuário']);
    });

    it('aplica a classe de erro no HTML', () => {
      emVermelho('123');
      const itensErro = fixture.nativeElement.querySelectorAll('.requisitos-senha__item--erro');

      expect(itensErro.length).toBe(2);
    });
  });
});
