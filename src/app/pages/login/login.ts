import { Component, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MENSAGEM_MUITAS_TENTATIVAS } from '../../shared/utils/form-errors';

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
    } else if (params.get('mensagem') === 'senha-redefinida') {
      this.mensagemSucesso.set('Senha redefinida com sucesso! Faça login com a nova senha.');
    } else if (params.get('mensagem') === 'conta-excluida') {
      this.mensagemSucesso.set('Sua conta foi excluída e todos os dados foram apagados.');
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
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(erro.status === 429 ? MENSAGEM_MUITAS_TENTATIVAS : 'Usuário ou senha inválidos.');
      },
    });
  }

  alternarVisibilidadeSenha() {
    this.mostrarSenha.update((v) => !v);
  }
}
