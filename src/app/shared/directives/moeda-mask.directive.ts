import { Directive, ElementRef, effect, inject, input, output } from '@angular/core';

// O campo no backend é DecimalField(max_digits=6, decimal_places=2): máximo 9999.99
const MAX_DIGITOS_INTEIROS = 4;
const MAX_CASAS_DECIMAIS = 2;
const MAX_DIGITOS = MAX_DIGITOS_INTEIROS + MAX_CASAS_DECIMAIS;

/**
 * Normaliza um valor completo (colado ou vindo da API) para o formato da API ("1234.5").
 * Aceita vírgula ou ponto como separador decimal e descarta qualquer outro caractere.
 * Com os dois separadores ("1.234,50"), só quando colado, o último é o decimal.
 */
export function normalizarMoeda(bruto: string, colado = false): string {
  let texto = bruto.replace(/[^\d.,]/g, '');

  if (colado && texto.includes('.') && texto.includes(',')) {
    const ultimo = Math.max(texto.lastIndexOf('.'), texto.lastIndexOf(','));
    texto = texto.slice(0, ultimo).replace(/[.,]/g, '') + '.' + texto.slice(ultimo + 1);
  }

  const posSeparador = texto.search(/[.,]/);
  const temSeparador = posSeparador !== -1;
  let inteiro = temSeparador ? texto.slice(0, posSeparador) : texto;
  let decimal = temSeparador ? texto.slice(posSeparador + 1).replace(/[.,]/g, '') : '';

  inteiro = inteiro.replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITOS_INTEIROS);
  decimal = decimal.slice(0, MAX_CASAS_DECIMAIS);

  if (!temSeparador) return inteiro;
  return `${inteiro || '0'}.${decimal}`;
}

/**
 * Digitação estilo "caixa registradora": os dígitos entram pela direita, nos centavos.
 * "4000" → "40.00", "400000" → "4000.00", "5" → "0.05". Vírgula e ponto são ignorados.
 */
export function centavosParaValor(digitado: string): string {
  const digitos = digitado.replace(/\D/g, '');
  if (!digitos) return '';

  const significativos = digitos.replace(/^0+/, '').slice(0, MAX_DIGITOS).padStart(MAX_CASAS_DECIMAIS + 1, '0');
  return `${significativos.slice(0, -MAX_CASAS_DECIMAIS)}.${significativos.slice(-MAX_CASAS_DECIMAIS)}`;
}

/** "40" / "40.5" → "40.00" / "40.50" */
function comCasasDecimais(valorApi: string): string {
  if (!valorApi) return '';
  const [inteiro, decimal = ''] = valorApi.split('.');
  return `${inteiro || '0'}.${decimal.padEnd(MAX_CASAS_DECIMAIS, '0')}`;
}

function paraExibicao(valorApi: string): string {
  return valorApi.replace('.', ',');
}

/**
 * Máscara de valor em reais: exibe com vírgula e emite o valor com ponto em `valorLimpo`.
 * Uso: <input [appMoedaMask]="valor()" (valorLimpo)="valor.set($event)" inputmode="numeric" />
 */
@Directive({
  selector: '[appMoedaMask]',
  host: {
    '(input)': 'aoDigitar($event)',
  },
})
export class MoedaMaskDirective {
  private el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  readonly valor = input<string | null | undefined>('', { alias: 'appMoedaMask' });
  readonly valorLimpo = output<string>();

  constructor() {
    // Sincroniza valores vindos de fora (ex: clínica carregada do backend, "40.00")
    effect(() => {
      const externo = comCasasDecimais(normalizarMoeda(this.valor() ?? ''));
      const atual = normalizarMoeda(this.el.nativeElement.value);
      if (atual !== externo) {
        this.el.nativeElement.value = paraExibicao(externo);
      }
    });
  }

  aoDigitar(event: Event) {
    const input = this.el.nativeElement;
    // Colar é um valor completo ("150" = R$ 150,00), não uma sequência de teclas
    const colado = (event as InputEvent).inputType === 'insertFromPaste';
    const valorApi = colado
      ? comCasasDecimais(normalizarMoeda(input.value, true))
      : centavosParaValor(input.value);

    input.value = paraExibicao(valorApi);
    // Na caixa registradora o cursor fica sempre no fim, onde entram os próximos dígitos
    input.setSelectionRange(input.value.length, input.value.length);

    this.valorLimpo.emit(valorApi);
  }
}
