import { Component, inject, signal, ViewEncapsulation } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { TelefoneMaskDirective } from '../../shared/directives/telefone-mask.directive';

@Component({
  selector: 'app-registrar',
  imports: [RouterLink, TelefoneMaskDirective],
  templateUrl: './registrar.html',
  styleUrl: './registrar.css',
  encapsulation: ViewEncapsulation.None,
})
export class Registrar {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = signal('');
  password = signal('');
  telefone = signal('');
  especialidade = signal('');
  crefito = signal('');

  erros = signal<Record<string, string[]>>({});
  erroGeral = signal('');
  carregando = signal(false);
  mostrarSenha = signal(false);

  registrar() {
    this.erros.set({});
    this.erroGeral.set('');

    const dados = {
      username: this.username().trim(),
      password: this.password().trim(),
      telefone: this.telefone().trim(),
      especialidade: this.especialidade().trim(),
      crefito: this.crefito().trim(),
    };

    // Validação local: todos obrigatórios
    const errosLocal: Record<string, string[]> = {};
    if (!dados.username) errosLocal['username'] = ['Este campo é obrigatório.'];
    if (!dados.password) errosLocal['password'] = ['Este campo é obrigatório.'];
    if (!dados.telefone) errosLocal['telefone'] = ['Este campo é obrigatório.'];
    if (!dados.especialidade) errosLocal['especialidade'] = ['Este campo é obrigatório.'];
    if (!dados.crefito) errosLocal['crefito'] = ['Este campo é obrigatório.'];

    if (Object.keys(errosLocal).length > 0) {
      this.erros.set(errosLocal);
      return;
    }

    this.carregando.set(true);

    this.authService.registrar(dados).subscribe({
      next: () => {
        // Registro OK → login automático
        this.authService.login(dados.username, dados.password).subscribe({
          next: () => {
            this.router.navigate(['/agenda']);
          },
          error: () => {
            // Login automático falhou → redirecionar para login com mensagem
            this.router.navigate(['/login'], {
              queryParams: {
                mensagem: 'conta-criada',
                username: dados.username,
              },
            });
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);

        if (err.status === 400 && err.error && typeof err.error === 'object') {
          this.erros.set(err.error);
        } else {
          this.erroGeral.set('Erro ao criar conta. Tente novamente.');
        }
      },
    });
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
