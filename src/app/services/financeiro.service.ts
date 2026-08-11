import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

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

@Service()
export class FinanceiroService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/resumo-financeiro/`;

  buscarResumo(periodo: 'mes' | 'semana') {
    return this.http.get<ResumoFinanceiro>(this.url, {
      params: { periodo },
    });
  }
}
