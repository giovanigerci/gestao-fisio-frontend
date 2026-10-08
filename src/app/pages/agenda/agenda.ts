import { Component, inject, signal, computed, effect, DestroyRef, untracked } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AgendamentoService, Agendamento } from '../../services/agendamento.service';
import { Badge, BadgeVariant } from '../../shared/components/badge/badge';
import { Card } from '../../shared/components/card/card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ProgressBar } from '../../shared/components/progress-bar/progress-bar';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { corDaClinica } from '../../shared/utils/clinic-colors';
import { formatarDataISO } from '../../shared/utils/datas';

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
  imports: [Badge, Card, EmptyState, ProgressBar, ConfirmModal],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
})
export class Agenda {
  private agendamentoService = inject(AgendamentoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  agendamentos = signal<Agendamento[]>([]);
  carregando = signal(true);
  erro = signal('');
  dataReferencia = signal(new Date());
  dataSelecionada = signal(formatarDataISO(new Date()));
  agendamentoSelecionado = signal<Agendamento | null>(null);
  processandoAcao = signal(false);
  confirmandoExclusao = signal<Agendamento | null>(null);
  mostrandoModalConfirmacao = signal(false);
  processandoConfirmacaoDia = signal(false);
  relogio = signal(new Date());

  corDaClinica = corDaClinica;

  private readonly DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  private readonly DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  private readonly MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  private readonly MESES_EXTENSO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  inicioSemana = computed(() => {
    const d = new Date(this.dataReferencia());
    d.setDate(d.getDate() - d.getDay()); // Domingo = início (getDay(): 0 = domingo)
    d.setHours(0, 0, 0, 0);
    return d;
  });

  private readonly inicioSemanaISO = computed(() => formatarDataISO(this.inicioSemana()));

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
      const dataStr = formatarDataISO(d);

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
    const clinicasMap = new Map<number, { nome: string; cor: string }>();
    dia.agendamentos.forEach(a => {
      if (!clinicasMap.has(a.clinica)) {
        clinicasMap.set(a.clinica, { nome: a.nome_clinica || '—', cor: corDaClinica(a.cor_clinica) });
      }
    });
    return Array.from(clinicasMap.entries()).map(([id, { nome, cor }]) => ({ id, nome, cor }));
  });

  expedienteEncerrado = computed(() => {
    const dia = this.diaSelecionado();
    if (!dia || dia.agendamentos.length === 0) return false;

    const agora = this.relogio();
    const hojeStr = formatarDataISO(agora);

    if (dia.data < hojeStr) {
      return true;
    }
    if (dia.data > hojeStr) {
      return false;
    }

    // Dia de hoje: verificar se o horário do último agendamento já passou
    let maxHora = '00:00';
    for (const ag of dia.agendamentos) {
      const horaComp = (ag.hora_fim || ag.hora_inicio).substring(0, 5);
      if (horaComp > maxHora) {
        maxHora = horaComp;
      }
    }

    const horaAtualStr = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    return horaAtualStr >= maxHora;
  });

  dadosConfirmacaoDia = computed(() => {
    const dia = this.diaSelecionado();
    if (!dia) {
      return {
        estado: 'nenhum' as const,
        pendentes: [],
        cancelados: [],
        realizados: [],
        valorPendente: 0,
        valorRealizado: 0,
        totalSessoes: 0,
      };
    }

    const ags = dia.agendamentos;
    const pendentes = ags.filter(a => a.status === 'AG');
    const cancelados = ags.filter(a => a.status === 'CA');
    const realizados = ags.filter(a => a.status === 'RE');

    const valorPendente = pendentes
      .filter(a => !a.eh_experimental)
      .reduce((sum, a) => sum + (Number(a.valor_calculado) || 0), 0);

    const valorRealizado = realizados
      .filter(a => !a.eh_experimental)
      .reduce((sum, a) => sum + (Number(a.valor_calculado) || 0), 0);

    const encerrado = this.expedienteEncerrado();

    let estado: 'durante' | 'aguardando_confirmacao' | 'confirmado' | 'nenhum' = 'nenhum';

    if (ags.length > 0) {
      if (encerrado && pendentes.length > 0) {
        estado = 'aguardando_confirmacao'; // Estado 2
      } else if (encerrado && pendentes.length === 0 && realizados.length > 0) {
        estado = 'confirmado'; // Estado 4
      } else {
        estado = 'durante'; // Estado 1
      }
    }

    return {
      estado,
      pendentes,
      cancelados,
      realizados,
      valorPendente,
      valorRealizado,
      totalSessoes: ags.length,
    };
  });

  constructor() {
    const intervalId = setInterval(() => {
      this.relogio.set(new Date());
    }, 30000);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));

    const dataParam = this.route.snapshot.queryParamMap.get('data');
    if (dataParam) {
      const partes = dataParam.split('-');
      if (partes.length === 3) {
        const ano = +partes[0];
        const mes = +partes[1] - 1;
        const dia = +partes[2];
        const dataRef = new Date(ano, mes, dia);
        this.dataReferencia.set(dataRef);
        this.dataSelecionada.set(dataParam);
      }
    }

    // Sempre que a semana mudar, buscar agendamentos do intervalo correto. Depende do início como
    // texto: um Date novo da mesma semana (ex: "Hoje" já estando nela) não dispara outra busca
    effect(() => {
      const dataInicio = this.inicioSemanaISO();
      untracked(() => this.carregarAgendamentos(dataInicio, formatarDataISO(this.fimSemana())));
    });
  }

  carregarAgendamentos(dataInicio?: string, dataFim?: string) {
    if (!dataInicio || !dataFim) {
      const inicio = this.inicioSemana();
      const fim = this.fimSemana();
      dataInicio = formatarDataISO(inicio);
      dataFim = formatarDataISO(fim);
    }

    this.carregando.set(true);
    this.erro.set('');

    this.agendamentoService.listar(dataInicio, dataFim).subscribe({
      next: (resp) => {
        const dados = Array.isArray(resp) ? resp : resp.results;
        this.agendamentos.set(dados);
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
    this.dataSelecionada.set(formatarDataISO(new Date()));
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
    return dia.agendamentos.slice(0, 4).map(a => corDaClinica(a.cor_clinica));
  }

  getStatusVariant(status: string): BadgeVariant {
    switch (status) {
      case 'AG': return 'agendado';
      case 'RE': return 'realizado';
      case 'CA': return 'cancelado';
      default: return 'agendado';
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

  formatarDataBR(dataStr: string): string {
    if (!dataStr) return '';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  }

  abrirModalConfirmacaoDia() {
    this.mostrandoModalConfirmacao.set(true);
  }

  fecharModalConfirmacaoDia() {
    this.mostrandoModalConfirmacao.set(false);
  }

  confirmarDia() {
    const dia = this.diaSelecionado();
    if (!dia) return;

    this.processandoConfirmacaoDia.set(true);
    this.erro.set('');

    this.agendamentoService.confirmarDia(dia.data).subscribe({
      next: (resp) => {
        if (resp.agendamentos && resp.agendamentos.length > 0) {
          const atualizadosMap = new Map(resp.agendamentos.map(a => [a.id, a]));
          this.agendamentos.update(lista =>
            lista.map(a => atualizadosMap.get(a.id) || a)
          );
        } else {
          this.agendamentos.update(lista =>
            lista.map(a => (a.data === dia.data && a.status === 'AG') ? { ...a, status: 'RE' as const } : a)
          );
        }
        this.processandoConfirmacaoDia.set(false);
        this.fecharModalConfirmacaoDia();
      },
      error: (err) => {
        const mensagem = err.error?.erro || 'Erro ao confirmar atendimentos do dia.';
        this.erro.set(mensagem);
        this.processandoConfirmacaoDia.set(false);
      }
    });
  }
}
