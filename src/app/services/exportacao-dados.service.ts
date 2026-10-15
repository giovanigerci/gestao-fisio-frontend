import { Service, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ContaService } from './conta.service';
import { formatarDataISO } from '../shared/utils/datas';
import { baixarArquivo } from '../shared/utils/download';

/**
 * Exportação dos dados da conta (LGPD), com o estado compartilhado: o botão aparece no card
 * "Segurança e dados" do Perfil e dentro do modal de exclusão, e os dois mostram o mesmo "Gerando…".
 */
@Service()
export class ExportacaoDados {
  private conta = inject(ContaService);

  readonly exportando = signal(false);
  readonly erro = signal('');
  readonly exportou = signal(false);

  exportar() {
    if (this.exportando()) return;
    this.exportando.set(true);
    this.erro.set('');

    this.conta.exportar().subscribe({
      next: (arquivo) => {
        baixarArquivo(arquivo, `gestao-fisio-dados-${formatarDataISO()}.zip`);
        this.exportando.set(false);
        this.exportou.set(true);
      },
      error: (erro: HttpErrorResponse) => {
        this.exportando.set(false);
        this.erro.set(
          erro.status === 429
            ? 'Você já exportou várias vezes na última hora. Tente de novo mais tarde.'
            : 'Não foi possível gerar a exportação. Tente novamente.'
        );
      },
    });
  }
}
