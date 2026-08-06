import { Component, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AgendamentoService, Agendamento } from '../../services/agendamento.service';
import { PacienteService, Paciente } from '../../services/paciente.service';
import { ClinicaService, Clinica } from '../../services/clinica.service';

interface DiaAgenda {
  data: string;
  diaSemana: string;
  diaFormatado: string;
  ehHoje: boolean;
  agendamentos: Agendamento[];
}

@Component({
  selector: 'app-agenda',
  imports: [RouterLink],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
})
export class Agenda {
  private agendamentoService = inject(AgendamentoService);
  private pacienteService = inject(PacienteService);
  private clinicaService = inject(ClinicaService);
  private router = inject(Router);

  agendamentos = signal<Agendamento[]>([]);
  pacientes = signal<Paciente[]>([]);
  clinicas = signal<Clinica[]>([]);
  carregando = signal(true);
  erro = signal('');
  dataReferencia = signal(new Date());
  agendamentoSelecionado = signal<Agendamento | null>(null);
  processandoAcao = signal(false);

  private readonly DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  private readonly MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  inicioSemana = computed(() => {
    const d = new Date(this.dataReferencia());
    const dia = d.getDay();
    const diff = dia === 0 ? 6 : dia - 1; // Segunda = início
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  fimSemana = computed(() => {
    const d = new Date(this.inicioSemana());
    d.setDate(d.getDate() + 6);
    return d;
  });

  tituloSemana = computed(() => {
    const inicio = this.inicioSemana();
    const fim = this.fimSemana();
    const mesInicio = this.MESES[inicio.getMonth()];
    const mesFim = this.MESES[fim.getMonth()];

    if (inicio.getMonth() === fim.getMonth()) {
      return `${inicio.getDate()} – ${fim.getDate()} ${mesFim} ${fim.getFullYear()}`;
    }
    return `${inicio.getDate()} ${mesInicio} – ${fim.getDate()} ${mesFim} ${fim.getFullYear()}`;
  });

  diasDaSemana = computed<DiaAgenda[]>(() => {
    const inicio = this.inicioSemana();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const todosAgendamentos = this.agendamentos();

    const dias: DiaAgenda[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      const dataStr = this.formatarData(d);

      const agendamentosDoDia = todosAgendamentos
        .filter(a => a.data === dataStr)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

      dias.push({
        data: dataStr,
        diaSemana: this.DIAS_SEMANA[d.getDay()],
        diaFormatado: `${d.getDate()} ${this.MESES[d.getMonth()]}`,
        ehHoje: d.getTime() === hoje.getTime(),
        agendamentos: agendamentosDoDia,
      });
    }
    return dias;
  });

  constructor() {
    // Carregar pacientes e clínicas para lookup de nomes
    this.pacienteService.listar().subscribe({
      next: (resp) => this.pacientes.set(resp.results),
      error: () => {},
    });

    this.clinicaService.listar().subscribe({
      next: (resp) => this.clinicas.set(resp.results),
      error: () => {},
    });

    // Sempre que a semana mudar, buscar agendamentos do intervalo correto
    effect(() => {
      const dataInicio = this.formatarData(this.inicioSemana());
      const dataFim = this.formatarData(this.fimSemana());
      this.carregarAgendamentos(dataInicio, dataFim);
    });
  }

  carregarAgendamentos(dataInicio?: string, dataFim?: string) {
    if (!dataInicio || !dataFim) {
      const inicio = this.inicioSemana();
      const fim = this.fimSemana();
      dataInicio = this.formatarData(inicio);
      dataFim = this.formatarData(fim);
    }

    this.carregando.set(true);
    this.erro.set('');

    this.agendamentoService.listar(dataInicio, dataFim).subscribe({
      next: (resp) => {
        this.agendamentos.set(resp.results);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar agendamentos. Tente novamente.');
        this.carregando.set(false);
      },
    });
  }

  semanaAnterior() {
    this.dataReferencia.update(d => {
      const nova = new Date(d);
      nova.setDate(nova.getDate() - 7);
      return nova;
    });
  }

  proximaSemana() {
    this.dataReferencia.update(d => {
      const nova = new Date(d);
      nova.setDate(nova.getDate() + 7);
      return nova;
    });
  }

  irParaHoje() {
    this.dataReferencia.set(new Date());
  }

  abrirDetalhes(agendamento: Agendamento) {
    this.agendamentoSelecionado.set(agendamento);
  }

  fecharDetalhes() {
    this.agendamentoSelecionado.set(null);
  }

  editarAgendamento(agendamento: Agendamento) {
    this.fecharDetalhes();
    this.router.navigate(['/agenda', agendamento.id, 'editar']);
  }

  marcarComoRealizado(agendamento: Agendamento) {
    this.processandoAcao.set(true);
    this.agendamentoService.atualizarParcial(agendamento.id, { status: 'RE' }).subscribe({
      next: (atualizado) => {
        this.agendamentos.update(lista =>
          lista.map(a => a.id === atualizado.id ? atualizado : a)
        );
        this.agendamentoSelecionado.set(atualizado);
        this.processandoAcao.set(false);
      },
      error: () => {
        this.erro.set('Erro ao marcar como realizado.');
        this.processandoAcao.set(false);
      },
    });
  }

  cancelarAgendamento(agendamento: Agendamento) {
    this.processandoAcao.set(true);
    this.agendamentoService.atualizarParcial(agendamento.id, { status: 'CA' }).subscribe({
      next: (atualizado) => {
        this.agendamentos.update(lista =>
          lista.map(a => a.id === atualizado.id ? atualizado : a)
        );
        this.agendamentoSelecionado.set(atualizado);
        this.processandoAcao.set(false);
      },
      error: () => {
        this.erro.set('Erro ao cancelar agendamento.');
        this.processandoAcao.set(false);
      },
    });
  }

  excluirAgendamento(agendamento: Agendamento) {
    if (!confirm('Deseja realmente excluir este agendamento?')) return;

    this.processandoAcao.set(true);
    this.agendamentoService.excluir(agendamento.id).subscribe({
      next: () => {
        this.agendamentos.update(lista => lista.filter(a => a.id !== agendamento.id));
        this.fecharDetalhes();
        this.processandoAcao.set(false);
      },
      error: () => {
        this.erro.set('Erro ao excluir agendamento.');
        this.processandoAcao.set(false);
      },
    });
  }

  getNomePaciente(id: number): string {
    return this.pacientes().find(p => p.id === id)?.nome ?? '—';
  }

  getNomeClinica(id: number): string {
    return this.clinicas().find(c => c.id === id)?.nome ?? '—';
  }

  getIniciais(nome: string): string {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  formatarHora(hora: string): string {
    return hora.substring(0, 5); // 'HH:MM:SS' -> 'HH:MM'
  }

  formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'AG': return 'Agendado';
      case 'RE': return 'Realizado';
      case 'CA': return 'Cancelado';
      default: return status;
    }
  }

  private formatarData(d: Date): string {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
