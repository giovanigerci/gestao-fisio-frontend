import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoedaMaskDirective, centavosParaValor, normalizarMoeda } from './moeda-mask.directive';

describe('centavosParaValor', () => {
  it('os dígitos entram pela direita, nos centavos', () => {
    expect(centavosParaValor('5')).toBe('0.05');
    expect(centavosParaValor('4000')).toBe('40.00');
    expect(centavosParaValor('400000')).toBe('4000.00');
  });

  it('ignora vírgula, ponto, letras e símbolos', () => {
    expect(centavosParaValor('40,00')).toBe('40.00');
    expect(centavosParaValor('R$ 4a0.0b0')).toBe('40.00');
  });

  it('limita a 9999,99 (máximo do banco)', () => {
    expect(centavosParaValor('9999999')).toBe('9999.99');
  });

  it('zero à esquerda e campo vazio', () => {
    expect(centavosParaValor('0')).toBe('0.00');
    expect(centavosParaValor('0005')).toBe('0.05');
    expect(centavosParaValor('')).toBe('');
    expect(centavosParaValor('abc')).toBe('');
  });
});

describe('normalizarMoeda (valores colados ou vindos da API)', () => {
  it('aceita vírgula ou ponto como separador decimal', () => {
    expect(normalizarMoeda('40,00')).toBe('40.00');
    expect(normalizarMoeda('40.00')).toBe('40.00');
  });

  it('descarta letras e símbolos', () => {
    expect(normalizarMoeda('R$ 40,50')).toBe('40.50');
  });

  it('com separador de milhar, usa o último separador como decimal', () => {
    expect(normalizarMoeda('R$ 1.234,50', true)).toBe('1234.50');
    expect(normalizarMoeda('1,234.50', true)).toBe('1234.50');
  });
});

@Component({
  imports: [MoedaMaskDirective],
  template: `<input [appMoedaMask]="valor()" (valorLimpo)="valor.set($event)" />`,
})
class HostComponent {
  valor = signal('');
}

describe('MoedaMaskDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let input: HTMLInputElement;

  function digitar(texto: string, inputType = 'insertText') {
    input.value = texto;
    input.dispatchEvent(new InputEvent('input', { inputType }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    input = fixture.nativeElement.querySelector('input');
    await fixture.whenStable();
  });

  it('formata enquanto digita: 4000 → 40,00 e 400000 → 4000,00', () => {
    digitar('4000');
    expect(input.value).toBe('40,00');
    expect(host.valor()).toBe('40.00');

    digitar('400000');
    expect(input.value).toBe('4000,00');
    expect(host.valor()).toBe('4000.00');
  });

  it('cada dígito novo empurra os anteriores para a esquerda', () => {
    digitar('4');
    expect(input.value).toBe('0,04');
    digitar('0,040'); // campo "0,04" + dígito "0" digitado no fim
    expect(input.value).toBe('0,40');
    digitar('0,400');
    expect(input.value).toBe('4,00');
  });

  it('apagar remove o último dígito', () => {
    digitar('4000');
    digitar('40,0'); // backspace em "40,00"
    expect(input.value).toBe('4,00');
    expect(host.valor()).toBe('4.00');
  });

  it('não aceita letras', () => {
    digitar('4a0');
    expect(input.value).toBe('0,40');
  });

  it('não passa de 9999,99', () => {
    digitar('9999,999'); // campo cheio + mais um dígito
    expect(input.value).toBe('9999,99');
  });

  it('valor colado é tratado como valor completo, não como centavos', () => {
    digitar('150', 'insertFromPaste');
    expect(input.value).toBe('150,00');
    expect(host.valor()).toBe('150.00');

    digitar('R$ 1.234,50', 'insertFromPaste');
    expect(input.value).toBe('1234,50');
    expect(host.valor()).toBe('1234.50');
  });

  it('exibe com vírgula o valor carregado do backend', async () => {
    host.valor.set('150.00');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(input.value).toBe('150,00');
  });
});
