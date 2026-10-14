import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ResumoDosDados {
  clinicas: number;
  pacientes: number;
  agendamentos: number;
}

/** Direitos do titular sobre os próprios dados (LGPD): resumo, exportação e exclusão da conta. */
@Service()
export class ContaService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth/`;

  resumo() {
    return this.http.get<ResumoDosDados>(`${this.url}me/dados/`);
  }

  /** ZIP com as planilhas (clínicas, pacientes, sessões e perfil). */
  exportar() {
    return this.http.get(`${this.url}me/exportar/`, { responseType: 'blob' });
  }

  /** Exclusão definitiva e imediata; a senha confirma que é o dono da conta. */
  excluir(senha: string) {
    return this.http.post<{ detail: string }>(`${this.url}excluir-conta/`, { senha });
  }
}
