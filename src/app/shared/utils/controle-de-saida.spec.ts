import { signal } from '@angular/core';
import { ControleDeSaida } from './controle-de-saida';

describe('ControleDeSaida', () => {
  const alterado = signal(false);
  const ocupado = signal(false);
  let saida: ControleDeSaida;

  beforeEach(() => {
    alterado.set(false);
    ocupado.set(false);
    saida = new ControleDeSaida(() => alterado(), () => ocupado());
  });

  it('sem alterações, sai sem perguntar', () => {
    expect(saida.confirmarSaida()).toBe(true);
    expect(saida.perguntando()).toBe(false);
  });

  it('com alterações, pergunta e resolve com a resposta', async () => {
    alterado.set(true);

    const resposta = saida.confirmarSaida();
    expect(saida.perguntando()).toBe(true);
    saida.responder(false);

    expect(await resposta).toBe(false);
    expect(saida.perguntando()).toBe(false);
  });

  it('não empilha uma segunda pergunta', () => {
    alterado.set(true);
    saida.confirmarSaida();

    expect(saida.confirmarSaida()).toBe(false);
  });

  it('ocupado (salvando, outra confirmação aberta) recusa a saída sem perguntar', () => {
    alterado.set(true);
    ocupado.set(true);

    expect(saida.confirmarSaida()).toBe(false);
    expect(saida.perguntando()).toBe(false);
  });

  it('depois de concluir (salvou ou excluiu), sai sem perguntar mesmo com alterações', () => {
    alterado.set(true);
    saida.concluir();

    expect(saida.confirmarSaida()).toBe(true);
  });
});
