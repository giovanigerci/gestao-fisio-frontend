import { Component, ElementRef, OnDestroy, afterNextRender, input, output, signal, viewChild } from '@angular/core';
import { posicionarJanela } from './posicao-janela';

const DESKTOP = '(min-width: 1024px)';

/**
 * Painel sobre o `<dialog>` nativo: o navegador fecha no Esc, prende o foco, deixa a página de trás
 * inerte e devolve o foco a quem abriu. Celular: sobe de baixo. Desktop: janela centralizada ou, com
 * `ancora`, ao lado do elemento clicado.
 *
 * Como o `<app-modal>`, não decide se pode fechar: Esc, clique fora e ✕ de quem usa só emitem `fechar`.
 */
@Component({
  selector: 'app-folha',
  templateUrl: './folha.html',
  styleUrl: './folha.css',
})
export class Folha implements OnDestroy {
  /** id do título dentro do conteúdo, para o leitor de tela anunciar o painel. */
  readonly rotuladoPor = input.required<string>();
  readonly ancora = input<DOMRect | null>(null);
  /** Largura no desktop, em px. */
  readonly largura = input(480);
  readonly fechar = output<void>();

  readonly posicao = signal<{ top: number; left: number } | null>(null);
  readonly posicionada = signal(false);

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

  aoCancelar(evento: Event) {
    evento.preventDefault();
    this.fechar.emit();
  }

  aoPressionar(evento: MouseEvent) {
    this.cliqueComecouFora = evento.target === this.dialogo().nativeElement;
  }

  /** Clique no fundo (o próprio <dialog>, fora da caixa). Arrastar de dentro para fora não conta. */
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
