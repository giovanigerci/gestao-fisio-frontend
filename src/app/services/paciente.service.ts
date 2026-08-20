import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Paciente {
  id: number;
  profissional: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string | null;
  data_nascimento: string | null;
  endereco: string;
  historico_medico: string;
  ultima_visita: string | null;
  total_sessoes: number;
  status: 'Ativo' | 'Inativo';
}

export interface RespostaPaginada<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Service()
export class PacienteService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pacientes/`;

  listar() {
    return this.http.get<RespostaPaginada<Paciente>>(this.url);
  }

  buscarOpcoes() {
    return this.http.get<{ id: number, nome: string }[]>(`${this.url}opcoes/`);
  }

  buscarPorId(id: number) {
    return this.http.get<Paciente>(`${this.url}${id}/`);
  }

  criar(dados: Partial<Paciente>) {
    return this.http.post<Paciente>(this.url, dados);
  }

  atualizar(id: number, dados: Partial<Paciente>) {
    return this.http.put<Paciente>(`${this.url}${id}/`, dados);
  }

  excluir(id: number) {
    return this.http.delete(`${this.url}${id}/`);
  }
}
