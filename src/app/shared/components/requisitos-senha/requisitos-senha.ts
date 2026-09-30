import { Component, computed, input } from '@angular/core';

export interface RequisitoSenha {
  texto: string;
  ok: boolean;
  falhou: boolean;
}

/**
 * Checklist da senha: cinza por padrão, verde (✓) conforme é atendido e vermelho (✕) quando o
 * backend recusa a senha (`erro`). Espelha AUTH_PASSWORD_VALIDATORS do backend.
 */
@Component({
  selector: 'app-requisitos-senha',
  templateUrl: './requisitos-senha.html',
  styleUrl: './requisitos-senha.css',
})
export class RequisitosSenha {
  readonly senha = input('');
  readonly erro = input(false);

  readonly requisitos = computed<RequisitoSenha[]>(() => {
    const senha = this.senha();
    const erro = this.erro();
    const tamanho = senha.length >= 8;
    const letrasENumeros = /\p{L}/u.test(senha) && /\d/.test(senha);

    return [
      { texto: 'Pelo menos 8 caracteres', ok: tamanho, falhou: erro && !tamanho },
      { texto: 'Letras e números', ok: letrasENumeros, falhou: erro && !letrasENumeros },
      {
        texto: 'Não use senhas comuns nem parecidas com seu usuário',
        ok: false,
        falhou: erro && tamanho && letrasENumeros,
      },
    ];
  });
}
