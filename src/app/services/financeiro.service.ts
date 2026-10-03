import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type PeriodoFinanceiro = 'mes' | 'semana';
export type AgrupamentoHistorico = 'mes' | 'ano';

export interface ResumoClinica {
  clinica: number;
  clinica__nome: string;
  total_atendimentos: number;
  receita_total: number;
}

export interface ResumoFinanceiro {
  por_clinica: ResumoClinica[];
  total_geral: number;
}

export interface DiaEvolucao {
  data: string;
  realizado: number;
  acumulado: number;
  previsto: number;
  acumulado_com_previsto: number;
}

export interface DiaEvolucaoAnterior {
  data: string;
  realizado: number;
  acumulado: number;
}

/** Série diária da receita (todos os valores calculados no backend). */
export interface EvolucaoReceita {
  periodo: { inicio: string; fim: string };
  dias: DiaEvolucao[];
  anterior: { inicio: string; fim: string; dias: DiaEvolucaoAnterior[] };
  totais: { realizado: number; previsto: number; anterior: number };
}

export interface PeriodoHistorico {
  /** 'YYYY-MM' no agrupamento por mês, 'YYYY' por ano. */
  periodo: string;
  receita: number;
  atendimentos: number;
  /** Mesmo mês do ano anterior (por mês) ou ano anterior (por ano). */
  receita_periodo_anterior: number;
}

/** Receita realizada por mês (12 meses até o atual) ou por ano (do primeiro com receita até o atual). */
export interface HistoricoReceita {
  agrupar: AgrupamentoHistorico;
  periodos: PeriodoHistorico[];
  resumo: {
    total: number;
    media: number;
    melhor_periodo: PeriodoHistorico | null;
    total_periodo_anterior: number;
    variacao_percentual: number | null;
  };
}

@Service()
export class FinanceiroService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/resumo-financeiro/`;

  buscarResumo(periodo: PeriodoFinanceiro, data?: string) {
    return this.http.get<ResumoFinanceiro>(this.url, { params: this.params(periodo, data) });
  }

  buscarEvolucao(periodo: PeriodoFinanceiro, data?: string) {
    return this.http.get<EvolucaoReceita>(`${this.url}evolucao/`, { params: this.params(periodo, data) });
  }

  buscarHistorico(agrupar: AgrupamentoHistorico, data?: string) {
    const params: Record<string, string> = data ? { agrupar, data } : { agrupar };
    return this.http.get<HistoricoReceita>(`${this.url}historico/`, { params });
  }

  private params(periodo: PeriodoFinanceiro, data?: string): Record<string, string> {
    return data ? { periodo, data } : { periodo };
  }
}
