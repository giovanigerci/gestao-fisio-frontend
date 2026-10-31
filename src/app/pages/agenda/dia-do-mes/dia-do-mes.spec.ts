import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agendamento } from '../../../services/agendamento.service';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';
import { DiaDoMes } from './dia-do-mes';

function sessao(dados: Partial<Agendamento>): Agendamento {
  return {
    id: 1, profissional: 1, clinica: 1, paciente: 1, data: '2026-10-20', hora_inicio: '08:00:00', hora_fim: '09:00:00',
    status: 'AG', eh_experimental: false, valor_calculado: 80, nome_paciente: 'Mariana Costa', nome_clinica: 'Beta',
    cor_clinica: 1, ...dados,
  };
}

describe('DiaDoMes', () => {
  let fixture: ComponentFixture<DiaDoMes>;
  let dialogo: ReturnType<typeof simularDialogNativo>;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const botao = (texto: string) =>
    [...elemento().querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;

  function abrir(agendamentos: Agendamento[]) {
    fixture = TestBed.createComponent(DiaDoMes);
    fixture.componentRef.setInput('data', '2026-10-20');
    fixture.componentRef.setInput('agendamentos', agendamentos);
    fixture.detectChanges();
  }

  beforeEach(() => {
    dialogo = simularDialogNativo();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 20, 10, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    dialogo.restaurar();
  });

  it('abre como diálogo modal com a data por extenso e o selo de hoje', () => {
    abrir([sessao({})]);

    expect(dialogo.showModal).toHaveBeenCalled();
    expect(elemento().querySelector('h2')?.textContent).toContain('Terça, 20 de outubro');
    expect(elemento().querySelector('app-badge')?.textContent).toContain('Hoje');
  });

  it('mostra o resumo e todas as sessões do dia', () => {
    abrir([
      sessao({ id: 1, status: 'RE', valor_calculado: 80 }),
      sessao({ id: 2, hora_inicio: '14:00:00', nome_paciente: 'João Pereira', valor_calculado: 120 }),
    ]);

    expect(elemento().querySelector('.dia-progresso')?.textContent).toContain('1/2 realizadas');
    expect(elemento().querySelector('.dia-valor')?.textContent?.replace(/\s/g, ' ')).toContain('R$ 200,00');
    expect(elemento().querySelectorAll('.dia-sessao').length).toBe(2);
  });

  it('dia sem sessões avisa e mantém o botão de nova sessão', () => {
    abrir([]);

    expect(elemento().querySelector('.dia-vazio')?.textContent).toContain('Nenhuma sessão');
    expect(botao('+ Sessão neste dia')).toBeTruthy();
  });

  it('clicar numa sessão a devolve para abrir os detalhes', () => {
    const escolhida = sessao({ id: 7 });
    abrir([escolhida]);
    const emitida = vi.fn();
    fixture.componentInstance.sessaoEscolhida.subscribe(emitida);

    (elemento().querySelector('.dia-sessao') as HTMLButtonElement).click();

    expect(emitida).toHaveBeenCalledWith(escolhida);
  });

  it('os botões do rodapé e o fechar avisam a agenda', () => {
    abrir([sessao({})]);
    const avisos = { semana: vi.fn(), nova: vi.fn(), fechar: vi.fn() };
    fixture.componentInstance.abrirNaSemana.subscribe(avisos.semana);
    fixture.componentInstance.novaSessao.subscribe(avisos.nova);
    fixture.componentInstance.fechar.subscribe(avisos.fechar);

    botao('Abrir na semana').click();
    botao('+ Sessão neste dia').click();
    (elemento().querySelector('[aria-label="Fechar"]') as HTMLButtonElement).click();

    expect(avisos.semana).toHaveBeenCalled();
    expect(avisos.nova).toHaveBeenCalled();
    expect(avisos.fechar).toHaveBeenCalled();
  });

  it('o Esc pede para fechar em vez de fechar sozinho', () => {
    abrir([sessao({})]);
    const fechar = vi.fn();
    fixture.componentInstance.fechar.subscribe(fechar);
    const evento = new Event('cancel', { cancelable: true });

    elemento().querySelector('dialog')!.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(fechar).toHaveBeenCalled();
  });
});
