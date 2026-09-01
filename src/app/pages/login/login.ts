import { Component, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';

import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  encapsulation: ViewEncapsulation.None,
})
export class Login implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = signal('');
  password = signal('');
  manterConectado = signal(false);
  erro = signal('');
  carregando = signal(false);
  mostrarSenha = signal(false);
  mensagemSucesso = signal('');

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;

    if (params.get('mensagem') === 'conta-criada') {
      this.mensagemSucesso.set('Conta criada com sucesso! Faça login para continuar.');
    }

    const usernameParam = params.get('username');
    if (usernameParam) {
      this.username.set(usernameParam);
    }
  }

  entrar() {
    this.erro.set('');
    this.mensagemSucesso.set('');

    if (!this.username().trim() || !this.password().trim()) {
      this.erro.set('Preencha todos os campos.');
      return;
    }

    this.carregando.set(true);

    this.authService.login(this.username(), this.password(), this.manterConectado()).subscribe({
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
