import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClinicaService, Clinica } from '../../services/clinica.service';
import { Card } from '../../shared/components/card/card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Badge, BadgeVariant } from '../../shared/components/badge/badge';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { corDoPaciente } from '../../shared/utils/clinic-colors';

@Component({
  selector: 'app-clinicas',
  imports: [RouterLink, Card, EmptyState, Badge, ConfirmModal],
  templateUrl: './clinicas.html',
  styleUrls: ['../../../styles/list-page.css', './clinicas.css'],
})
export class Clinicas {
  private clinicaService = inject(ClinicaService);
  private router = inject(Router);

  clinicas = signal<Clinica[]>([]);
  termoBusca = signal('');
  carregando = signal(true);
  erro = signal('');
  processandoAcao = signal(false);
  confirmandoExclusao = signal<Clinica | null>(null);

  corDoPaciente = corDoPaciente;

  clinicasFiltradas = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    if (!termo) return this.clinicas();
    return this.clinicas().filter(c =>
      c.nome.toLowerCase().includes(termo)
    );
  });

  totalCadastradas = signal(0);

  constructor() {
    this.carregarClinicas();
  }

  carregarClinicas() {
    this.carregando.set(true);
    this.erro.set('');
    this.clinicaService.listar().subscribe({
      next: (resposta) => {
        this.clinicas.set(resposta.results);
        this.totalCadastradas.set(resposta.count);
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
    this.confirmandoExclusao.set(clinica);
  }

  confirmarExclusaoModal() {
    const clinica = this.confirmandoExclusao();
    if (!clinica) return;

    this.processandoAcao.set(true);
    this.clinicaService.excluir(clinica.id).subscribe({
      next: () => {
        this.clinicas.update(lista => lista.filter(c => c.id !== clinica.id));
        this.totalCadastradas.update(total => total - 1);
        this.processandoAcao.set(false);
        this.confirmandoExclusao.set(null);
      },
      error: () => {
        this.erro.set('Erro ao excluir clínica.');
        this.processandoAcao.set(false);
        this.confirmandoExclusao.set(null);
      },
    });
  }

  cancelarExclusao() {
    this.confirmandoExclusao.set(null);
  }

  getIniciais(nome: string): string {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  formatarValor(valor: string | undefined): string {
    if (!valor) return 'R$ 0,00';
    return (+valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getStatusVariant(ativo: boolean): BadgeVariant {
    return ativo ? 'ativo' : 'inativo';
  }
}
