import { Component, DestroyRef, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, DadosCadastro } from '../../services/auth.service';
import { TelefoneMaskDirective } from '../../shared/directives/telefone-mask.directive';
import { RequisitosSenha } from '../../shared/components/requisitos-senha/requisitos-senha';
import { limparErro } from '../../shared/utils/form-errors';

const INTERVALO_REENVIO_SEGUNDOS = 60;

export function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return email;
  return `${usuario.charAt(0)}***@${dominio}`;
}

@Component({
  selector: 'app-registrar',
  imports: [RouterLink, TelefoneMaskDirective, RequisitosSenha],
  templateUrl: './registrar.html',
  styleUrl: './registrar.css',
  encapsulation: ViewEncapsulation.None,
})
export class Registrar {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = signal('');
  email = signal('');
  password = signal('');
  telefone = signal('');
  especialidade = signal('');
  crefito = signal('');

  etapa = signal<'dados' | 'codigo'>('dados');
  codigo = signal('');
  segundosParaReenvio = signal(0);
  reenviado = signal(false);
  readonly emailMascarado = computed(() => mascararEmail(this.email().trim().toLowerCase()));

  erros = signal<Record<string, string[]>>({});
  erroGeral = signal('');
  carregando = signal(false);
  mostrarSenha = signal(false);

  private contagem?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pararContagem());
  }

  private dados(): DadosCadastro {
    return {
      username: this.username().trim(),
      email: this.email().trim(),
      password: this.password().trim(),
      telefone: this.telefone().trim(),
      especialidade: this.especialidade().trim(),
      crefito: this.crefito().trim(),
    };
  }

  enviarCodigo() {
    this.erros.set({});
    this.erroGeral.set('');
    const dados = this.dados();

    const errosLocal: Record<string, string[]> = {};
    for (const [campo, valor] of Object.entries(dados)) {
      if (!valor) errosLocal[campo] = ['Este campo é obrigatório.'];
    }
    if (Object.keys(errosLocal).length > 0) {
      this.erros.set(errosLocal);
      return;
    }

    this.carregando.set(true);
    this.authService.enviarCodigoCadastro(dados).subscribe({
      next: () => {
        this.carregando.set(false);
        this.codigo.set('');
        this.etapa.set('codigo');
        this.iniciarContagem(INTERVALO_REENVIO_SEGUNDOS);
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        this.tratarErro(err, 'Não foi possível enviar o código. Tente novamente.');
      },
    });
  }

  reenviarCodigo() {
    if (this.segundosParaReenvio() > 0 || this.carregando()) return;
    this.reenviado.set(false);
    this.erroGeral.set('');
    this.carregando.set(true);

    this.authService.enviarCodigoCadastro(this.dados()).subscribe({
      next: () => {
        this.carregando.set(false);
        this.reenviado.set(true);
        this.codigo.set('');
        this.erros.set({});
        this.iniciarContagem(INTERVALO_REENVIO_SEGUNDOS);
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        this.tratarErro(err, 'Não foi possível reenviar o código. Tente novamente.');
      },
    });
  }

  confirmarCodigo() {
    this.erros.set({});
    this.erroGeral.set('');
    this.reenviado.set(false);

    if (!/^\d{6}$/.test(this.codigo())) {
      this.erros.set({ codigo: ['Digite os 6 dígitos do código.'] });
      return;
    }

    const dados = this.dados();
    this.carregando.set(true);
    this.authService.registrar({ ...dados, codigo: this.codigo() }).subscribe({
      next: () => {
        this.authService.login(dados.username, dados.password).subscribe({
          next: () => this.router.navigate(['/agenda']),
          error: () => {
            this.router.navigate(['/login'], {
              queryParams: { mensagem: 'conta-criada', username: dados.username },
            });
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        this.tratarErro(err, 'Erro ao criar conta. Tente novamente.');
      },
    });
  }

  voltarParaDados() {
    this.etapa.set('dados');
    this.codigo.set('');
    this.erros.set({});
    this.erroGeral.set('');
    this.reenviado.set(false);
  }

  onCodigoDigitado(event: Event) {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = digitos;
    this.codigo.set(digitos);
  }

  private tratarErro(err: HttpErrorResponse, mensagemPadrao: string) {
    const corpo = err.error && typeof err.error === 'object' ? err.error : null;

    if (err.status === 400 && corpo) {
      this.erros.set(corpo);
      const camposDoFormulario = Object.keys(corpo).filter((campo) => campo !== 'codigo');
      if (this.etapa() === 'codigo' && camposDoFormulario.length > 0) {
        this.etapa.set('dados');
      }
      return;
    }

    if (err.status === 429 && corpo?.aguardar_segundos) {
      this.iniciarContagem(corpo.aguardar_segundos);
    }
    this.erroGeral.set(corpo?.detail ?? mensagemPadrao);
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

  aoDigitarSenha(valor: string) {
    this.password.set(valor);
    limparErro(this.erros, 'password');
  }

  alternarVisibilidadeSenha() {
    this.mostrarSenha.update((v) => !v);
  }

  temErro(campo: string): boolean {
    return !!(this.erros()[campo] && this.erros()[campo].length > 0);
  }

  mensagensErro(campo: string): string[] {
    return this.erros()[campo] || [];
  }
}
