import { Component, input, computed } from '@angular/core';

export type BadgeVariant =
  | 'agendado'
  | 'realizado'
  | 'cancelado'
  | 'experimental'
  | 'gratuito'
  | 'ativo'
  | 'inativo'
  | 'ausente'
  | 'hoje';

/**
 * Badge de status reutilizável.
 *
 * Resolve cor **e** texto internamente a partir da `variant` — garante que
 * status nunca seja comunicado apenas por cor (seção 2 do design system).
 *
 * O `label` pode ser sobrescrito via input quando o texto padrão não se aplica
 * (e.g. "Ativa" feminino vs "Ativo" masculino, ou "Gratuito — não conta na receita").
 *
 * @see docs/design-system-frontend.md — Seção 4
 */
@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class Badge {
  variant = input.required<BadgeVariant>();

  /** Sobrescreve o texto padrão da variant (e.g. "Ativa" em vez de "Ativo"). */
  label = input<string>();

  displayLabel = computed(() => {
    const override = this.label();
    if (override) return override;

    const labels: Record<BadgeVariant, string> = {
      agendado: 'Agendado',
      realizado: 'Realizado',
      cancelado: 'Cancelado',
      experimental: 'Experimental',
      gratuito: 'Gratuito',
      ativo: 'Ativo',
      inativo: 'Inativo',
      ausente: 'Ausente',
      hoje: 'Hoje',
    };
    return labels[this.variant()];
  });
}
