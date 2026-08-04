import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private http = inject(HttpClient);

  pacientes = signal<any[]>([]);
  
  constructor() {
    this.http.get<any>(`${environment.apiUrl}/pacientes/`).subscribe({
      next: (resposta) => {
        this.pacientes.set(resposta.results);
        console.log('Pacientes carregados com sucesso:', resposta);
      },
      error: (erro) => {
        console.error('Erro ao carregar pacientes:', erro);
      },
    });
  }
}
