import { Agendamento } from '../../services/agendamento.service';
import { formatarValor, resumirDia, segmentosDoProgresso, varianteDoStatus } from './dia-da-agenda';

function sessao(dados: Partial<Agendamento>): Agendamento {
  return {
    id: 1, profissional: 1, clinica: 1, paciente: 1, data: '2026-10-20', hora_inicio: '08:00:00', hora_fim: '09:00:00',
    status: 'AG', eh_experimental: false, valor_calculado: 100, ...dados,
  };
}

describe('resumo do dia', () => {
  it('conta as realizadas e soma o valor sem canceladas nem experimentais', () => {
    const resumo = resumirDia([
      sessao({ id: 1, status: 'RE', valor_calculado: 80 }),
      sessao({ id: 2, status: 'AG', valor_calculado: 120 }),
      sessao({ id: 3, status: 'CA', valor_calculado: 100 }),
      sessao({ id: 4, status: 'RE', eh_experimental: true, valor_calculado: 0 }),
    ]);

    expect(resumo).toEqual({ realizados: 2, total: 4, valorTotal: 200 });
  });

  it('dia sem sessões não tem segmentos de progresso', () => {
    expect(segmentosDoProgresso(resumirDia([]))).toEqual([]);
  });

  it('o progresso separa realizadas das restantes', () => {
    const segmentos = segmentosDoProgresso({ realizados: 3, total: 5, valorTotal: 0 });

    expect(segmentos.map((s) => s.value)).toEqual([3, 2]);
  });

  it('traduz o status da API para o badge', () => {
    expect(['AG', 'RE', 'CA'].map(varianteDoStatus)).toEqual(['agendado', 'realizado', 'cancelado']);
  });

  it('formata em reais', () => {
    expect(formatarValor(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
  });
});
