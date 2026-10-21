import { Agendamento } from '../../services/agendamento.service';
import { BadgeVariant } from '../../shared/components/badge/badge';
import { ProgressSegment } from '../../shared/components/progress-bar/progress-bar';

export interface ResumoDoDia {
  realizados: number;
  total: number;
  valorTotal: number;
}

export function resumirDia(agendamentos: Agendamento[]): ResumoDoDia {
  return {
    realizados: agendamentos.filter((a) => a.status === 'RE').length,
    total: agendamentos.length,
    valorTotal: agendamentos
      .filter((a) => a.status !== 'CA' && !a.eh_experimental)
      .reduce((soma, a) => soma + (Number(a.valor_calculado) || 0), 0),
  };
}

export function segmentosDoProgresso(resumo: ResumoDoDia): ProgressSegment[] {
  if (resumo.total === 0) return [];
  const segmentos: ProgressSegment[] = [];
  if (resumo.realizados > 0) segmentos.push({ value: resumo.realizados, color: 'var(--color-money)' });
  const restante = resumo.total - resumo.realizados;
  if (restante > 0) segmentos.push({ value: restante, color: 'var(--color-border)' });
  return segmentos;
}

export function varianteDoStatus(status: string): BadgeVariant {
  switch (status) {
    case 'RE': return 'realizado';
    case 'CA': return 'cancelado';
    default: return 'agendado';
  }
}

export function formatarValor(valor: number): string {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
