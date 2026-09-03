import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PacienteService } from '../../../services/paciente.service';
import { TelefoneMaskDirective } from '../../../shared/directives/telefone-mask.directive';
import { tratarErrosApi, temErro, mensagensErro } from '../../../shared/utils/form-errors';

@Component({
  selector: 'app-paciente-form',
  imports: [TelefoneMaskDirective],
  templateUrl: './paciente-form.html',
  styleUrls: ['../../../../styles/form-page.css', './paciente-form.css'],
})
export class PacienteForm {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pacienteService = inject(PacienteService);

  modoEdicao = signal(false);
  pacienteId = signal<number | null>(null);
  carregando = signal(false);
  salvando = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});

  // Form fields
  nome = signal('');
  cpf = signal('');
  telefone = signal('');
  email = signal('');
  dataNascimento = signal('');
  erroDataNascimento = signal('');
  endereco = signal('');
  historicoMedico = signal('');

  // Limites para data de nascimento
  readonly hoje = new Date().toISOString().split('T')[0];
  readonly dataMinima = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d.toISOString().split('T')[0];
  })();

  readonly dataValida = computed(() => {
    const valor = this.dataNascimento();
    if (!valor) return true; // campo opcional
    if (valor > this.hoje) return false;
    if (valor < this.dataMinima) return false;
    return true;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicao.set(true);
      this.pacienteId.set(+id);
      this.carregarPaciente(+id);
    }
  }

  validarDataNascimento() {
    const valor = this.dataNascimento();
    if (!valor) {
      this.erroDataNascimento.set('');
      return;
    }
    if (valor > this.hoje) {
      this.erroDataNascimento.set('Data de nascimento não pode ser uma data futura.');
    } else if (valor < this.dataMinima) {
      this.erroDataNascimento.set('Data de nascimento inválida (máximo 120 anos).');
    } else {
      this.erroDataNascimento.set('');
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
        this.erroGeral.set('Erro ao carregar dados do paciente.');
        this.carregando.set(false);
      },
    });
  }

  salvar() {
    this.erros.set({});
    this.erroGeral.set('');

    if (!this.nome().trim() || !this.cpf().trim() || !this.telefone().trim()) {
      this.erroGeral.set('Preencha todos os campos obrigatórios (*).');
      return;
    }

    if (!this.dataValida()) {
      this.validarDataNascimento();
      this.erroGeral.set('Corrija os erros antes de salvar.');
      return;
    }

    this.salvando.set(true);

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
        tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao salvar paciente.');
      },
    });
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }

  cancelar() {
    this.router.navigate(['/pacientes']);
  }
}
