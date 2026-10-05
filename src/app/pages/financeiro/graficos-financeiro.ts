/**
 * Transformam as respostas da API em dados e configurações de gráfico (Chart.js).
 * Funções puras: nenhum valor financeiro é calculado aqui — só arrumação para exibição.
 */
import type { ChartConfiguration, Plugin, TooltipItem } from 'chart.js';
import { EvolucaoReceita, HistoricoReceita, PeriodoFinanceiro, ResumoClinica } from '../../services/financeiro.service';
import { corDaClinicaHex } from '../../shared/utils/clinic-colors';
import { CORES_GRAFICO } from '../../shared/utils/cores-grafico';
import { parseDataISO } from '../../shared/utils/datas';

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const FONTE = { family: "'Inter', system-ui, sans-serif", size: 11 };
const MAX_FATIAS_CLINICAS = 5; // + "Outras" = no máximo 6 fatias na rosca

export function formatarMoeda(valor: number): string {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Rótulo curto do eixo de valores: R$ 0 · R$ 500 · R$ 1,5 mil */
function formatarMoedaCompacta(valor: number): string {
  if (Math.abs(valor) >= 1000) {
    return `R$ ${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

// ─── Evolução da receita ────────────────────────────────────────────────

export interface SerieEvolucao {
  rotulos: string[];
  /** Título do tooltip: "Dia 18" no mês, "Dom, 15/03" na semana. */
  titulos: string[];
  datas: string[];
  realizado: (number | null)[];
  previsto: (number | null)[];
  anterior: (number | null)[];
  nomeAnterior: string;
  temPrevisto: boolean;
}

/**
 * - realizado: acumulado até hoje (depois de hoje fica vazio, sem "platô" falso);
 * - previsto: acumulado com os agendamentos ainda não realizados, de hoje em diante
 *   (ou o período todo, se ele já passou e ainda há agendamentos não confirmados);
 * - anterior: acumulado do período anterior, alinhado pela posição do dia (dia 1 com dia 1).
 */
export function montarSerieEvolucao(dados: EvolucaoReceita, periodo: PeriodoFinanceiro, hoje: string): SerieEvolucao {
  const { dias, periodo: intervalo, anterior, totais } = dados;
  const temPrevisto = Number(totais.previsto) > 0;
  const periodoJaPassou = intervalo.fim < hoje;
  const inicioPrevisto = periodoJaPassou ? intervalo.inicio : (hoje > intervalo.inicio ? hoje : intervalo.inicio);

  const datas = dias.map((d) => parseDataISO(d.data));
  const doisDigitos = (n: number) => String(n).padStart(2, '0');

  return {
    datas: dias.map((d) => d.data),
    rotulos: datas.map((data) =>
      periodo === 'semana' ? `${DIAS_ABREV[data.getDay()]} ${data.getDate()}` : String(data.getDate())
    ),
    titulos: datas.map((data) =>
      periodo === 'semana'
        ? `${DIAS_ABREV[data.getDay()]}, ${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}`
        : `Dia ${data.getDate()}`
    ),
    realizado: dias.map((d) => (d.data <= hoje ? Number(d.acumulado) : null)),
    previsto: dias.map((d) => (temPrevisto && d.data >= inicioPrevisto ? Number(d.acumulado_com_previsto) : null)),
    anterior: dias.map((_, i) => (i < anterior.dias.length ? Number(anterior.dias[i].acumulado) : null)),
    nomeAnterior: periodo === 'semana' ? 'Semana anterior' : 'Mês anterior',
    temPrevisto,
  };
}

export interface ComparacaoAnterior {
  variacao: number | null; // em %; null quando o período anterior não tem receita para comparar
  /** true: comparou até o mesmo dia (período em andamento); false: períodos inteiros. */
  mesmoPonto: boolean;
}

/**
 * Compara o realizado com o período anterior no MESMO PONTO: no dia 10, o acumulado até o dia 10
 * contra o acumulado até o dia 10 do mês anterior (comparar com o mês anterior inteiro faria todo
 * mês em andamento parecer queda).
 */
export function compararComAnterior(serie: SerieEvolucao): ComparacaoAnterior {
  const ultimoDia = serie.realizado.reduce<number>((ultimo, valor, i) => (valor !== null ? i : ultimo), -1);
  const anteriores = serie.anterior.filter((v): v is number => v !== null);
  if (ultimoDia < 0 || !anteriores.length) return { variacao: null, mesmoPonto: false };

  const mesmoPonto = ultimoDia < serie.realizado.length - 1;
  const atual = serie.realizado[ultimoDia] as number;
  const base = mesmoPonto ? (serie.anterior[ultimoDia] ?? anteriores[anteriores.length - 1]) : anteriores[anteriores.length - 1];
  if (!base) return { variacao: null, mesmoPonto };

  return { variacao: ((atual - base) / base) * 100, mesmoPonto };
}

/** Linha vertical que acompanha o ponteiro no dia mais próximo (o leitor mira na data, não na linha de 2px). */
const linhaVertical: Plugin<'line'> = {
  id: 'linhaVertical',
  afterDatasetsDraw(chart) {
    const ativo = chart.tooltip?.getActiveElements()?.[0];
    if (!ativo) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.strokeStyle = CORES_GRAFICO.textoMudo;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ativo.element.x, chartArea.top);
    ctx.lineTo(ativo.element.x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

function tooltipBase() {
  return {
    backgroundColor: '#1a2438', // --color-surface-hover
    borderColor: CORES_GRAFICO.grade,
    borderWidth: 1,
    padding: 10,
    titleColor: CORES_GRAFICO.textoSecundario,
    bodyColor: CORES_GRAFICO.textoPrimario,
    titleFont: { ...FONTE, weight: 500 as const },
    bodyFont: { ...FONTE, size: 12, weight: 600 as const },
    usePointStyle: true, // chave em forma de linha, não caixa
    boxWidth: 12,
    boxHeight: 2,
  };
}

export function configuracaoEvolucao(serie: SerieEvolucao): ChartConfiguration<'line'> {
  const linha = { borderWidth: 2, borderCapStyle: 'round' as const, borderJoinStyle: 'round' as const, tension: 0 };
  const semPonto = { pointRadius: 0, pointHoverRadius: 4, pointHitRadius: 12, pointHoverBorderWidth: 2, pointHoverBorderColor: CORES_GRAFICO.superficie };

  const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
    {
      label: serie.nomeAnterior,
      data: serie.anterior,
      borderColor: CORES_GRAFICO.contexto,
      pointHoverBackgroundColor: CORES_GRAFICO.contexto,
      pointStyle: 'line',
      ...linha,
      ...semPonto,
    },
  ];
  if (serie.temPrevisto) {
    datasets.push({
      label: 'Previsto',
      data: serie.previsto,
      borderColor: CORES_GRAFICO.destaque,
      borderDash: [6, 4], // tracejado = projeção
      pointHoverBackgroundColor: CORES_GRAFICO.destaque,
      pointStyle: 'line',
      ...linha,
      ...semPonto,
    });
  }
  datasets.push({
    label: 'Realizado',
    data: serie.realizado,
    borderColor: CORES_GRAFICO.destaque,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // área: lavagem de ~10%, nunca um bloco saturado
    fill: 'origin',
    pointHoverBackgroundColor: CORES_GRAFICO.destaque,
    pointStyle: 'line',
    ...linha,
    ...semPonto,
  });

  return {
    type: 'line',
    data: { labels: serie.rotulos, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false }, // um tooltip com todas as séries do dia
      plugins: {
        legend: { display: false }, // legenda em HTML, fora do canvas
        tooltip: {
          ...tooltipBase(),
          itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
          callbacks: {
            title: (itens: TooltipItem<'line'>[]) => (itens.length ? serie.titulos[itens[0].dataIndex] : ''),
            label: (item: TooltipItem<'line'>) =>
              item.parsed.y == null ? '' : `${formatarMoeda(item.parsed.y)}  ${item.dataset.label}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: CORES_GRAFICO.grade },
          ticks: { color: CORES_GRAFICO.textoMudo, font: FONTE, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        },
        y: {
          beginAtZero: true,
          grid: { color: CORES_GRAFICO.grade, lineWidth: 1 },
          border: { display: false },
          ticks: { color: CORES_GRAFICO.textoMudo, font: FONTE, maxTicksLimit: 5, callback: (v) => formatarMoedaCompacta(Number(v)) },
        },
      },
    },
    plugins: [linhaVertical],
  };
}

// ─── Composição por clínica ─────────────────────────────────────────────

export interface FatiaComposicao {
  id: number | null; // null = "Outras"
  /** Posição na paleta (1–5); null em "Outras". */
  posicaoCor: number | null;
  nome: string;
  valor: number;
  atendimentos: number;
  percentual: number;
  cor: string;
}

export interface Composicao {
  total: number;
  /** Ordem da rosca: ordem fixa da paleta, para só se tocarem cores validadas como vizinhas. */
  fatias: FatiaComposicao[];
  /** Ordem da legenda: maior receita primeiro. */
  legenda: FatiaComposicao[];
}

export function montarComposicao(porClinica: ResumoClinica[]): Composicao {
  const total = porClinica.reduce((soma, c) => soma + Number(c.receita_total), 0);
  const pct = (valor: number) => (total > 0 ? (valor / total) * 100 : 0);
  const porReceita = [...porClinica].sort((a, b) => Number(b.receita_total) - Number(a.receita_total));

  const principais = porReceita.length > MAX_FATIAS_CLINICAS + 1 ? porReceita.slice(0, MAX_FATIAS_CLINICAS) : porReceita;
  const resto = porReceita.slice(principais.length);

  const fatias: FatiaComposicao[] = principais
    .map((c) => ({
      id: c.clinica,
      posicaoCor: c.clinica__cor,
      nome: c.clinica__nome,
      valor: Number(c.receita_total),
      atendimentos: c.total_atendimentos,
      percentual: pct(Number(c.receita_total)),
      cor: corDaClinicaHex(c.clinica__cor),
    }))
    .sort((a, b) => a.posicaoCor - b.posicaoCor || a.id - b.id);

  if (resto.length) {
    const valor = resto.reduce((soma, c) => soma + Number(c.receita_total), 0);
    fatias.push({
      id: null,
      posicaoCor: null,
      nome: `Outras (${resto.length})`,
      valor,
      atendimentos: resto.reduce((soma, c) => soma + c.total_atendimentos, 0),
      percentual: pct(valor),
      cor: CORES_GRAFICO.contexto,
    });
  }

  return { total, fatias, legenda: [...fatias].sort((a, b) => b.valor - a.valor) };
}

export function configuracaoComposicao(composicao: Composicao): ChartConfiguration<'doughnut'> {
  // Uma fatia só é o anel inteiro: o deslocamento do hover moveria o anel todo (corte embaixo, risco em cima)
  // e o tooltip ficaria preso no meio do arco, na base da rosca; então ele acompanha o ponteiro, acima dele.
  const umaFatia = composicao.fatias.length === 1;
  return {
    type: 'doughnut',
    data: {
      labels: composicao.fatias.map((f) => f.nome),
      datasets: [
        {
          data: composicao.fatias.map((f) => f.valor),
          backgroundColor: composicao.fatias.map((f) => f.cor),
          borderColor: CORES_GRAFICO.superficie, // espaço de 2px na cor da superfície entre as fatias
          borderWidth: umaFatia ? 0 : 2,
          hoverOffset: umaFatia ? 0 : 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipBase(),
          usePointStyle: false,
          boxWidth: 8,
          boxHeight: 8,
          ...(umaFatia && { position: 'cursor' as const, yAlign: 'bottom' as const }),
          callbacks: {
            label: (item: TooltipItem<'doughnut'>) => {
              const fatia = composicao.fatias[item.dataIndex];
              return `${formatarMoeda(fatia.valor)} · ${fatia.percentual.toFixed(0)}%`;
            },
          },
        },
      },
    },
  };
}

// ─── Histórico mensal/anual ─────────────────────────────────────────────

/** 'YYYY-MM' → 'Mar/26'; 'YYYY' → '2026'. */
export function rotuloPeriodoHistorico(periodo: string): string {
  const [ano, mes] = periodo.split('-');
  return mes ? `${MESES_ABREV[Number(mes) - 1]}/${ano.slice(2)}` : ano;
}

/** 'YYYY-MM' → 'Março de 2026'; 'YYYY' → '2026'. */
export function nomePeriodoHistorico(periodo: string): string {
  const [ano, mes] = periodo.split('-');
  return mes ? `${MESES[Number(mes) - 1]} de ${ano}` : ano;
}

export interface SerieHistorico {
  porAno: boolean;
  rotulos: string[];
  titulos: string[];
  receita: number[];
  anterior: number[];
  atendimentos: number[];
  /** Posição do mês/ano em andamento (comparação com o anterior ainda parcial); -1 se nenhum. */
  emAndamento: number;
}

export function montarSerieHistorico(dados: HistoricoReceita, hoje: string): SerieHistorico {
  const porAno = dados.agrupar === 'ano';
  const atual = porAno ? hoje.slice(0, 4) : hoje.slice(0, 7);
  return {
    porAno,
    rotulos: dados.periodos.map((p) => rotuloPeriodoHistorico(p.periodo)),
    titulos: dados.periodos.map((p) => nomePeriodoHistorico(p.periodo) + (p.periodo === atual ? ' (em andamento)' : '')),
    receita: dados.periodos.map((p) => Number(p.receita)),
    anterior: dados.periodos.map((p) => Number(p.receita_periodo_anterior)),
    atendimentos: dados.periodos.map((p) => p.atendimentos),
    emAndamento: dados.periodos.findIndex((p) => p.periodo === atual),
  };
}

/**
 * Colunas: por mês, cada mês (azul) ao lado do mesmo mês do ano anterior (cinza);
 * por ano, uma série só (cada coluna já é o "ano anterior" da seguinte).
 */
export function configuracaoHistorico(serie: SerieHistorico): ChartConfiguration<'bar'> {
  const coluna = {
    maxBarThickness: 24,
    borderRadius: 4,
    borderSkipped: 'start' as const, // arredonda só a ponta do dado, a base fica reta no eixo
    barPercentage: 0.9,
    categoryPercentage: 0.7,
  };

  const datasets: ChartConfiguration<'bar'>['data']['datasets'] = [];
  if (!serie.porAno) {
    datasets.push({
      label: 'Ano anterior',
      data: serie.anterior,
      backgroundColor: CORES_GRAFICO.contexto,
      hoverBackgroundColor: CORES_GRAFICO.textoSecundario,
      ...coluna,
    });
  }
  // período em andamento mais claro: a coluna ainda vai crescer, não é uma queda
  const corDaReceita = (cor: string, parcial: string) => serie.receita.map((_, i) => (i === serie.emAndamento ? parcial : cor));
  datasets.push({
    label: 'Receita',
    data: serie.receita,
    backgroundColor: corDaReceita(CORES_GRAFICO.destaque, 'rgba(59, 130, 246, 0.45)'),
    hoverBackgroundColor: corDaReceita('#60a5fa', 'rgba(96, 165, 250, 0.6)'),
    ...coluna,
  });

  return {
    type: 'bar',
    data: { labels: serie.rotulos, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipBase(),
          usePointStyle: false,
          boxWidth: 8,
          boxHeight: 8,
          itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
          callbacks: {
            title: (itens: TooltipItem<'bar'>[]) => (itens.length ? serie.titulos[itens[0].dataIndex] : ''),
            label: (item: TooltipItem<'bar'>) => `${formatarMoeda(item.parsed.y ?? 0)}  ${item.dataset.label}`,
            footer: (itens: TooltipItem<'bar'>[]) => {
              if (!itens.length) return '';
              const n = serie.atendimentos[itens[0].dataIndex];
              return `${n} atendimento${n === 1 ? '' : 's'}`;
            },
          },
          footerColor: CORES_GRAFICO.textoSecundario,
          footerFont: { ...FONTE, weight: 400 as const },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: CORES_GRAFICO.grade },
          ticks: { color: CORES_GRAFICO.textoMudo, font: FONTE, maxRotation: 0, autoSkip: true },
        },
        y: {
          beginAtZero: true,
          grid: { color: CORES_GRAFICO.grade, lineWidth: 1 },
          border: { display: false },
          ticks: { color: CORES_GRAFICO.textoMudo, font: FONTE, maxTicksLimit: 5, callback: (v) => formatarMoedaCompacta(Number(v)) },
        },
      },
    },
  };
}
