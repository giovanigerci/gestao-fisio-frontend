import { Directive, ElementRef, HostListener, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appTelefoneMask]',
  standalone: true
})
export class TelefoneMaskDirective implements OnChanges {
  @Input('appTelefoneMask') modelValue: string = '';
  @Output() valorLimpo = new EventEmitter<string>();

  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['modelValue']) {
      const currentCleanValue = this.el.nativeElement.value.replace(/\D/g, '');
      const newCleanValue = (this.modelValue || '').replace(/\D/g, '');
      
      // Só atualiza se o valor vindo de fora for diferente do valor atual limpo
      if (currentCleanValue !== newCleanValue) {
        this.el.nativeElement.value = this.formatar(newCleanValue);
      }
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = this.el.nativeElement;
    const originalValue = input.value;
    const cursorOriginal = input.selectionStart || 0;

    let digitCountBeforeCursor = 0;
    for (let i = 0; i < cursorOriginal; i++) {
      if (/\d/.test(originalValue[i])) {
        digitCountBeforeCursor++;
      }
    }

    let apenasDigitos = originalValue.replace(/\D/g, '');
    if (apenasDigitos.length > 11) {
      apenasDigitos = apenasDigitos.substring(0, 11);
    }

    const novoValor = this.formatar(apenasDigitos);
    input.value = novoValor;

    let novoCursor = 0;
    let digitsFound = 0;
    for (let i = 0; i < novoValor.length; i++) {
      if (digitsFound === digitCountBeforeCursor) {
        break;
      }
      if (/\d/.test(novoValor[i])) {
        digitsFound++;
      }
      novoCursor++;
    }

    input.setSelectionRange(novoCursor, novoCursor);
    this.valorLimpo.emit(apenasDigitos);
  }

  private formatar(apenasDigitos: string): string {
    if (apenasDigitos.length === 0) return '';
    if (apenasDigitos.length <= 2) return `(${apenasDigitos}`;
    if (apenasDigitos.length <= 6) return `(${apenasDigitos.substring(0, 2)}) ${apenasDigitos.substring(2)}`;
    if (apenasDigitos.length <= 10) return `(${apenasDigitos.substring(0, 2)}) ${apenasDigitos.substring(2, 6)}-${apenasDigitos.substring(6)}`;
    return `(${apenasDigitos.substring(0, 2)}) ${apenasDigitos.substring(2, 7)}-${apenasDigitos.substring(7)}`;
  }
}
