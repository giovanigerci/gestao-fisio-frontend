import { Component, ElementRef, Injector, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ContaService, ResumoDosDados } from '../../../services/conta.service';
import { ExportacaoDados } from '../../../services/exportacao-dados.service';
import { Modal } from '../../../shared/components/modal/modal';
import { focarPrimeiroCampoComErro, tratarErrosApi, temErro, mensagensErro } from '../../../shared/utils/form-errors';

/**
 * Card de risco "Excluir conta" do Perfil e o modal de confirmação (LGPD). A exclusão é definitiva
 * e imediata; por isso o modal mostra o que será apagado, oferece a exportação ali mesmo e pede a
 * senha e a confirmação explícita.
 */
@Component({
  selector: 'app-excluir-conta',
  imports: [Modal],
  templateUrl: './excluir-conta.html',
  styleUrls: ['../../../../styles/form-page.css', '../../../../styles/modal-form.css', './excluir-conta.css'],
})
export class ExcluirConta {
  private conta = inject(ContaService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);
  readonly exportacao = inject(ExportacaoDados);

  /** Quantidades da conta (já buscadas pela página); sem elas, o aviso usa textos genéricos. */
  readonly resumo = input<ResumoDosDados | null>(null);
  /** A conta foi excluída no backend: quem usa limpa a sessão local e leva ao login. */
  readonly contaExcluida = output<void>();

  modalAberto = signal(false);
  senha = signal('');
  ciente = signal(false);
  excluindo = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});

  /** Senha digitada e confirmação ligada: o botão sai do tom apagado. */
  readonly liberado = computed(() => !!this.senha() && this.ciente());
  readonly podeExcluir = computed(() => this.liberado() && !this.excluindo());

  abrir() {
    this.senha.set('');
    this.ciente.set(false);
    this.erros.set({});
    this.erroGeral.set('');
    this.modalAberto.set(true);
  }

  fechar() {
    if (this.excluindo()) return;
    this.modalAberto.set(false);
    this.senha.set('');
  }

  excluir() {
    if (!this.podeExcluir()) return;
    this.excluindo.set(true);
    this.erros.set({});
    this.erroGeral.set('');

    this.conta.excluir(this.senha()).subscribe({
      next: () => this.contaExcluida.emit(),
      error: (erro: HttpErrorResponse) => {
        this.excluindo.set(false);
        if (erro.status === 429) {
          this.erroGeral.set('Muitas tentativas. Aguarde um pouco antes de tentar de novo.');
          return;
        }
        tratarErrosApi(erro, this.erros, this.erroGeral, 'Não foi possível excluir a conta. Tente novamente.');
        focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      },
    });
  }

  plural(quantidade: number, singular: string, plural: string): string {
    return `${quantidade.toLocaleString('pt-BR')} ${quantidade === 1 ? singular : plural}`;
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }
}
