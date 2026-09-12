import { Component, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { tratarErrosApi, temErro, mensagensErro } from '../../shared/utils/form-errors';

@Component({
  selector: 'app-redefinir-senha',
  imports: [RouterLink],
  templateUrl: './redefinir-senha.html',
  styleUrl: './redefinir-senha.css',
  encapsulation: ViewEncapsulation.None,
})
export class RedefinirSenha implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  uid = signal('');
  token = signal('');
  novaSenha = signal('');
  confirmarSenha = signal('');
  
  mostrarNovaSenha = signal(false);
  mostrarConfirmarSenha = signal(false);

  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});
  carregando = signal(false);
  
  tokenInvalido = signal(false);

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const uidParam = params.get('uid');
    const tokenParam = params.get('token');

    if (!uidParam || !tokenParam) {
      this.tokenInvalido.set(true);
      this.erroGeral.set('Link inválido ou incompleto. Solicite um novo link de recuperação.');
    } else {
      this.uid.set(uidParam);
      this.token.set(tokenParam);
    }
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }

  redefinir() {
    this.erros.set({});
    this.erroGeral.set('');

    if (this.tokenInvalido()) return;

    if (!this.novaSenha().trim() || !this.confirmarSenha().trim()) {
      this.erroGeral.set('Preencha as senhas.');
      return;
    }

    this.carregando.set(true);

    this.authService.redefinirSenha(this.uid(), this.token(), this.novaSenha(), this.confirmarSenha()).subscribe({
      next: () => {
        // Redireciona com mensagem de sucesso
        this.router.navigate(['/login'], { queryParams: { mensagem: 'senha-redefinida' } });
      },
      error: (err) => {
        this.carregando.set(false);
        tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao redefinir senha. O link pode ter expirado.');
        
        // Se foi erro geral (não de campo), possivelmente token expirou
        if (err.status === 400 && err.error?.detail) {
          this.tokenInvalido.set(true);
        }
      },
    });
  }
}
