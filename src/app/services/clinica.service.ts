import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, tap } from 'rxjs';
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
  /** Posição na paleta (1 a 5), escolhida pelo backend na criação. */
  cor?: number;
  total_atendimentos?: number;
  receita_total?: string;
  /** Realizados não experimentais no mês atual (mesma regra do resumo financeiro). */
  atendimentos_mes?: number;
  receita_mes?: string;
}

@Service()
export class ClinicaService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/clinicas/`;
  private readonly alteradas = new Subject<void>();

  /** Emite depois de criar, editar ou excluir: a listagem recarrega sem depender de quem alterou. */
  readonly alteradas$ = this.alteradas.asObservable();

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
    return this.http.get<{ id: number, nome: string, cor: number }[]>(`${this.url}opcoes/`);
  }

  buscarPorId(id: number) {
    return this.http.get<Clinica>(`${this.url}${id}/`);
  }

  criar(dados: Partial<Clinica>) {
    return this.http.post<Clinica>(this.url, dados).pipe(tap(() => this.alteradas.next()));
  }

  atualizar(id: number, dados: Partial<Clinica>) {
    return this.http.put<Clinica>(`${this.url}${id}/`, dados).pipe(tap(() => this.alteradas.next()));
  }

  excluir(id: number) {
    return this.http.delete(`${this.url}${id}/`).pipe(tap(() => this.alteradas.next()));
  }
}
