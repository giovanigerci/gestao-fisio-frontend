import { Component, input } from '@angular/core';

/**
 * Estado vazio padronizado para listas sem dados.
 *
 * Aceita um ícone via content projection (`[icon]`), um `title` e um
 * `subtitle` opcionais. Usado em qualquer tela que pode não ter dados
 * (Pacientes, Clínicas, Agenda, Financeiro).
 *
 * @see docs/design-system-frontend.md — Seção 4
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  title = input.required<string>();
  subtitle = input<string>();
}
