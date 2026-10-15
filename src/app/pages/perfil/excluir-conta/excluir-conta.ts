import { Component, ElementRef, Injector, computed, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ContaService, ResumoDosDados } from '../../../services/conta.service';
import { Modal } from '../../../shared/components/modal/modal';
import { formatarDataISO } from '../../../shared/utils/datas';
import { baixarArquivo } from '../../../shared/utils/download';
import { focarPrimeiroCampoComErro, tratarErrosApi, temErro, mensagensErro } from '../../../shared/utils/form-errors';

/**
 * Seção "Seus dados" do Perfil (LGPD): exportar uma cópia dos dados e excluir a conta.
 * A exclusão é definitiva e imediata; por isso o modal mostra o que será apagado, oferece a
 * exportação ali mesmo e pede a senha e a confirmação explícita.
 */
@Component({
  selector: 'app-dados-da-conta',
  imports: [Modal],
  templateUrl: './dados-da-conta.html',
  styleUrls: ['../../../../styles/form-page.css', '../../../../styles/modal-form.css', './dados-da-conta.css'],
})
export class DadosDaConta {
  private conta = inject(ContaService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  /** A conta foi excluída no backend: quem usa limpa a sessão local e leva ao login. */
  readonly contaExcluida = output<void>();

  exportando = signal(false);
  erroExportacao = signal('');
  exportou = signal(false);

  modalAberto = signal(false);
  resumo = signal<ResumoDosDados | null>(null);
  senha = signal('');
  ciente = signal(false);
  excluindo = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});

  readonly podeExcluir = computed(() => !!this.senha() && this.ciente() && !this.excluindo());

  exportar() {
    if (this.exportando()) return;
    this.exportando.set(true);
    this.erroExportacao.set('');

    this.conta.exportar().subscribe({
      next: (arquivo) => {
        baixarArquivo(arquivo, `gestao-fisio-dados-${formatarDataISO()}.zip`);
        this.exportando.set(false);
        this.exportou.set(true);
      },
      error: (erro: HttpErrorResponse) => {
        this.exportando.set(false);
        this.erroExportacao.set(
          erro.status === 429
            ? 'Você já exportou várias vezes na última hora. Tente de novo mais tarde.'
            : 'Não foi possível gerar a exportação. Tente novamente.'
        );
      },
    });
  }

  abrirExclusao() {
    this.senha.set('');
    this.ciente.set(false);
    this.erros.set({});
    this.erroGeral.set('');
    this.modalAberto.set(true);
    this.conta.resumo().subscribe({
      next: (resumo) => this.resumo.set(resumo),
      error: () => this.resumo.set(null), // sem as quantidades, o aviso continua valendo
    });
  }

  fecharExclusao() {
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
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }
}
