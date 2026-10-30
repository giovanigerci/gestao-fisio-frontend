import { Component, ElementRef, Injector, inject, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Modal } from '../../../shared/components/modal/modal';
import { RequisitosSenha } from '../../../shared/components/requisitos-senha/requisitos-senha';
import { focarPrimeiroCampoComErro, limparErro, mensagensErro, temErro, tratarErrosApi } from '../../../shared/utils/form-errors';

type CampoSenha = 'senha_atual' | 'nova_senha' | 'confirmar_senha';

@Component({
  selector: 'app-alterar-senha',
  imports: [Modal, RequisitosSenha, NgTemplateOutlet],
  templateUrl: './alterar-senha.html',
  styleUrls: ['../../../../styles/form-page.css', '../../../../styles/modal-form.css', './alterar-senha.css'],
})
export class AlterarSenha {
  private auth = inject(AuthService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  readonly fechar = output<void>();
  readonly alterada = output<void>();

  senhaAtual = signal('');
  novaSenha = signal('');
  confirmarSenha = signal('');
  salvando = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});
  readonly visivel = signal<Record<CampoSenha, boolean>>({ senha_atual: false, nova_senha: false, confirmar_senha: false });

  alternarVisibilidade(campo: CampoSenha) {
    this.visivel.update((v) => ({ ...v, [campo]: !v[campo] }));
  }

  digitar(campo: CampoSenha, valor: string) {
    const alvo = { senha_atual: this.senhaAtual, nova_senha: this.novaSenha, confirmar_senha: this.confirmarSenha }[campo];
    alvo.set(valor);
    limparErro(this.erros, campo);
  }

  private validar(): Record<string, string[]> {
    const erros: Record<string, string[]> = {};
    if (!this.senhaAtual()) erros['senha_atual'] = ['Informe a senha atual.'];
    if (!this.novaSenha()) erros['nova_senha'] = ['Informe a nova senha.'];
    if (!this.confirmarSenha()) {
      erros['confirmar_senha'] = ['Repita a nova senha.'];
    } else if (this.confirmarSenha() !== this.novaSenha()) {
      erros['confirmar_senha'] = ['As senhas não coincidem.'];
    }
    return erros;
  }

  salvar() {
    if (this.salvando()) return;
    this.erroGeral.set('');
    const errosLocais = this.validar();
    this.erros.set(errosLocais);
    if (Object.keys(errosLocais).length) {
      focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      return;
    }

    this.salvando.set(true);
    this.auth.trocarSenha(this.senhaAtual(), this.novaSenha(), this.confirmarSenha()).subscribe({
      next: () => this.alterada.emit(),
      error: (erro) => {
        this.salvando.set(false);
        tratarErrosApi(erro, this.erros, this.erroGeral, 'Erro ao alterar a senha. Tente novamente.');
        focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      },
    });
  }

  aoFechar() {
    if (!this.salvando()) this.fechar.emit();
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }
}
