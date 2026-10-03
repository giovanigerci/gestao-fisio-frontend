import { EvolucaoReceita, ResumoClinica } from '../../services/financeiro.service';
import { CORES_CLINICA_HEX } from '../../shared/utils/clinic-colors';
import { CORES_GRAFICO } from '../../shared/utils/cores-grafico';
import {
  compararComAnterior,
  configuracaoEvolucao,
  montarComposicao,
  montarSerieEvolucao,
} from './graficos-financeiro';

/** Mês de 5 dias (01 a 05/03) para os testes ficarem legíveis. */
function evolucao(parcial: Partial<EvolucaoReceita['totais']> = {}, acumulado = [10, 30, 30, 60, 60]): EvolucaoReceita {
  const datas = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'];
  return {
    periodo: { inicio: datas[0], fim: datas[4] },
    dias: datas.map((data, i) => ({
      data, realizado: 0, acumulado: acumulado[i], previsto: 0, acumulado_com_previsto: acumulado[i] + 100,
    })),
    anterior: {
      inicio: '2026-02-01', fim: '2026-02-03',
      dias: [{ data: '2026-02-01', realizado: 20, acumulado: 20 }, { data: '2026-02-02', realizado: 0, acumulado: 20 },
        { data: '2026-02-03', realizado: 30, acumulado: 50 }],
    },
    totais: { realizado: 60, previsto: 100, anterior: 50, ...parcial },
  };
}

describe('montarSerieEvolucao', () => {
  it('realizado vai só até hoje (sem platô falso no futuro)', () => {
    const serie = montarSerieEvolucao(evolucao(), 'mes', '2026-03-03');

    expect(serie.realizado).toEqual([10, 30, 30, null, null]);
  });

  it('previsto começa hoje e segue até o fim do período', () => {
    const serie = montarSerieEvolucao(evolucao(), 'mes', '2026-03-03');

    expect(serie.previsto).toEqual([null, null, 130, 160, 160]);
    expect(serie.temPrevisto).toBe(true);
  });

  it('sem nada agendado, não há linha de previsto', () => {
    const serie = montarSerieEvolucao(evolucao({ previsto: 0 }), 'mes', '2026-03-03');

    expect(serie.temPrevisto).toBe(false);
    expect(serie.previsto.every((v) => v === null)).toBe(true);
  });

  it('período que já passou mostra o realizado inteiro', () => {
    const serie = montarSerieEvolucao(evolucao({ previsto: 0 }), 'mes', '2026-04-10');

    expect(serie.realizado).toEqual([10, 30, 30, 60, 60]);
  });

  it('período anterior é alinhado pela posição do dia e completado com vazio', () => {
    const serie = montarSerieEvolucao(evolucao(), 'mes', '2026-03-03');

    expect(serie.anterior).toEqual([20, 20, 50, null, null]);
    expect(serie.nomeAnterior).toBe('Mês anterior');
  });

  it('rótulos: número do dia no mês, dia da semana + número na semana', () => {
    expect(montarSerieEvolucao(evolucao(), 'mes', '2026-03-03').rotulos).toEqual(['1', '2', '3', '4', '5']);
    expect(montarSerieEvolucao(evolucao(), 'semana', '2026-03-03').rotulos[0]).toBe('Dom 1');
  });

  it('título do tooltip acompanha o período', () => {
    expect(montarSerieEvolucao(evolucao(), 'mes', '2026-03-03').titulos[0]).toBe('Dia 1');
    expect(montarSerieEvolucao(evolucao(), 'semana', '2026-03-03').titulos[0]).toBe('Dom, 01/03');
  });
});

describe('compararComAnterior', () => {
  it('período em andamento compara no mesmo dia do período anterior', () => {
    // dia 3: 30 agora contra 50 no dia 3 do mês anterior
    const resultado = compararComAnterior(montarSerieEvolucao(evolucao(), 'mes', '2026-03-03'));

    expect(resultado.mesmoPonto).toBe(true);
    expect(resultado.variacao).toBeCloseTo(-40);
  });

  it('período encerrado compara os totais dos dois períodos', () => {
    // 60 contra 50 do mês anterior inteiro
    const resultado = compararComAnterior(montarSerieEvolucao(evolucao({ previsto: 0 }), 'mes', '2026-04-10'));

    expect(resultado.mesmoPonto).toBe(false);
    expect(resultado.variacao).toBeCloseTo(20);
  });

  it('sem receita no período anterior, não inventa variação', () => {
    const dados = evolucao();
    dados.anterior.dias = dados.anterior.dias.map((d) => ({ ...d, acumulado: 0 }));

    expect(compararComAnterior(montarSerieEvolucao(dados, 'mes', '2026-03-03')).variacao).toBeNull();
  });
});

describe('configuracaoEvolucao', () => {
  it('previsto é tracejado (projeção) e o período anterior usa o cinza de contexto', () => {
    const datasets = configuracaoEvolucao(montarSerieEvolucao(evolucao(), 'mes', '2026-03-03')).data.datasets;
    const porNome = Object.fromEntries(datasets.map((d) => [d.label, d]));

    expect(porNome['Previsto'].borderDash).toEqual([6, 4]);
    expect(porNome['Realizado'].borderDash).toBeUndefined();
    expect(porNome['Mês anterior'].borderColor).toBe(CORES_GRAFICO.contexto);
  });

  it('sem previsto, o gráfico não tem a série de previsto', () => {
    const datasets = configuracaoEvolucao(montarSerieEvolucao(evolucao({ previsto: 0 }), 'mes', '2026-03-03')).data.datasets;

    expect(datasets.map((d) => d.label)).toEqual(['Mês anterior', 'Realizado']);
  });
});

describe('montarComposicao', () => {
  const clinica = (id: number, receita: number): ResumoClinica => ({
    clinica: id, clinica__nome: `Clínica ${id}`, total_atendimentos: 1, receita_total: receita,
  });

  it('rosca na ordem fixa da paleta; legenda da maior para a menor receita', () => {
    const composicao = montarComposicao([clinica(3, 100), clinica(1, 300), clinica(2, 600)]);

    expect(composicao.fatias.map((f) => f.id)).toEqual([1, 2, 3]);
    expect(composicao.legenda.map((f) => f.id)).toEqual([2, 1, 3]);
    expect(composicao.total).toBe(1000);
    expect(composicao.legenda[0].percentual).toBeCloseTo(60);
  });

  it('cada clínica mantém a cor dela em qualquer tela', () => {
    const [fatia] = montarComposicao([clinica(7, 100)]).fatias;

    expect(fatia.cor).toBe(CORES_CLINICA_HEX[7 % CORES_CLINICA_HEX.length]);
  });

  it('acima de 6 clínicas, as menores viram "Outras" (no máximo 6 fatias)', () => {
    const clinicas = [1, 2, 3, 4, 5, 6, 7].map((id) => clinica(id, id * 100));

    const composicao = montarComposicao(clinicas);
    const outras = composicao.fatias.find((f) => f.id === null)!;

    expect(composicao.fatias.length).toBe(6);
    expect(outras.nome).toBe('Outras (2)');
    expect(outras.valor).toBe(300); // clínicas 1 e 2
    expect(outras.cor).toBe(CORES_GRAFICO.contexto);
  });

  it('com exatamente 6 clínicas, todas aparecem', () => {
    expect(montarComposicao([1, 2, 3, 4, 5, 6].map((id) => clinica(id, 100))).fatias.length).toBe(6);
  });
});
