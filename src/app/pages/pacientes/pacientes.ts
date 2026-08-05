import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PacienteService, Paciente } from '../../services/paciente.service';

@Component({
  selector: 'app-pacientes',
  imports: [RouterLink],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css',
})
export class Pacientes {
  private pacienteService = inject(PacienteService);
  private router = inject(Router);

  pacientes = signal<Paciente[]>([]);
  termoBusca = signal('');
  carregando = signal(true);
  erro = signal('');

  pacientesFiltrados = computed(() => {
    const termo = this.termoBusca().toLowerCase().trim();
    if (!termo) return this.pacientes();
    return this.pacientes().filter(p =>
      p.nome.toLowerCase().includes(termo)
    );
  });

  constructor() {
    this.carregarPacientes();
  }

  carregarPacientes() {
    this.carregando.set(true);
    this.erro.set('');
    this.pacienteService.listar().subscribe({
      next: (resposta) => {
        this.pacientes.set(resposta.results);
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
    if (confirm(`Deseja excluir o paciente "${paciente.nome}"?`)) {
      this.pacienteService.excluir(paciente.id).subscribe({
        next: () => {
          this.pacientes.update(lista => lista.filter(p => p.id !== paciente.id));
        },
        error: () => {
          this.erro.set('Erro ao excluir paciente.');
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
}
