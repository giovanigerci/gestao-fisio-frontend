import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { RespostaPaginada } from './paciente.service';

export interface Clinica {
  id: number;
  profissional: number;
  nome: string;
  endereco: string;
  telefone: string;
  valor_por_atendimento: string;
  ativo: boolean;
  total_atendimentos?: number;
  receita_total?: string;
}

@Service()
export class ClinicaService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/clinicas/`;

  listar(page = 1, search = '') {
    let params = new HttpParams().set('page', page);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<RespostaPaginada<Clinica>>(this.url, { params });
  }

  listarPorUrl(url: string) {
    return this.http.get<RespostaPaginada<Clinica>>(url);
  }

  buscarOpcoes() {
    return this.http.get<{ id: number, nome: string }[]>(`${this.url}opcoes/`);
  }

  buscarPorId(id: number) {
    return this.http.get<Clinica>(`${this.url}${id}/`);
  }

  criar(dados: Partial<Clinica>) {
    return this.http.post<Clinica>(this.url, dados);
  }

  atualizar(id: number, dados: Partial<Clinica>) {
    return this.http.put<Clinica>(`${this.url}${id}/`, dados);
  }

  excluir(id: number) {
    return this.http.delete(`${this.url}${id}/`);
  }
}
