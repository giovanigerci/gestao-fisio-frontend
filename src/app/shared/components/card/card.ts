import { Component, input } from '@angular/core';

/**
 * Container de card padronizado.
 *
 * Fundo `--color-surface`, borda `--color-border`, border-radius consistente.
 * Aceita uma cor de clínica opcional para exibir borda lateral colorida
 * (e.g. cards de agendamento na Agenda — seção 6 do design system).
 *
 * O conteúdo é projetado via `<ng-content>`.
 *
 * @see docs/design-system-frontend.md — Seção 4
 */
@Component({
  selector: 'app-card',
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  /** Cor da borda lateral esquerda (e.g. `corDaClinica(id)` retorna `var(--color-clinic-N)`). */
  clinicColor = input<string>();
}
