import { CanDeactivateFn } from '@angular/router';

export interface ComAlteracoesPendentes {
  /** Retorna true (ou uma Promise que resolve true) se a navegação pode prosseguir. */
  confirmarSaida(): boolean | Promise<boolean>;
}

export const alteracoesPendentesGuard: CanDeactivateFn<ComAlteracoesPendentes> = (component) =>
  component.confirmarSaida();
