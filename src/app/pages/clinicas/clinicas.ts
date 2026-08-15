import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClinicaService, Clinica } from '../../services/clinica.service';

import { Card } from '../../shared/components/card/card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Badge } from '../../shared/components/badge/badge';

@Component({
  selector: 'app-clinicas',
  imports: [RouterLink, Card, EmptyState, Badge],
  templateUrl: './clinicas.html',
  styleUrl: './clinicas.css',
})
export class Clinicas {
  private clinicaService = inject(ClinicaService);
  private router = inject(Router);

  clinicas = signal<Clinica[]>([]);
  termoBusca = signal('');
  carregando = signal(true);
  erro = signal('');

  clinicasFiltradas = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    if (!termo) return this.clinicas();
    return this.clinicas().filter(c =>
      c.nome.toLowerCase().includes(termo)
    );
  });

  constructor() {
    this.carregarClinicas();
  }

  carregarClinicas() {
    this.carregando.set(true);
    this.erro.set('');
    this.clinicaService.listar().subscribe({
      next: (resposta) => {
        this.clinicas.set(resposta.results);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar clínicas. Tente novamente.');
        this.carregando.set(false);
      },
    });
  }

  editarClinica(clinica: Clinica) {
    this.router.navigate(['/clinicas', clinica.id, 'editar']);
  }

  confirmarExclusao(clinica: Clinica, event: Event) {
    event.stopPropagation();
    if (confirm(`Deseja excluir a clínica "${clinica.nome}"?`)) {
      this.clinicaService.excluir(clinica.id).subscribe({
        next: () => {
          this.clinicas.update(lista => lista.filter(c => c.id !== clinica.id));
        },
        error: () => {
          this.erro.set('Erro ao excluir clínica.');
        },
      });
    }
  }

  getIniciais(nome: string): string {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  formatarValor(valor: string): string {
    return (+valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
