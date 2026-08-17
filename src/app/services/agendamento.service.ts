import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RespostaPaginada } from './paciente.service';

export interface Agendamento {
  id: number;
  profissional: number;
  clinica: number;
  paciente: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: 'AG' | 'RE' | 'CA';
  eh_experimental: boolean;
  valor_calculado: number;
}

@Service()
export class AgendamentoService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/agendamentos/`;

  listar(dataInicio?: string, dataFim?: string) {
    let params: { [key: string]: string } = {};
    if (dataInicio) params['data_inicio'] = dataInicio;
    if (dataFim) params['data_fim'] = dataFim;
    return this.http.get<RespostaPaginada<Agendamento>>(this.url, { params });
  }

  buscarPorId(id: number) {
    return this.http.get<Agendamento>(`${this.url}${id}/`);
  }

  criar(dados: Partial<Agendamento>) {
    return this.http.post<Agendamento>(this.url, dados);
  }

  atualizar(id: number, dados: Partial<Agendamento>) {
    return this.http.put<Agendamento>(`${this.url}${id}/`, dados);
  }

  atualizarParcial(id: number, dados: Partial<Agendamento>) {
    return this.http.patch<Agendamento>(`${this.url}${id}/`, dados);
  }

  excluir(id: number) {
    return this.http.delete(`${this.url}${id}/`);
  }
}
