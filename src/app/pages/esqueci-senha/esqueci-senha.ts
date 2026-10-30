import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-esqueci-senha',
  imports: [RouterLink],
  templateUrl: './esqueci-senha.html',
  styleUrl: './esqueci-senha.css',
  encapsulation: ViewEncapsulation.None,
})
export class EsqueciSenha {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  erro = signal('');
  carregando = signal(false);
  sucesso = signal(false);

  enviar() {
    this.erro.set('');

    if (!this.email().trim()) {
      this.erro.set('Preencha seu e-mail.');
      return;
    }

    this.carregando.set(true);

    this.authService.solicitarResetSenha(this.email()).subscribe({
      next: () => {
        this.carregando.set(false);
        this.sucesso.set(true);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.');
      },
    });
  }
}
