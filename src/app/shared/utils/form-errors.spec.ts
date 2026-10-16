import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';

import { MENSAGEM_MUITAS_TENTATIVAS, tratarErrosApi } from './form-errors';

describe('tratarErrosApi', () => {
  function tratar(status: number, error: unknown = null) {
    const erros = signal<Record<string, string[]>>({});
    const erroGeral = signal('');
    tratarErrosApi(new HttpErrorResponse({ status, error }), erros, erroGeral, 'Erro padrão.');
    return { erros: erros(), erroGeral: erroGeral() };
  }

  it('erros de campo do DRF ficam em cada campo', () => {
    const { erros, erroGeral } = tratar(400, { senha_atual: ['Senha atual incorreta.'] });

    expect(erros).toEqual({ senha_atual: ['Senha atual incorreta.'] });
    expect(erroGeral).toBe('');
  });

  it('limite de tentativas (429): mensagem própria, não a genérica', () => {
    expect(tratar(429, { detail: 'Pedido foi limitado.' }).erroGeral).toBe(MENSAGEM_MUITAS_TENTATIVAS);
  });

  it('outros erros usam a mensagem padrão da tela', () => {
    expect(tratar(500).erroGeral).toBe('Erro padrão.');
  });
});
