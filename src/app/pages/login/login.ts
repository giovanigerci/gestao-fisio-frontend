import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(Auth);
  private router = inject(Router);

  username = signal('');
  password = signal('');
  erro = signal('');

  entrar() {
    this.authService.login(this.username(), this.password()).subscribe({
      next: (resposta: { access: string; refresh: string }) => {
        this.authService.salvarTokens(resposta.access, resposta.refresh);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.erro.set('Usuário ou senha inválidos.');
      },
    });
  }
}
