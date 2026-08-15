import { Component, input, computed } from '@angular/core';

export interface ProgressSegment {
  value: number;
  color: string;
}

/**
 * Barra de progresso/distribuição segmentada.
 *
 * Aceita um array de segmentos (`{ value, color }`), calcula os percentuais
 * automaticamente e renderiza cada segmento proporcionalmente.
 *
 * Usos:
 * - **Financeiro:** barra de distribuição por clínica (múltiplos segmentos)
 * - **Agenda:** indicador de slots preenchidos (um segmento)
 * - **Clínicas/Cards:** progresso individual de uma clínica
 *
 * @see docs/design-system-frontend.md — Seção 4
 */
@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.css',
})
export class ProgressBar {
  segments = input.required<ProgressSegment[]>();

  /** Altura da barra em px (default: 6). */
  height = input(6);

  normalizedSegments = computed(() => {
    const segs = this.segments();
    const total = segs.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return [];
    return segs.map(s => ({
      ...s,
      percent: (s.value / total) * 100,
    }));
  });
}
