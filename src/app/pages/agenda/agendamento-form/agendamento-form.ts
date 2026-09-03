import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgendamentoService } from '../../../services/agendamento.service';
import { PacienteService, Paciente } from '../../../services/paciente.service';
import { ClinicaService, Clinica } from '../../../services/clinica.service';
import { HttpErrorResponse } from '@angular/common/http';
import { tratarErrosApi, temErro, mensagensErro } from '../../../shared/utils/form-errors';

@Component({
  selector: 'app-agendamento-form',
  imports: [],
  templateUrl: './agendamento-form.html',
  styleUrls: ['../../../../styles/form-page.css', './agendamento-form.css'],
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
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});

  // Dropdown data
  pacientes = signal<{ id: number, nome: string }[]>([]);
  clinicas = signal<{ id: number, nome: string }[]>([]);
  carregandoDropdowns = signal(true);

  // Form fields
  paciente = signal<number | null>(null);
  clinica = signal<number | null>(null);
  data = signal('');
  horaInicio = signal('');
  horaFim = signal('');
  ehExperimental = signal(false);

  // Recorrência
  repetirSemanal = signal(false);
  repeticoes = signal<number>(4);
  conflitos = signal<string[]>([]);
  totalCriados = signal(0);

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

    this.pacienteService.buscarOpcoes().subscribe({
      next: (resp) => {
        this.pacientes.set(resp);
        verificarCompleto();
      },
      error: () => {
        this.erroGeral.set('Erro ao carregar lista de pacientes.');
        verificarCompleto();
      },
    });

    this.clinicaService.buscarOpcoes().subscribe({
      next: (resp) => {
        this.clinicas.set(resp);
        verificarCompleto();
      },
      error: () => {
        this.erroGeral.set('Erro ao carregar lista de clínicas.');
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
        this.erroGeral.set('Erro ao carregar dados do agendamento.');
        this.carregando.set(false);
      },
    });
  }

  salvar() {
    this.erros.set({});
    this.erroGeral.set('');

    if (!this.paciente() || !this.clinica() || !this.data() || !this.horaInicio() || !this.horaFim()) {
      this.erroGeral.set('Preencha todos os campos obrigatórios (*).');
      return;
    }

    if (this.repetirSemanal() && !this.modoEdicao()) {
      const rep = this.repeticoes();
      if (!rep || rep < 1 || rep > 12) {
        this.erroGeral.set('Informe a quantidade de repetições (entre 1 e 12).');
        return;
      }
    }

    this.salvando.set(true);
    this.conflitos.set([]);

    const dados = {
      paciente: this.paciente()!,
      clinica: this.clinica()!,
      data: this.data(),
      hora_inicio: this.horaInicio(),
      hora_fim: this.horaFim(),
      eh_experimental: this.ehExperimental(),
    };

    if (this.repetirSemanal() && !this.modoEdicao()) {
      this.agendamentoService.criarRecorrente({ ...dados, repeticoes: this.repeticoes() }).subscribe({
        next: (resp) => {
          this.salvando.set(false);
          if (resp.agendamentos_conflitantes.length === 0) {
            this.router.navigate(['/agenda']);
          } else {
            this.totalCriados.set(resp.agendamentos_criados.length);
            this.conflitos.set(resp.agendamentos_conflitantes.map(d => this.formatarData(d)));
          }
        },
        error: (err) => {
          this.salvando.set(false);
          this.tratarErro(err);
        },
      });
    } else {
      const operacao = this.modoEdicao()
        ? this.agendamentoService.atualizar(this.agendamentoId()!, dados)
        : this.agendamentoService.criar(dados);

      operacao.subscribe({
        next: () => {
          this.router.navigate(['/agenda']);
        },
        error: (err) => {
          this.salvando.set(false);
          this.tratarErro(err);
        },
      });
    }
  }

  private tratarErro(err: HttpErrorResponse) {
    tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao salvar agendamento.');
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }

  private formatarData(dataISO: string): string {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
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
