import { Component, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { PerfilService, Perfil } from '../../services/perfil.service';
import { AuthService } from '../../services/auth.service';
import { TelefoneMaskDirective } from '../../shared/directives/telefone-mask.directive';

@Component({
  selector: 'app-perfil',
  imports: [TelefoneMaskDirective],
  templateUrl: './perfil.html',
  styleUrls: ['../../../styles/form-page.css', './perfil.css'],
})
export class PerfilPage {
  private router = inject(Router);
  readonly perfilService = inject(PerfilService);
  private auth = inject(AuthService);

  // Form fields
  firstName = signal('');
  lastName = signal('');
  email = signal('');
  telefone = signal('');
  especialidade = signal('');
  crefito = signal('');
  username = signal('');

  // UI state
  salvando = signal(false);
  erro = signal('');
  erroCrefito = signal('');
  sucesso = signal('');
  uploadingFoto = signal(false);
  removendoFoto = signal(false);
  erroFoto = signal('');

  constructor() {
    // Garante que o perfil seja carregado (idempotente — se já carregou, não faz nada)
    this.perfilService.carregar();

    // Preenche os campos quando o perfil estiver disponível
    effect(() => {
      const perfil = this.perfilService.perfil();
      if (perfil) {
        this.preencherCampos(perfil);
      }
    });
  }

  private preencherCampos(perfil: Perfil) {
    this.firstName.set(perfil.first_name);
    this.lastName.set(perfil.last_name);
    this.email.set(perfil.email);
    this.telefone.set(perfil.telefone);
    this.especialidade.set(perfil.especialidade);
    this.crefito.set(perfil.crefito);
    this.username.set(perfil.username);
  }

  salvar() {
    this.salvando.set(true);
    this.erro.set('');
    this.erroCrefito.set('');
    this.sucesso.set('');

    const dados: Partial<Perfil> = {
      first_name: this.firstName().trim(),
      last_name: this.lastName().trim(),
      email: this.email().trim(),
      telefone: this.telefone().trim(),
      especialidade: this.especialidade().trim(),
      crefito: this.crefito().trim(),
    };

    this.perfilService.atualizar(dados).subscribe({
      next: () => {
        this.salvando.set(false);
        this.sucesso.set('Perfil atualizado com sucesso!');
        setTimeout(() => this.sucesso.set(''), 3000);
      },
      error: (err) => {
        this.salvando.set(false);
        if (err.status === 400 && err.error && typeof err.error === 'object') {
          // Erro específico de CREFITO duplicado
          if (err.error.crefito) {
            const msg = Array.isArray(err.error.crefito)
              ? err.error.crefito.join(', ')
              : err.error.crefito;
            this.erroCrefito.set(msg);
          }
          // Outros erros de campo
          const outrosErros = Object.entries(err.error)
            .filter(([campo]) => campo !== 'crefito')
            .map(([campo, msgs]) => {
              const label = campo.replace('_', ' ');
              return `${label}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`;
            })
            .join(' | ');
          if (outrosErros) {
            this.erro.set(outrosErros);
          }
        } else {
          this.erro.set('Erro ao salvar perfil. Tente novamente.');
        }
      },
    });
  }

  onFotoSelecionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    // Validação do tipo
    if (!arquivo.type.startsWith('image/')) {
      this.erroFoto.set('O arquivo selecionado não é uma imagem válida.');
      input.value = '';
      return;
    }

    // Validação de tamanho (5MB)
    if (arquivo.size > 5 * 1024 * 1024) {
      this.erroFoto.set('A imagem deve ter no máximo 5 MB.');
      input.value = '';
      return;
    }

    this.erroFoto.set('');
    this.uploadingFoto.set(true);

    this.perfilService.uploadFoto(arquivo).subscribe({
      next: () => {
        this.uploadingFoto.set(false);
        input.value = '';
      },
      error: (err) => {
        this.uploadingFoto.set(false);
        input.value = '';
        if (err.error?.foto) {
          this.erroFoto.set(
            Array.isArray(err.error.foto) ? err.error.foto.join(', ') : err.error.foto
          );
        } else {
          this.erroFoto.set('Erro ao enviar a foto. Tente novamente.');
        }
      },
    });
  }

  removerFoto() {
    this.erroFoto.set('');
    this.removendoFoto.set(true);

    this.perfilService.removerFoto().subscribe({
      next: () => {
        this.removendoFoto.set(false);
      },
      error: () => {
        this.removendoFoto.set(false);
        this.erroFoto.set('Erro ao remover a foto. Tente novamente.');
      },
    });
  }

  cancelar() {
    this.router.navigate(['/agenda']);
  }

  sair() {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
