import { Component, ElementRef, OnDestroy, afterNextRender, input, output, viewChild } from '@angular/core';

let proximoId = 0;

/**
 * Modal de formulário sobre o `<dialog>` nativo: o navegador já deixa a página de trás inerte,
 * prende o foco dentro do modal, fecha no Esc e devolve o foco a quem abriu.
 *
 * Desktop: janela centralizada. Celular (< 640px): tela cheia, com a ação principal no cabeçalho
 * (conteúdo `[modal-acao-topo]`) porque o rodapé some atrás do teclado.
 *
 * O modal não decide se pode fechar: Esc, clique fora e ✕ só emitem `fechar`. Quem usa navega de
 * volta e o guard de alterações pendentes da rota pergunta antes de descartar, cobrindo também o
 * botão voltar do navegador.
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal implements OnDestroy {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  readonly fechar = output<void>();

  readonly idTitulo = `modal-titulo-${++proximoId}`;

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private cliqueComecouFora = false;

  constructor() {
    afterNextRender(() => {
      const dialogo = this.dialogo().nativeElement;
      if (!dialogo.open && typeof dialogo.showModal === 'function') dialogo.showModal();
    });
  }

  ngOnDestroy() {
    // close() devolve o foco ao elemento que abriu o modal (ex: o botão "Nova clínica")
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open && typeof dialogo.close === 'function') dialogo.close();
  }

  aoCancelar(evento: Event) {
    evento.preventDefault(); // o Esc não fecha direto: quem usa decide (pode haver alterações)
    this.fechar.emit();
  }

  aoPressionar(evento: MouseEvent) {
    this.cliqueComecouFora = evento.target === this.dialogo().nativeElement;
  }

  /** Clique no fundo escurecido (o próprio <dialog>, fora da caixa). Arrastar de dentro para fora não conta. */
  aoClicar(evento: MouseEvent) {
    if (this.cliqueComecouFora && evento.target === this.dialogo().nativeElement) this.fechar.emit();
    this.cliqueComecouFora = false;
  }
}
