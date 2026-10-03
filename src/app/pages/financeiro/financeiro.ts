import { Component, inject, signal, effect, computed, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FinanceiroService, ResumoClinica, EvolucaoReceita, PeriodoFinanceiro } from '../../services/financeiro.service';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Grafico } from '../../shared/components/grafico/grafico';
import { formatarDataISO, parseDataISO } from '../../shared/utils/datas';
import {
  compararComAnterior,
  configuracaoComposicao,
  configuracaoEvolucao,
  formatarMoeda,
  montarComposicao,
  montarSerieEvolucao,
} from './graficos-financeiro';

@Component({
  selector: 'app-financeiro',
  imports: [EmptyState, Grafico],
  templateUrl: './financeiro.html',
  styleUrls: ['../../../styles/list-page.css', './financeiro.css'],
})
export class Financeiro {
  private financeiroService = inject(FinanceiroService);

  periodo = signal<PeriodoFinanceiro>('mes');
  dataReferencia = signal<string>(formatarDataISO());
  porClinica = signal<ResumoClinica[]>([]);
  totalGeral = signal(0);
  evolucao = signal<EvolucaoReceita | null>(null);
  carregando = signal(true); // primeira carga: ainda não há nada para mostrar
  atualizando = signal(false); // recargas: mantém o conteúdo anterior esmaecido, sem piscar
  erro = signal('');

  readonly formatarMoeda = formatarMoeda;

  totalAtendimentos = computed(() => {
    return this.porClinica().reduce((acc, curr) => acc + curr.total_atendimentos, 0);
  });

  ticketMedio = computed(() => {
    const atendimentos = this.totalAtendimentos();
    if (atendimentos === 0) return 0;
    return this.totalGeral() / atendimentos;
  });

  readonly totais = computed(() => this.evolucao()?.totais ?? null);

  readonly semDados = computed(() => this.porClinica().length === 0 && !Number(this.totais()?.previsto));

  readonly serieEvolucao = computed(() => {
    const dados = this.evolucao();
    return dados ? montarSerieEvolucao(dados, this.periodo(), formatarDataISO()) : null;
  });
  readonly comparacao = computed(() => {
    const serie = this.serieEvolucao();
    return serie ? compararComAnterior(serie) : null;
  });
  readonly configEvolucao = computed(() => {
    const serie = this.serieEvolucao();
    return serie ? configuracaoEvolucao(serie) : null;
  });

  readonly composicao = computed(() => montarComposicao(this.porClinica()));
  readonly configComposicao = computed(() => configuracaoComposicao(this.composicao()));

  readonly descricaoEvolucao = computed(() => {
    const totais = this.totais();
    if (!totais) return '';
    return `Receita acumulada no período: ${formatarMoeda(totais.realizado)} realizados` +
      (Number(totais.previsto) ? `, mais ${formatarMoeda(totais.previsto)} previstos` : '') +
      `. ${this.nomePeriodoAnterior()}: ${formatarMoeda(totais.anterior)}.`;
  });

  readonly descricaoComposicao = computed(() =>
    'Receita por clínica: ' +
    this.composicao().legenda.map((f) => `${f.nome}, ${formatarMoeda(f.valor)} (${f.percentual.toFixed(0)}%)`).join('; ')
  );

  periodoLabel = computed(() => {
    const data = parseDataISO(this.dataReferencia());
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    if (this.periodo() === 'mes') {
      return `${mesesCompletos[data.getMonth()]} ${data.getFullYear()}`;
    } else {
      const d = parseDataISO(this.dataReferencia());
      d.setDate(d.getDate() - d.getDay()); // Domingo a sábado

      const inicio = new Date(d);
      d.setDate(d.getDate() + 6);
      const fim = new Date(d);

      return `${inicio.getDate()} ${meses[inicio.getMonth()]} - ${fim.getDate()} ${meses[fim.getMonth()]}`;
    }
  });

  constructor() {
    effect(() => {
      const periodo = this.periodo();
      const data = this.dataReferencia();
      // untracked: o carregamento lê e grava outros signals (evolucao, carregando...); sem isso,
      // cada resposta re-dispararia o effect, num loop infinito de requisições
      untracked(() => this.carregarPeriodo(periodo, data));
    });
  }

  /** Resumo (por clínica) e evolução diária em paralelo: duas requisições, uma consulta agregada cada no backend. */
  carregarPeriodo(periodo: PeriodoFinanceiro, data: string) {
    if (this.evolucao()) {
      this.atualizando.set(true);
    } else {
      this.carregando.set(true);
    }
    this.erro.set('');

    forkJoin({
      resumo: this.financeiroService.buscarResumo(periodo, data),
      evolucao: this.financeiroService.buscarEvolucao(periodo, data),
    }).subscribe({
      next: ({ resumo, evolucao }) => {
        this.porClinica.set(resumo.por_clinica);
        this.totalGeral.set(Number(resumo.total_geral));
        this.evolucao.set(evolucao);
        this.carregando.set(false);
        this.atualizando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar resumo financeiro. Tente novamente.');
        this.carregando.set(false);
        this.atualizando.set(false);
      },
    });
  }

  nomePeriodoAnterior(): string {
    return this.periodo() === 'mes' ? 'Mês anterior' : 'Semana anterior';
  }

  trocarPeriodo(periodo: PeriodoFinanceiro) {
    this.periodo.set(periodo);
    this.dataReferencia.set(formatarDataISO());
  }

  periodoAnterior() {
    const d = parseDataISO(this.dataReferencia());
    if (this.periodo() === 'mes') {
      d.setMonth(d.getMonth() - 1, 1); // dia 1: evita pular mês a partir do dia 29–31
    } else {
      d.setDate(d.getDate() - 7);
    }
    this.dataReferencia.set(formatarDataISO(d));
  }

  proximoPeriodo() {
    const d = parseDataISO(this.dataReferencia());
    if (this.periodo() === 'mes') {
      d.setMonth(d.getMonth() + 1, 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    this.dataReferencia.set(formatarDataISO(d));
  }

  getPeriodoLabel(): string {
    return this.periodo() === 'mes' ? 'este mês' : 'esta semana';
  }
}
