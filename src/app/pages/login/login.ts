import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  encapsulation: ViewEncapsulation.None,
})
export class Login {
  private authService = inject(Auth);
  private router = inject(Router);

  username = signal('');
  password = signal('');
  erro = signal('');
  carregando = signal(false);
  mostrarSenha = signal(false);

  entrar() {
    this.erro.set('');

    if (!this.username().trim() || !this.password().trim()) {
      this.erro.set('Preencha todos os campos.');
      return;
    }

    this.carregando.set(true);

    this.authService.login(this.username(), this.password()).subscribe({
      next: () => {
        this.router.navigate(['/agenda']);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Usuário ou senha inválidos.');
      },
    });
  }

  alternarVisibilidadeSenha() {
    this.mostrarSenha.update((v) => !v);
  }
}
