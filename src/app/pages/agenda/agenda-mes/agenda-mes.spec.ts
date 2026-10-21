import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agendamento } from '../../../services/agendamento.service';
import { AgendaMes, DiaEscolhido } from './agenda-mes';

function sessao(dados: Partial<Agendamento>): Agendamento {
  return {
    id: 1, profissional: 1, clinica: 1, paciente: 1, data: '2026-10-20', hora_inicio: '08:00:00', hora_fim: '09:00:00',
    status: 'AG', eh_experimental: false, valor_calculado: 80, nome_paciente: 'Mariana Costa', nome_clinica: 'Movi',
    cor_clinica: 1, ...dados,
  };
}

describe('AgendaMes', () => {
  let fixture: ComponentFixture<AgendaMes>;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const diaDoMes = (numero: number) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('.mes-dia')].find(
      (b) => b.querySelector('.mes-numero')?.textContent?.trim() === String(numero),
    )!;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 20, 10, 0));
    fixture = TestBed.createComponent(AgendaMes);
    fixture.componentRef.setInput('mes', '2026-10-01');
    fixture.componentRef.setInput('agendamentos', [
      sessao({ id: 1, hora_inicio: '14:00:00', nome_paciente: 'João Pereira' }),
      sessao({ id: 2, hora_inicio: '08:00:00' }),
      sessao({ id: 3, clinica: 2, nome_clinica: 'Donare', cor_clinica: 2, data: '2026-10-21' }),
    ]);
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('desenha um botão por dia do mês e deixa vazios os dias de outros meses', () => {
    expect(elemento().querySelectorAll('.mes-dia').length).toBe(31);
    expect(elemento().querySelectorAll('.mes-fora').length).toBe(4);
  });

  it('escreve as sessões do dia com horário e primeiro nome', () => {
    const textos = [...diaDoMes(20).querySelectorAll('.mes-etiqueta')].map(
      (e) => `${e.querySelector('.mes-etiqueta-hora')?.textContent} ${e.querySelector('.mes-etiqueta-nome')?.textContent}`,
    );

    expect(textos).toEqual(['08:00 Mariana', '14:00 João']);
  });

  it('o leitor de tela ouve a data e a quantidade de sessões', () => {
    expect(diaDoMes(21).getAttribute('aria-label')).toBe('Quarta, 21 de outubro: 1 sessão');
  });

  it('clicar num dia avisa qual dia foi escolhido', () => {
    let escolhido: DiaEscolhido | undefined;
    fixture.componentInstance.diaEscolhido.subscribe((dia) => (escolhido = dia));

    diaDoMes(21).click();

    expect(escolhido?.data).toBe('2026-10-21');
  });

  it('destaca o dia aberto', () => {
    fixture.componentRef.setInput('diaAberto', '2026-10-21');
    fixture.detectChanges();

    expect(diaDoMes(21).classList).toContain('mes-dia--aberto');
    expect(diaDoMes(20).classList).not.toContain('mes-dia--aberto');
  });

  it('a legenda mostra as clínicas do mês', () => {
    const nomes = [...elemento().querySelectorAll('.mes-legenda-item')].map((i) => i.textContent?.trim());

    expect(nomes).toEqual(['Movi', 'Donare']);
  });
});
