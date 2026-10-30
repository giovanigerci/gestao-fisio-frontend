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

/** Cor e texto saem da `variant`: o status nunca é comunicado só pela cor. */
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
