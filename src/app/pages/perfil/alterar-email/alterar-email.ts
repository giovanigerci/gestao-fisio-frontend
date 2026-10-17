import { Component, DestroyRef, ElementRef, Injector, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PerfilService } from '../../../services/perfil.service';
import { Modal } from '../../../shared/components/modal/modal';
import { focarPrimeiroCampoComErro, limparErro, mensagensErro, temErro, tratarErrosApi } from '../../../shared/utils/form-errors';

const INTERVALO_REENVIO_S = 60;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Modal "Alterar e-mail" do Perfil: o novo endereço só vale depois de confirmado pelo código enviado a ele. */
@Component({
  selector: 'app-alterar-email',
  imports: [Modal],
  templateUrl: './alterar-email.html',
  styleUrls: ['../../../../styles/form-page.css', '../../../../styles/modal-form.css', './alterar-email.css'],
})
export class AlterarEmail {
  private perfilService = inject(PerfilService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  readonly emailAtual = input('');
  readonly fechar = output<void>();
  readonly alterado = output<void>();

  etapa = signal<'email' | 'codigo'>('email');
  novoEmail = signal('');
  senhaAtual = signal('');
  codigo = signal('');
  enviando = signal(false);
  reenviado = signal(false);
  segundosParaReenvio = signal(0);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});
  private contagem?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pararContagem());
  }

  digitar(campo: 'email' | 'senha_atual', valor: string) {
    (campo === 'email' ? this.novoEmail : this.senhaAtual).set(valor);
    limparErro(this.erros, campo);
  }

  digitarCodigo(valor: string) {
    this.codigo.set(valor.replace(/\D/g, '').slice(0, 6));
    limparErro(this.erros, 'codigo');
  }

  enviarCodigo() {
    if (this.enviando()) return;
    this.erroGeral.set('');
    const erros: Record<string, string[]> = {};
    if (!EMAIL_VALIDO.test(this.novoEmail().trim())) erros['email'] = ['Informe um e-mail válido.'];
    if (!this.senhaAtual()) erros['senha_atual'] = ['Informe a senha atual.'];
    this.erros.set(erros);
    if (Object.keys(erros).length) {
      focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      return;
    }
    this.solicitar(() => {
      this.etapa.set('codigo');
      this.codigo.set('');
      this.reenviado.set(false);
    });
  }

  reenviarCodigo() {
    if (this.enviando() || this.segundosParaReenvio() > 0) return;
    this.solicitar(() => {
      this.codigo.set('');
      this.reenviado.set(true);
    });
  }

  private solicitar(depois: () => void) {
    this.enviando.set(true);
    this.perfilService.solicitarTrocaDeEmail(this.novoEmail().trim(), this.senhaAtual()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.erros.set({});
        this.iniciarContagem(INTERVALO_REENVIO_S);
        depois();
      },
      error: (erro) => this.tratarErro(erro, 'Não foi possível enviar o código. Tente novamente.'),
    });
  }

  confirmar() {
    if (this.enviando()) return;
    this.erroGeral.set('');
    if (!/^\d{6}$/.test(this.codigo())) {
      this.erros.set({ codigo: ['Digite os 6 dígitos do código.'] });
      focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      return;
    }
    this.enviando.set(true);
    this.perfilService.confirmarTrocaDeEmail(this.novoEmail().trim(), this.codigo()).subscribe({
      next: () => this.alterado.emit(),
      error: (erro) => this.tratarErro(erro, 'Não foi possível confirmar o código. Tente novamente.'),
    });
  }

  usarOutroEmail() {
    this.etapa.set('email');
    this.codigo.set('');
    this.erros.set({});
    this.erroGeral.set('');
  }

  aoFechar() {
    if (!this.enviando()) this.fechar.emit();
  }

  private tratarErro(erro: HttpErrorResponse, mensagemPadrao: string) {
    this.enviando.set(false);
    if (erro.status === 429 && erro.error?.aguardar_segundos) {
      this.iniciarContagem(erro.error.aguardar_segundos);
      this.erros.set({});
      this.erroGeral.set(erro.error.detail);
      return;
    }
    tratarErrosApi(erro, this.erros, this.erroGeral, mensagemPadrao);
    // Erro no e-mail ou na senha (ex.: alguém usou o e-mail nesse meio-tempo) volta para o 1º passo
    if (this.etapa() === 'codigo' && (this.temErro('email') || this.temErro('senha_atual'))) {
      this.etapa.set('email');
    }
    focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
  }

  private iniciarContagem(segundos: number) {
    this.pararContagem();
    this.segundosParaReenvio.set(segundos);
    this.contagem = setInterval(() => {
      const restante = this.segundosParaReenvio() - 1;
      this.segundosParaReenvio.set(Math.max(0, restante));
      if (restante <= 0) this.pararContagem();
    }, 1000);
  }

  private pararContagem() {
    if (this.contagem) {
      clearInterval(this.contagem);
      this.contagem = undefined;
    }
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }
}
