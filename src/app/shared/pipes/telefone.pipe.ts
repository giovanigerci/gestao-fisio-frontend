import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'telefone',
  standalone: true
})
export class TelefonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    const apenasDigitos = value.replace(/\D/g, '');

    if (apenasDigitos.length === 11) {
      return `(${apenasDigitos.substring(0, 2)}) ${apenasDigitos.substring(2, 7)}-${apenasDigitos.substring(7)}`;
    } else if (apenasDigitos.length === 10) {
      return `(${apenasDigitos.substring(0, 2)}) ${apenasDigitos.substring(2, 6)}-${apenasDigitos.substring(6)}`;
    }

    // Retorna original se não bater no tamanho padrão
    return value;
  }
}
