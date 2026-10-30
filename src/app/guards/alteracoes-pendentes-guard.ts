import { CanDeactivateFn } from '@angular/router';

export interface ComAlteracoesPendentes {
  confirmarSaida(): boolean | Promise<boolean>;
}

export const alteracoesPendentesGuard: CanDeactivateFn<ComAlteracoesPendentes> = (component) =>
  component.confirmarSaida();
