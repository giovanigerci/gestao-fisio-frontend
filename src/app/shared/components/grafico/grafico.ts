import { Component, DestroyRef, ElementRef, afterRenderEffect, inject, input, viewChild } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

// Só o que os gráficos do projeto usam (tree-shaking: o Chart.js completo é bem maior)
Chart.register(
  LineController, LineElement, PointElement, Filler,
  BarController, BarElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale, Tooltip,
);

/**
 * Wrapper fino do Chart.js. Recebe a configuração pronta (montada fora, em funções testáveis)
 * e cuida do ciclo de vida: cria após renderizar, atualiza no lugar quando a configuração muda
 * (sem piscar nem recriar o canvas) e destrói ao sair da tela.
 *
 * Canvas não é acessível por si só: quem usa deve oferecer legenda e versão em tabela.
 */
@Component({
  selector: 'app-grafico',
  template: `
    <div class="grafico" [style.height.px]="altura()">
      <canvas #canvas role="img" [attr.aria-label]="descricao()"></canvas>
    </div>
  `,
  styles: `
    .grafico { position: relative; width: 100%; }
  `,
})
export class Grafico {
  readonly config = input.required<ChartConfiguration>();
  readonly descricao = input.required<string>();
  /** Altura total, já incluindo a faixa dos rótulos do eixo X. */
  readonly altura = input(240);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private grafico?: Chart;

  constructor() {
    afterRenderEffect(() => {
      const config = this.config();
      if (this.grafico) {
        this.grafico.data = config.data;
        this.grafico.options = config.options ?? {};
        this.grafico.update('none');
        return;
      }
      const elemento = this.canvas().nativeElement;
      if (!elemento.getContext('2d')) return; // ambiente sem canvas (ex: testes em jsdom)
      this.grafico = new Chart(elemento, config);
    });

    inject(DestroyRef).onDestroy(() => this.grafico?.destroy());
  }
}
