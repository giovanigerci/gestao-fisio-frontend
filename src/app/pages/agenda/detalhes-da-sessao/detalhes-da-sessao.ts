import { Component, input, output } from '@angular/core';
import { Agendamento } from '../../../services/agendamento.service';
import { Badge } from '../../../shared/components/badge/badge';
import { Folha } from '../../../shared/components/folha/folha';
import { formatarValor, varianteDoStatus } from '../dia-da-agenda';

let proximoId = 0;

@Component({
  selector: 'app-detalhes-da-sessao',
  imports: [Badge, Folha],
  templateUrl: './detalhes-da-sessao.html',
  styleUrl: './detalhes-da-sessao.css',
})
export class DetalhesDaSessao {
  readonly agendamento = input.required<Agendamento>();
  readonly processando = input(false);

  readonly fechar = output<void>();
  readonly editar = output<void>();
  readonly marcarRealizado = output<void>();
  readonly cancelarSessao = output<void>();
  readonly excluir = output<void>();

  readonly idTitulo = `detalhes-da-sessao-${++proximoId}`;
  readonly formatarValor = formatarValor;
  readonly varianteDoStatus = varianteDoStatus;

  hora(hora: string) {
    return hora.substring(0, 5);
  }

  data(dataISO: string) {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }
}
