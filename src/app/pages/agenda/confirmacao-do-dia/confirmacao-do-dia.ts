import { Component, computed, input, output } from '@angular/core';
import { Agendamento } from '../../../services/agendamento.service';
import { Folha } from '../../../shared/components/folha/folha';
import { corDaClinica } from '../../../shared/utils/clinic-colors';
import { formatarValor } from '../dia-da-agenda';

let proximoId = 0;

@Component({
  selector: 'app-confirmacao-do-dia',
  imports: [Folha],
  templateUrl: './confirmacao-do-dia.html',
  styleUrl: './confirmacao-do-dia.css',
})
export class ConfirmacaoDoDia {
  /** Ex: "Terça-feira, 20 de outubro". */
  readonly dia = input.required<string>();
  readonly pendentes = input.required<Agendamento[]>();
  readonly cancelados = input(0);
  readonly valorPendente = input(0);
  readonly processando = input(false);

  readonly fechar = output<void>();
  readonly confirmar = output<void>();

  readonly idTitulo = `confirmacao-do-dia-${++proximoId}`;
  readonly sessoes = computed(() => (this.pendentes().length === 1 ? '1 sessão' : `${this.pendentes().length} sessões`));

  readonly corDaClinica = corDaClinica;
  readonly formatarValor = formatarValor;

  hora(hora: string) {
    return hora.substring(0, 5);
  }
}
