import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agendamento } from '../../../services/agendamento.service';
import { simularDialogNativo } from '../../../shared/components/modal/simular-dialog.spec-helper';
import { ConfirmacaoDoDia } from './confirmacao-do-dia';

function sessao(dados: Partial<Agendamento>): Agendamento {
  return {
    id: 1, profissional: 1, clinica: 1, paciente: 1, data: '2026-10-20', hora_inicio: '08:00:00', hora_fim: '09:00:00',
    status: 'AG', eh_experimental: false, valor_calculado: 80, nome_paciente: 'Mariana Costa', nome_clinica: 'Movi',
    cor_clinica: 1, ...dados,
  };
}

describe('ConfirmacaoDoDia', () => {
  let fixture: ComponentFixture<ConfirmacaoDoDia>;
  let dialogo: ReturnType<typeof simularDialogNativo>;
  const elemento = () => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string) => elemento().querySelector(seletor)?.textContent?.replace(/\s+/g, ' ').trim();
  const botaoConfirmar = () => elemento().querySelector<HTMLButtonElement>('.confirmacao-botao--primario')!;

  function abrir(pendentes: Agendamento[], extras: { cancelados?: number; processando?: boolean } = {}) {
    fixture = TestBed.createComponent(ConfirmacaoDoDia);
    fixture.componentRef.setInput('dia', 'Terça-feira, 20 de outubro');
    fixture.componentRef.setInput('pendentes', pendentes);
    fixture.componentRef.setInput('cancelados', extras.cancelados ?? 0);
    fixture.componentRef.setInput('valorPendente', 200);
    fixture.componentRef.setInput('processando', extras.processando ?? false);
    fixture.detectChanges();
  }

  beforeEach(() => (dialogo = simularDialogNativo()));
  afterEach(() => dialogo.restaurar());

  it('mostra o dia, as sessões a confirmar e o total', () => {
    abrir([sessao({ id: 1 }), sessao({ id: 2, hora_inicio: '14:00:00', nome_paciente: 'João Pereira', valor_calculado: 120 })]);

    expect(dialogo.showModal).toHaveBeenCalled();
    expect(texto('.confirmacao-subtitulo')).toBe('Terça-feira, 20 de outubro · 2 sessões');
    expect(elemento().querySelectorAll('.confirmacao-item').length).toBe(2);
    expect(texto('.confirmacao-total')).toBe('R$ 200,00');
    expect(texto('.confirmacao-botao--primario')).toBe('Confirmar 2 sessões');
  });

  it('avisa quantas canceladas ficam de fora', () => {
    abrir([sessao({})], { cancelados: 1 });

    expect(texto('.confirmacao-cancelados')).toBe('1 cancelado · não será afetado');
  });

  it('confirmar avisa a agenda', () => {
    abrir([sessao({})]);
    const confirmar = vi.fn();
    fixture.componentInstance.confirmar.subscribe(confirmar);

    botaoConfirmar().click();

    expect(confirmar).toHaveBeenCalled();
  });

  it('enquanto confirma, mostra o andamento e trava os botões', () => {
    abrir([sessao({})], { processando: true });

    expect(texto('.confirmacao-botao--primario')).toBe('Confirmando...');
    expect([...elemento().querySelectorAll<HTMLButtonElement>('.confirmacao-botao')].every((b) => b.disabled)).toBe(true);
  });

  it('sem sessões pendentes, não há o que confirmar', () => {
    abrir([]);

    expect(botaoConfirmar().disabled).toBe(true);
  });
});
