import { Component, ElementRef, OnDestroy, afterNextRender, computed, input, output, signal, viewChild } from '@angular/core';
import { Agendamento } from '../../../services/agendamento.service';
import { Badge, BadgeVariant } from '../../../shared/components/badge/badge';
import { ProgressBar } from '../../../shared/components/progress-bar/progress-bar';
import { corDaClinica } from '../../../shared/utils/clinic-colors';
import { formatarDataISO, formatarDataPorExtenso } from '../../../shared/utils/datas';
import { formatarValor, resumirDia, segmentosDoProgresso, varianteDoStatus } from '../dia-da-agenda';
import { posicionarJanela } from './posicao-janela';

const DESKTOP = '(min-width: 1024px)';
let proximoId = 0;

/**
 * Sessões de um dia do mês sobre o `<dialog>` nativo (Esc, foco preso e página de trás inerte).
 * Celular: painel que sobe de baixo. Desktop: janela ao lado do dia clicado (`ancora`).
 */
@Component({
  selector: 'app-dia-do-mes',
  imports: [Badge, ProgressBar],
  templateUrl: './dia-do-mes.html',
  styleUrl: './dia-do-mes.css',
})
export class DiaDoMes implements OnDestroy {
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
  readonly posicao = signal<{ top: number; left: number } | null>(null);
  readonly posicionada = signal(false);

  readonly corDaClinica = corDaClinica;
  readonly formatarValor = formatarValor;

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private cliqueComecouFora = false;

  constructor() {
    afterNextRender(() => {
      const dialogo = this.dialogo().nativeElement;
      if (!dialogo.open && typeof dialogo.showModal === 'function') dialogo.showModal();
      this.posicionar(dialogo);
    });
  }

  ngOnDestroy() {
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open && typeof dialogo.close === 'function') dialogo.close();
  }

  variante(agendamento: Agendamento): BadgeVariant {
    return agendamento.eh_experimental ? 'experimental' : varianteDoStatus(agendamento.status);
  }

  aoCancelar(evento: Event) {
    evento.preventDefault();
    this.fechar.emit();
  }

  aoPressionar(evento: MouseEvent) {
    this.cliqueComecouFora = evento.target === this.dialogo().nativeElement;
  }

  aoClicar(evento: MouseEvent) {
    if (this.cliqueComecouFora && evento.target === this.dialogo().nativeElement) this.fechar.emit();
    this.cliqueComecouFora = false;
  }

  private posicionar(dialogo: HTMLDialogElement) {
    const ancora = this.ancora();
    const ehDesktop = typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP).matches;
    if (ehDesktop && ancora) {
      const { width, height } = dialogo.getBoundingClientRect();
      this.posicao.set(
        posicionarJanela(ancora, { largura: width, altura: height }, { largura: window.innerWidth, altura: window.innerHeight }),
      );
    }
    this.posicionada.set(true);
  }
}
