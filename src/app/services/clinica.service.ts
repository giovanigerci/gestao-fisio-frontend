import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}

@Service()
export class ClinicaService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/clinicas/`;

  listar() {
    return this.http.get<RespostaPaginada<Clinica>>(this.url);
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
