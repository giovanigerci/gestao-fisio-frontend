import { Component, computed, input, output } from '@angular/core';
import { Agendamento } from '../../../services/agendamento.service';
import { Badge, BadgeVariant } from '../../../shared/components/badge/badge';
import { Folha } from '../../../shared/components/folha/folha';
import { ProgressBar } from '../../../shared/components/progress-bar/progress-bar';
import { corDaClinica } from '../../../shared/utils/clinic-colors';
import { formatarDataISO, formatarDataPorExtenso } from '../../../shared/utils/datas';
import { formatarValor, resumirDia, segmentosDoProgresso, varianteDoStatus } from '../dia-da-agenda';

let proximoId = 0;

/** Sessões de um dia do mês: painel de baixo no celular, janela ao lado do dia (`ancora`) no desktop. */
@Component({
  selector: 'app-dia-do-mes',
  imports: [Badge, Folha, ProgressBar],
  templateUrl: './dia-do-mes.html',
  styleUrl: './dia-do-mes.css',
})
export class DiaDoMes {
  readonly data = input.required<string>();
  readonly agendamentos = input.required<Agendamento[]>();
  readonly ancora = input<DOMRect | null>(null);

  readonly fechar = output<void>();
  readonly sessaoEscolhida = output<Agendamento>();
  readonly abrirNaSemana = output<void>();
  readonly novaSessao = output<void>();

  readonly idTitulo = `dia-do-mes-${++proximoId}`;
  readonly titulo = computed(() => formatarDataPorExtenso(this.data()));
  readonly ehHoje = computed(() => this.data() === formatarDataISO());
  readonly resumo = computed(() => resumirDia(this.agendamentos()));
  readonly segmentos = computed(() => segmentosDoProgresso(this.resumo()));

  readonly corDaClinica = corDaClinica;
  readonly formatarValor = formatarValor;

  variante(agendamento: Agendamento): BadgeVariant {
    return agendamento.eh_experimental ? 'experimental' : varianteDoStatus(agendamento.status);
  }
}
