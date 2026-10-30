import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  /** Cor da borda lateral esquerda (e.g. `corDaClinica(clinica.cor)` retorna `var(--color-clinic-N)`). */
  clinicColor = input<string>();
}
