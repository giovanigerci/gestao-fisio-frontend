import { Component, computed, input, output } from '@angular/core';
import { Agendamento } from '../../../services/agendamento.service';
import { clinicasDaLegenda, montarCelulasDoMes } from './celulas-do-mes';

export interface DiaEscolhido {
  data: string;
  ancora: DOMRect;
}

@Component({
  selector: 'app-agenda-mes',
  templateUrl: './agenda-mes.html',
  styleUrl: './agenda-mes.css',
})
export class AgendaMes {
  readonly mes = input.required<string>();
  readonly agendamentos = input.required<Agendamento[]>();
  readonly diaAberto = input<string | null>(null);
  readonly carregando = input(false);
  readonly diaEscolhido = output<DiaEscolhido>();

  readonly diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  readonly celulas = computed(() => montarCelulasDoMes(this.mes(), this.agendamentos()));
  readonly legenda = computed(() => clinicasDaLegenda(this.agendamentos()));

  escolher(data: string, evento: MouseEvent) {
    const ancora = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    this.diaEscolhido.emit({ data, ancora });
  }
}
