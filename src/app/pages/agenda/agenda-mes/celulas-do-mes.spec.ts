import { Agendamento } from '../../../services/agendamento.service';
import { CelulaDoMes, clinicasDaLegenda, montarCelulasDoMes } from './celulas-do-mes';

function sessao(dados: Partial<Agendamento>): Agendamento {
  return {
    id: 1, profissional: 1, clinica: 1, paciente: 1, data: '2026-10-20', hora_inicio: '08:00:00', hora_fim: '09:00:00',
    status: 'AG', eh_experimental: false, valor_calculado: 100, nome_paciente: 'Mariana Costa', nome_clinica: 'Beta',
    cor_clinica: 1, ...dados,
  };
}

function sessoesNoDia(quantidade: number, data = '2026-10-20') {
  return Array.from({ length: quantidade }, (_, i) =>
    sessao({ id: i + 1, data, hora_inicio: `${String(8 + i).padStart(2, '0')}:00:00` }),
  );
}

const dia = (celulas: (CelulaDoMes | null)[], numero: number) => celulas.find((c) => c?.dia === numero)!;

describe('células do mês', () => {
  it('outubro de 2026 começa na quinta e ocupa 5 semanas', () => {
    const celulas = montarCelulasDoMes('2026-10-01', []);

    expect(celulas.length).toBe(35);
    expect(celulas.slice(0, 4)).toEqual([null, null, null, null]);
    expect(celulas[4]?.data).toBe('2026-10-01');
    expect(celulas[34]?.data).toBe('2026-10-31');
  });

  it('agosto de 2026 começa no sábado e precisa de 6 semanas', () => {
    const celulas = montarCelulasDoMes('2026-08-15', []);

    expect(celulas.length).toBe(42);
    expect(celulas[6]?.data).toBe('2026-08-01');
  });

  it('fevereiro de 2026 começa no domingo e cabe em 4 semanas', () => {
    const celulas = montarCelulasDoMes('2026-02-01', []);

    expect(celulas.length).toBe(28);
    expect(celulas[0]?.data).toBe('2026-02-01');
  });

  it('agrupa as sessões no dia certo, em ordem de horário', () => {
    const celulas = montarCelulasDoMes('2026-10-01', [
      sessao({ id: 1, data: '2026-10-20', hora_inicio: '14:00:00', nome_paciente: 'João Pereira' }),
      sessao({ id: 2, data: '2026-10-20', hora_inicio: '08:00:00', nome_paciente: 'Beatriz Lima' }),
      sessao({ id: 3, data: '2026-10-21' }),
    ]);

    expect(dia(celulas, 20).etiquetas.map((e) => `${e.hora} ${e.nome}`)).toEqual(['08:00 Beatriz', '14:00 João']);
    expect(dia(celulas, 21).etiquetas.length).toBe(1);
  });

  it('até 3 sessões aparecem todas, no celular e no desktop', () => {
    const celula = dia(montarCelulasDoMes('2026-10-01', sessoesNoDia(3)), 20);

    expect(celula.etiquetas.filter((e) => !e.soNoDesktop).length).toBe(3);
    expect([celula.maisNoCelular, celula.maisNoDesktop]).toEqual([0, 0]);
  });

  it('com 4 sessões o desktop mostra todas e o celular mostra 2 e "+2"', () => {
    const celula = dia(montarCelulasDoMes('2026-10-01', sessoesNoDia(4)), 20);

    expect(celula.etiquetas.length).toBe(4);
    expect(celula.etiquetas.filter((e) => !e.soNoDesktop).length).toBe(2);
    expect([celula.maisNoCelular, celula.maisNoDesktop]).toEqual([2, 0]);
  });

  it('com 7 sessões o desktop mostra 3 e "+4 mais"; o celular, 2 e "+5"', () => {
    const celula = dia(montarCelulasDoMes('2026-10-01', sessoesNoDia(7)), 20);

    expect(celula.etiquetas.length).toBe(3);
    expect(celula.etiquetas.filter((e) => !e.soNoDesktop).length).toBe(2);
    expect([celula.maisNoCelular, celula.maisNoDesktop]).toEqual([5, 4]);
  });

  it('marca a cancelada e usa a cor da clínica vinda da API', () => {
    const [etiqueta] = dia(montarCelulasDoMes('2026-10-01', [sessao({ status: 'CA', cor_clinica: 2 })]), 20).etiquetas;

    expect(etiqueta.cancelada).toBe(true);
    expect(etiqueta.cor).toBe('var(--color-clinic-2)');
  });

  it('o rótulo do dia diz a data, se é hoje e quantas sessões tem', () => {
    const celulas = montarCelulasDoMes('2026-10-01', sessoesNoDia(2), '2026-10-20');

    expect(dia(celulas, 20).rotulo).toBe('Terça, 20 de outubro (hoje): 2 sessões');
    expect(dia(celulas, 21).rotulo).toBe('Quarta, 21 de outubro: nenhuma sessão');
  });

  it('às 22h30 do dia 31, hoje ainda é o dia 31', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 31, 22, 30));

    const celulas = montarCelulasDoMes('2026-10-01', []);

    expect(celulas.filter((c) => c?.ehHoje).map((c) => c!.data)).toEqual(['2026-10-31']);
    vi.useRealTimers();
  });

  it('a legenda lista cada clínica do mês uma vez', () => {
    const legenda = clinicasDaLegenda([
      sessao({ id: 1, clinica: 1, nome_clinica: 'Beta', cor_clinica: 1 }),
      sessao({ id: 2, clinica: 2, nome_clinica: 'Alfa', cor_clinica: 2 }),
      sessao({ id: 3, clinica: 1, nome_clinica: 'Beta', cor_clinica: 1 }),
    ]);

    expect(legenda.map((c) => c.nome)).toEqual(['Beta', 'Alfa']);
  });
});
