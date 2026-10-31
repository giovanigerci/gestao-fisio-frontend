import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agendamento } from '../../../services/agendamento.service';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';
import { DetalhesDaSessao } from './detalhes-da-sessao';

function sessao(dados: Partial<Agendamento>): Agendamento {
  return {
    id: 1, profissional: 1, clinica: 1, paciente: 1, data: '2026-10-20', hora_inicio: '08:00:00', hora_fim: '09:00:00',
    status: 'AG', eh_experimental: false, valor_calculado: 80, nome_paciente: 'Mariana Costa', nome_clinica: 'Beta',
    cor_clinica: 1, idade_paciente: '34 anos', ...dados,
  };
}

describe('DetalhesDaSessao', () => {
  let fixture: ComponentFixture<DetalhesDaSessao>;
  let dialogo: ReturnType<typeof simularDialogNativo>;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const botao = (texto: string) =>
    [...elemento().querySelectorAll<HTMLButtonElement>('.detalhe-acao')].find((b) => b.textContent?.includes(texto))!;
  const campo = (rotulo: string) =>
    [...elemento().querySelectorAll('.detalhe-campo')].find((c) => c.querySelector('dt')?.textContent === rotulo)
      ?.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim();

  function abrir(agendamento: Agendamento, processando = false) {
    fixture = TestBed.createComponent(DetalhesDaSessao);
    fixture.componentRef.setInput('agendamento', agendamento);
    fixture.componentRef.setInput('processando', processando);
    fixture.detectChanges();
  }

  beforeEach(() => (dialogo = simularDialogNativo()));
  afterEach(() => dialogo.restaurar());

  it('abre como diálogo e mostra os dados da sessão em pares rótulo e valor', () => {
    abrir(sessao({}));

    expect(dialogo.showModal).toHaveBeenCalled();
    expect(campo('Paciente')).toBe('Mariana Costa');
    expect(campo('Idade')).toBe('34 anos');
    expect(campo('Clínica')).toBe('Beta');
    expect(campo('Data')).toBe('20/10/2026');
    expect(campo('Horário')).toBe('08:00 – 09:00');
    expect(campo('Valor')).toBe('R$ 80,00');
  });

  it('cada botão avisa a agenda da ação escolhida', () => {
    abrir(sessao({}));
    const acoes = { editar: vi.fn(), realizado: vi.fn(), cancelar: vi.fn(), excluir: vi.fn() };
    fixture.componentInstance.editar.subscribe(acoes.editar);
    fixture.componentInstance.marcarRealizado.subscribe(acoes.realizado);
    fixture.componentInstance.cancelarSessao.subscribe(acoes.cancelar);
    fixture.componentInstance.excluir.subscribe(acoes.excluir);

    ['Editar', 'Realizado', 'Cancelar', 'Excluir'].forEach((texto) => botao(texto).click());

    expect(Object.values(acoes).every((acao) => acao.mock.calls.length === 1)).toBe(true);
  });

  it('sessão já realizada não pode ser marcada de novo; cancelada não pode ser cancelada de novo', () => {
    abrir(sessao({ status: 'RE' }));
    expect(botao('Realizado').disabled).toBe(true);
    expect(botao('Cancelar').disabled).toBe(false);

    fixture.componentRef.setInput('agendamento', sessao({ status: 'CA' }));
    fixture.detectChanges();
    expect(botao('Cancelar').disabled).toBe(true);
  });

  it('enquanto uma ação está em andamento, os botões ficam travados', () => {
    abrir(sessao({}), true);

    expect([...elemento().querySelectorAll<HTMLButtonElement>('.detalhe-acao')].every((b) => b.disabled)).toBe(true);
  });

  it('o Esc pede para fechar', () => {
    abrir(sessao({}));
    const fechar = vi.fn();
    fixture.componentInstance.fechar.subscribe(fechar);

    elemento().querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));

    expect(fechar).toHaveBeenCalled();
  });
});
