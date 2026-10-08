import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Combobox, OpcaoCombobox } from './combobox';

@Component({
  imports: [Combobox],
  template: `
    <form (submit)="$event.preventDefault(); enviou = enviou + 1">
      <label for="campo">Paciente</label>
      <app-combobox idCampo="campo" [opcoes]="opcoes" [(valor)]="valor" textoSemResultado="Nenhum paciente" />
    </form>
  `,
})
class Hospedeiro {
  opcoes: OpcaoCombobox[] = [
    { id: 1, nome: 'Ana Souza' },
    { id: 2, nome: 'José Andrade' },
    { id: 3, nome: 'Mariana Alves' },
  ];
  valor = signal<number | null>(null);
  enviou = 0;
}

describe('Combobox', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let campo: HTMLInputElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    campo = fixture.nativeElement.querySelector('input');
  });

  function digitar(texto: string) {
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function tecla(key: string) {
    const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    campo.dispatchEvent(evento);
    fixture.detectChanges();
    return evento;
  }

  const opcoesVisiveis = () =>
    [...fixture.nativeElement.querySelectorAll('[role="option"]')].map((o: Element) => o.textContent!.trim().replace(/^\S+\s+/, ''));

  it('é um combobox acessível ligado à lista de opções', () => {
    digitar('a');

    expect(campo.getAttribute('role')).toBe('combobox');
    expect(campo.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="listbox"]').id).toBe(campo.getAttribute('aria-controls'));
  });

  it('filtra pelo nome ignorando acentos e maiúsculas', () => {
    digitar('jose');

    expect(opcoesVisiveis()).toEqual(['José Andrade']);
  });

  it('setas + Enter escolhem a opção sem enviar o formulário', () => {
    digitar('a');
    tecla('ArrowDown');
    const enter = tecla('Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.valor()).toBe(2);
    expect(campo.value).toBe('José Andrade');
    expect(fixture.componentInstance.enviou).toBe(0);
  });

  it('a opção ativa é anunciada para o leitor de tela', () => {
    digitar('a');
    tecla('ArrowDown');

    expect(campo.getAttribute('aria-activedescendant')).toBe('campo-opcao-2');
  });

  it('Esc fecha só a lista (não chega ao modal em volta)', () => {
    digitar('ana');
    const fora = vi.fn();
    fixture.nativeElement.addEventListener('keydown', fora);

    const esc = tecla('Escape');

    expect(esc.defaultPrevented).toBe(true);
    expect(fora).not.toHaveBeenCalled();
    expect(campo.getAttribute('aria-expanded')).toBe('false');
  });

  it('com a lista fechada, o Esc segue normalmente (fecha o modal)', () => {
    const esc = tecla('Escape');

    expect(esc.defaultPrevented).toBe(false);
  });

  it('sair do campo sem escolher volta ao paciente escolhido', () => {
    fixture.componentInstance.valor.set(3);
    fixture.detectChanges();
    digitar('xyz');

    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(campo.value).toBe('Mariana Alves');
    expect(fixture.componentInstance.valor()).toBe(3);
  });

  it('apagar o texto desfaz a escolha', () => {
    fixture.componentInstance.valor.set(1);
    fixture.detectChanges();

    digitar('');

    expect(fixture.componentInstance.valor()).toBeNull();
  });

  it('sem resultado, avisa', () => {
    digitar('zzz');

    expect(fixture.nativeElement.querySelector('.combobox-vazio').textContent).toContain('Nenhum paciente');
  });
});
