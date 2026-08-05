import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PacienteService } from '../../../services/paciente.service';

@Component({
  selector: 'app-paciente-form',
  imports: [],
  templateUrl: './paciente-form.html',
  styleUrl: './paciente-form.css',
})
export class PacienteForm {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pacienteService = inject(PacienteService);

  modoEdicao = signal(false);
  pacienteId = signal<number | null>(null);
  carregando = signal(false);
  salvando = signal(false);
  erro = signal('');

  // Form fields
  nome = signal('');
  cpf = signal('');
  telefone = signal('');
  email = signal('');
  dataNascimento = signal('');
  endereco = signal('');
  historicoMedico = signal('');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicao.set(true);
      this.pacienteId.set(+id);
      this.carregarPaciente(+id);
    }
  }

  private carregarPaciente(id: number) {
    this.carregando.set(true);
    this.pacienteService.buscarPorId(id).subscribe({
      next: (paciente) => {
        this.nome.set(paciente.nome);
        this.cpf.set(paciente.cpf);
        this.telefone.set(paciente.telefone);
        this.email.set(paciente.email ?? '');
        this.dataNascimento.set(paciente.data_nascimento ?? '');
        this.endereco.set(paciente.endereco);
        this.historicoMedico.set(paciente.historico_medico);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar dados do paciente.');
        this.carregando.set(false);
      },
    });
  }

  salvar() {
    if (!this.nome().trim() || !this.cpf().trim() || !this.telefone().trim()) {
      this.erro.set('Preencha todos os campos obrigatórios (*).');
      return;
    }

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      nome: this.nome().trim(),
      cpf: this.cpf().trim(),
      telefone: this.telefone().trim(),
      email: this.email().trim() || null,
      data_nascimento: this.dataNascimento() || null,
      endereco: this.endereco().trim(),
      historico_medico: this.historicoMedico().trim(),
    };

    const operacao = this.modoEdicao()
      ? this.pacienteService.atualizar(this.pacienteId()!, dados)
      : this.pacienteService.criar(dados);

    operacao.subscribe({
      next: () => {
        this.router.navigate(['/pacientes']);
      },
      error: (err) => {
        this.salvando.set(false);
        if (err.error && typeof err.error === 'object') {
          const mensagens = Object.entries(err.error)
            .map(([campo, msgs]) => `${campo}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          this.erro.set(mensagens || 'Erro ao salvar paciente.');
        } else {
          this.erro.set('Erro ao salvar paciente. Tente novamente.');
        }
      },
    });
  }

  cancelar() {
    this.router.navigate(['/pacientes']);
  }
}
