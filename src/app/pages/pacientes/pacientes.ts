import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PacienteService, Paciente } from '../../services/paciente.service';
import { Card } from '../../shared/components/card/card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Badge, BadgeVariant } from '../../shared/components/badge/badge';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { corDoPaciente } from '../../shared/utils/clinic-colors';
import { TelefonePipe } from '../../shared/pipes/telefone.pipe';

@Component({
  selector: 'app-pacientes',
  imports: [RouterLink, Card, EmptyState, Badge, ConfirmModal, TelefonePipe],
  templateUrl: './pacientes.html',
  styleUrls: ['../../../styles/list-page.css', './pacientes.css'],
})
export class Pacientes {
  private pacienteService = inject(PacienteService);
  private router = inject(Router);

  pacientes = signal<Paciente[]>([]);
  termoBusca = signal('');
  carregando = signal(true);
  erro = signal('');
  processandoAcao = signal(false);
  confirmandoExclusao = signal<Paciente | null>(null);

  corDoPaciente = corDoPaciente;

  pacientesFiltrados = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    if (!termo) return this.pacientes();
    return this.pacientes().filter(p =>
      p.nome.toLowerCase().includes(termo)
    );
  });

  totalCadastrados = signal(0);

  constructor() {
    this.carregarPacientes();
  }

  carregarPacientes() {
    this.carregando.set(true);
    this.erro.set('');
    this.pacienteService.listar().subscribe({
      next: (resposta) => {
        this.pacientes.set(resposta.results);
        this.totalCadastrados.set(resposta.count);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar pacientes. Tente novamente.');
        this.carregando.set(false);
      },
    });
  }

  editarPaciente(paciente: Paciente) {
    this.router.navigate(['/pacientes', paciente.id, 'editar']);
  }

  confirmarExclusao(paciente: Paciente, event: Event) {
    event.stopPropagation();
    this.confirmandoExclusao.set(paciente);
  }

  confirmarExclusaoModal() {
    const paciente = this.confirmandoExclusao();
    if (!paciente) return;

    this.processandoAcao.set(true);
    this.pacienteService.excluir(paciente.id).subscribe({
      next: () => {
        this.pacientes.update(lista => lista.filter(p => p.id !== paciente.id));
        this.totalCadastrados.update(total => total - 1);
        this.processandoAcao.set(false);
        this.confirmandoExclusao.set(null);
      },
      error: () => {
        this.erro.set('Erro ao excluir paciente.');
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

  getStatusVariant(status: string): BadgeVariant {
    return status === 'Ativo' ? 'ativo' : 'inativo';
  }

  formatarUltimaVisita(data: string | null): string {
    if (!data) return 'Nunca';
    const partes = data.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return data;
  }
}
