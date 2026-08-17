import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgendamentoService } from '../../../services/agendamento.service';
import { PacienteService, Paciente } from '../../../services/paciente.service';
import { ClinicaService, Clinica } from '../../../services/clinica.service';

@Component({
  selector: 'app-agendamento-form',
  imports: [],
  templateUrl: './agendamento-form.html',
  styleUrl: './agendamento-form.css',
})
export class AgendamentoForm {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private agendamentoService = inject(AgendamentoService);
  private pacienteService = inject(PacienteService);
  private clinicaService = inject(ClinicaService);

  modoEdicao = signal(false);
  agendamentoId = signal<number | null>(null);
  carregando = signal(false);
  salvando = signal(false);
  erro = signal('');

  // Dropdown data
  pacientes = signal<Paciente[]>([]);
  clinicas = signal<Clinica[]>([]);
  carregandoDropdowns = signal(true);

  // Form fields
  paciente = signal<number | null>(null);
  clinica = signal<number | null>(null);
  data = signal('');
  horaInicio = signal('');
  horaFim = signal('');
  ehExperimental = signal(false);

  constructor() {
    this.carregarDropdowns();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicao.set(true);
      this.agendamentoId.set(+id);
      this.carregarAgendamento(+id);
    } else {
      // Pre-fill date from query param when creating a new appointment
      const dataParam = this.route.snapshot.queryParamMap.get('data');
      if (dataParam) {
        this.data.set(dataParam);
      }
    }
  }

  private carregarDropdowns() {
    this.carregandoDropdowns.set(true);
    let carregados = 0;
    const verificarCompleto = () => {
      carregados++;
      if (carregados >= 2) this.carregandoDropdowns.set(false);
    };

    this.pacienteService.listar().subscribe({
      next: (resp) => {
        this.pacientes.set(resp.results);
        verificarCompleto();
      },
      error: () => {
        this.erro.set('Erro ao carregar lista de pacientes.');
        verificarCompleto();
      },
    });

    this.clinicaService.listar().subscribe({
      next: (resp) => {
        this.clinicas.set(resp.results);
        verificarCompleto();
      },
      error: () => {
        this.erro.set('Erro ao carregar lista de clínicas.');
        verificarCompleto();
      },
    });
  }

  private carregarAgendamento(id: number) {
    this.carregando.set(true);
    this.agendamentoService.buscarPorId(id).subscribe({
      next: (ag) => {
        this.paciente.set(ag.paciente);
        this.clinica.set(ag.clinica);
        this.data.set(ag.data);
        this.horaInicio.set(ag.hora_inicio.substring(0, 5));
        this.horaFim.set(ag.hora_fim.substring(0, 5));
        this.ehExperimental.set(ag.eh_experimental);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar dados do agendamento.');
        this.carregando.set(false);
      },
    });
  }

  salvar() {
    if (!this.paciente() || !this.clinica() || !this.data() || !this.horaInicio() || !this.horaFim()) {
      this.erro.set('Preencha todos os campos obrigatórios (*).');
      return;
    }

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      paciente: this.paciente()!,
      clinica: this.clinica()!,
      data: this.data(),
      hora_inicio: this.horaInicio(),
      hora_fim: this.horaFim(),
      eh_experimental: this.ehExperimental(),
    };

    const operacao = this.modoEdicao()
      ? this.agendamentoService.atualizar(this.agendamentoId()!, dados)
      : this.agendamentoService.criar(dados);

    operacao.subscribe({
      next: () => {
        this.router.navigate(['/agenda']);
      },
      error: (err) => {
        this.salvando.set(false);
        if (err.error && typeof err.error === 'object') {
          const mensagens = Object.entries(err.error)
            .map(([campo, msgs]) => `${campo}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          this.erro.set(mensagens || 'Erro ao salvar agendamento.');
        } else {
          this.erro.set('Erro ao salvar agendamento. Tente novamente.');
        }
      },
    });
  }

  onHoraInicioChange(valor: string) {
    this.horaInicio.set(valor);
    if (valor) {
      const [h, m] = valor.split(':').map(Number);
      const horaFim = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      this.horaFim.set(horaFim);
    }
  }

  cancelar() {
    this.router.navigate(['/agenda']);
  }
}
