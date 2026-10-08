import { signal } from '@angular/core';

/**
 * "Descartar alterações?" dos formulários em modal. O formulário expõe `confirmarSaida()` para o
 * `alteracoesPendentesGuard` da rota e mostra o confirm-modal enquanto `perguntando()` for true.
 *
 * @param temAlteracoes o estado atual difere do carregado
 * @param ocupado salvando, excluindo ou com outra pergunta aberta: a saída é recusada sem perguntar
 */
export class ControleDeSaida {
  readonly perguntando = signal(false);
  private concluido = false;
  private resolver: ((descartar: boolean) => void) | null = null;

  constructor(
    private readonly temAlteracoes: () => boolean,
    private readonly ocupado: () => boolean = () => false,
  ) {}

  /** Salvou ou excluiu: a próxima saída não pergunta nada. */
  concluir() {
    this.concluido = true;
  }

  confirmarSaida(): boolean | Promise<boolean> {
    if (this.concluido || !this.temAlteracoes()) return true;
    if (this.perguntando() || this.ocupado()) return false; // não empilha perguntas
    this.perguntando.set(true);
    return new Promise((resolve) => (this.resolver = resolve));
  }

  responder(descartar: boolean) {
    this.perguntando.set(false);
    this.resolver?.(descartar);
    this.resolver = null;
  }
}
