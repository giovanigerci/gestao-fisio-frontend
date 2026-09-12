import { Component, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { PerfilService, Perfil } from '../../services/perfil.service';
import { AuthService } from '../../services/auth.service';
import { TelefoneMaskDirective } from '../../shared/directives/telefone-mask.directive';
import { tratarErrosApi, temErro, mensagensErro } from '../../shared/utils/form-errors';

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
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});
  erroFoto = signal('');
  sucesso = signal('');
  uploadingFoto = signal(false);
  removendoFoto = signal(false);

  // Trocar senha
  mostrarTrocarSenha = signal(false);
  senhaAtual = signal('');
  novaSenha = signal('');
  confirmarSenha = signal('');
  salvandoSenha = signal(false);
  errosSenha = signal<Record<string, string[]>>({});
  erroGeralSenha = signal('');
  sucessoSenha = signal('');
  mostrarSenhaAtual = signal(false);
  mostrarNovaSenha = signal(false);
  mostrarConfirmarSenha = signal(false);

  constructor() {
    // Garante que o perfil seja carregado (idempotente — se já carregou, não faz nada)
    this.perfilService.carregar().subscribe();

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
    this.erros.set({});
    this.erroGeral.set('');
    this.sucesso.set('');
    this.salvando.set(true);

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
        tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao salvar perfil.');
      },
    });
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }

  temErroSenha(campo: string): boolean {
    return temErro(this.errosSenha(), campo);
  }

  mensagensErroSenha(campo: string): string[] {
    return mensagensErro(this.errosSenha(), campo);
  }

  toggleTrocarSenha() {
    this.mostrarTrocarSenha.update(v => !v);
    if (!this.mostrarTrocarSenha()) {
      // Limpa campos ao fechar
      this.senhaAtual.set('');
      this.novaSenha.set('');
      this.confirmarSenha.set('');
      this.errosSenha.set({});
      this.erroGeralSenha.set('');
      this.sucessoSenha.set('');
    }
  }

  trocarSenha() {
    this.errosSenha.set({});
    this.erroGeralSenha.set('');
    this.sucessoSenha.set('');

    if (!this.senhaAtual().trim() || !this.novaSenha().trim() || !this.confirmarSenha().trim()) {
      this.erroGeralSenha.set('Preencha todos os campos.');
      return;
    }

    this.salvandoSenha.set(true);

    this.auth.trocarSenha(this.senhaAtual(), this.novaSenha(), this.confirmarSenha()).subscribe({
      next: () => {
        this.salvandoSenha.set(false);
        this.sucessoSenha.set('Senha alterada com sucesso!');
        this.senhaAtual.set('');
        this.novaSenha.set('');
        this.confirmarSenha.set('');
        setTimeout(() => this.sucessoSenha.set(''), 3000);
      },
      error: (err) => {
        this.salvandoSenha.set(false);
        tratarErrosApi(err, this.errosSenha, this.erroGeralSenha, 'Erro ao alterar senha.');
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

