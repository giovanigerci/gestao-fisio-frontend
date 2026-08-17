import { Component, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AgendamentoService, Agendamento } from '../../services/agendamento.service';
import { PacienteService, Paciente } from '../../services/paciente.service';
import { ClinicaService, Clinica } from '../../services/clinica.service';
import { Badge, BadgeVariant } from '../../shared/components/badge/badge';
import { Card } from '../../shared/components/card/card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ProgressBar } from '../../shared/components/progress-bar/progress-bar';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { corDaClinica } from '../../shared/utils/clinic-colors';

interface DiaAgenda {
  data: string;
  diaSemana: string;
  diaSemanaAbrev: string;
  diaNumero: number;
  diaFormatado: string;
  ehHoje: boolean;
  agendamentos: Agendamento[];
}

@Component({
  selector: 'app-agenda',
  imports: [RouterLink, Badge, Card, EmptyState, ProgressBar, ConfirmModal],
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
  dataSelecionada = signal(this.formatarData(new Date()));
  agendamentoSelecionado = signal<Agendamento | null>(null);
  processandoAcao = signal(false);
  confirmandoExclusao = signal<Agendamento | null>(null);

  corDaClinica = corDaClinica;

  private readonly DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  private readonly DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  private readonly MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  private readonly MESES_EXTENSO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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

    if (inicio.getMonth() === fim.getMonth()) {
      return `${inicio.getDate()} – ${fim.getDate()} De ${this.MESES_EXTENSO[fim.getMonth()]}`;
    }
    return `${inicio.getDate()} ${this.MESES[inicio.getMonth()]} – ${fim.getDate()} ${this.MESES[fim.getMonth()]} ${fim.getFullYear()}`;
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
        diaSemanaAbrev: this.DIAS_ABREV[d.getDay()],
        diaNumero: d.getDate(),
        diaFormatado: `${d.getDate()} De ${this.MESES_EXTENSO[d.getMonth()]}`,
        ehHoje: d.getTime() === hoje.getTime(),
        agendamentos: agendamentosDoDia,
      });
    }
    return dias;
  });

  diaSelecionado = computed(() => {
    const dias = this.diasDaSemana();
    const sel = this.dataSelecionada();
    return dias.find(d => d.data === sel) || dias.find(d => d.ehHoje) || dias[0];
  });

  resumoDia = computed(() => {
    const dia = this.diaSelecionado();
    if (!dia) return { realizados: 0, total: 0, valorTotal: 0 };
    const ags = dia.agendamentos;
    return {
      realizados: ags.filter(a => a.status === 'RE').length,
      total: ags.length,
      valorTotal: ags
        .filter(a => a.status !== 'CA' && !a.eh_experimental)
        .reduce((sum, a) => sum + a.valor_calculado, 0),
    };
  });

  progressSegments = computed(() => {
    const r = this.resumoDia();
    if (r.total === 0) return [];
    const segs: { value: number; color: string }[] = [];
    if (r.realizados > 0) {
      segs.push({ value: r.realizados, color: 'var(--color-money)' });
    }
    const restante = r.total - r.realizados;
    if (restante > 0) {
      segs.push({ value: restante, color: 'var(--color-border)' });
    }
    return segs;
  });

  clinicasDoDia = computed(() => {
    const dia = this.diaSelecionado();
    if (!dia) return [];
    const clinicaIds = [...new Set(dia.agendamentos.map(a => a.clinica))];
    return clinicaIds.map(id => ({
      id,
      nome: this.getNomeClinica(id),
      cor: corDaClinica(id),
    }));
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
    this.dataSelecionada.set(this.formatarData(new Date()));
  }

  selecionarDia(data: string) {
    this.dataSelecionada.set(data);
  }

  abrirDetalhes(agendamento: Agendamento) {
    this.agendamentoSelecionado.set(agendamento);
  }

  fecharDetalhes() {
    this.agendamentoSelecionado.set(null);
  }

  novoAgendamento() {
    const dataSel = this.dataSelecionada();
    this.router.navigate(['/agenda/novo'], { queryParams: { data: dataSel } });
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
        this.processandoAcao.set(false);
        this.fecharDetalhes();
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
        this.processandoAcao.set(false);
        this.fecharDetalhes();
      },
      error: () => {
        this.erro.set('Erro ao cancelar agendamento.');
        this.processandoAcao.set(false);
      },
    });
  }

  excluirAgendamento(agendamento: Agendamento) {
    this.fecharDetalhes();
    this.confirmandoExclusao.set(agendamento);
  }

  confirmarExclusao() {
    const agendamento = this.confirmandoExclusao();
    if (!agendamento) return;

    this.processandoAcao.set(true);
    this.agendamentoService.excluir(agendamento.id).subscribe({
      next: () => {
        this.agendamentos.update(lista => lista.filter(a => a.id !== agendamento.id));
        this.processandoAcao.set(false);
        this.confirmandoExclusao.set(null);
      },
      error: () => {
        this.erro.set('Erro ao excluir agendamento.');
        this.processandoAcao.set(false);
        this.confirmandoExclusao.set(null);
      },
    });
  }

  cancelarExclusao() {
    this.confirmandoExclusao.set(null);
  }

  getDotsDoDia(dia: DiaAgenda): string[] {
    return dia.agendamentos.slice(0, 4).map(a => corDaClinica(a.clinica));
  }

  getStatusVariant(status: string): BadgeVariant {
    switch (status) {
      case 'AG': return 'agendado';
      case 'RE': return 'realizado';
      case 'CA': return 'cancelado';
      default: return 'agendado';
    }
  }

  getNomePaciente(pacienteId: number): string {
    return this.pacientes().find(p => p.id === pacienteId)?.nome || 'Desconhecido';
  }

  getIdadePaciente(pacienteId: number): string {
    const p = this.pacientes().find(p => p.id === pacienteId);
    if (!p || !p.data_nascimento) return '';
    const hoje = new Date();
    const nasc = new Date(p.data_nascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return `${idade} Anos`;
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

  formatarData(d: Date): string {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  formatarDataBR(dataStr: string): string {
    if (!dataStr) return '';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  }
}
