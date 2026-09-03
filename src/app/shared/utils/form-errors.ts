import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal } from '@angular/core';

/**
 * Trata erros da API (padrão Django REST Framework) e atualiza os signals de estado.
 */
export function tratarErrosApi(
  err: any,
  errosSignal: WritableSignal<Record<string, string[]>>,
  erroGeralSignal: WritableSignal<string>,
  mensagemPadrao: string = 'Ocorreu um erro. Tente novamente.'
): void {
  // Reseta os signals
  errosSignal.set({});
  erroGeralSignal.set('');

  if (err instanceof HttpErrorResponse || (err && err.status)) {
    if (err.status === 400 && err.error && typeof err.error === 'object' && !Array.isArray(err.error)) {
      const erros = err.error as Record<string, any>;
      
      // DRF retorna 'non_field_errors' ou 'detail' para erros gerais
      const nonField = erros['non_field_errors'];
      const detail = erros['detail'];
      
      const { non_field_errors, detail: _detail, ...fieldErrors } = erros;
      
      // Extrair erros de campo válidos (onde o valor é um array de strings)
      const validFieldErrors: Record<string, string[]> = {};
      let hasFieldErrors = false;
      
      for (const [key, value] of Object.entries(fieldErrors)) {
        if (Array.isArray(value)) {
          validFieldErrors[key] = value.map(v => String(v));
          hasFieldErrors = true;
        } else if (typeof value === 'string') {
          validFieldErrors[key] = [value];
          hasFieldErrors = true;
        }
      }

      if (hasFieldErrors) {
        errosSignal.set(validFieldErrors);
      }
      
      if (nonField && Array.isArray(nonField)) {
        erroGeralSignal.set(nonField.join(' '));
      } else if (detail && typeof detail === 'string') {
        erroGeralSignal.set(detail);
      } else if (!hasFieldErrors) {
        erroGeralSignal.set(mensagemPadrao);
      }
      
    } else if (err.status === 401 || err.status === 403) {
      erroGeralSignal.set(err.error?.detail || 'Permissão negada.');
    } else if (err.status === 404) {
      erroGeralSignal.set('Registro não encontrado.');
    } else {
      erroGeralSignal.set(mensagemPadrao);
    }
  } else {
    erroGeralSignal.set(err?.message || mensagemPadrao);
  }
}

/**
 * Funções auxiliares para usar nos templates
 */
export function temErro(erros: Record<string, string[]>, campo: string): boolean {
  return !!(erros[campo] && erros[campo].length > 0);
}

export function mensagensErro(erros: Record<string, string[]>, campo: string): string[] {
  return erros[campo] || [];
}
