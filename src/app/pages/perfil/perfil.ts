import { Component, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { PerfilService, Perfil } from '../../services/perfil.service';
import { AuthService } from '../../services/auth.service';
import { TelefoneMaskDirective } from '../../shared/directives/telefone-mask.directive';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { ComAlteracoesPendentes } from '../../guards/alteracoes-pendentes-guard';
import { tratarErrosApi, temErro, mensagensErro } from '../../shared/utils/form-errors';

const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

interface Confirmacao {
  titulo: string;
  mensagem: string;
  confirmarLabel: string;
}

@Component({
  selector: 'app-perfil',
  imports: [TelefoneMaskDirective, ConfirmModal],
  templateUrl: './perfil.html',
  styleUrls: ['../../../styles/form-page.css', './perfil.css'],
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class PerfilPage implements ComAlteracoesPendentes {
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

  // Foto: só é enviada/removida no backend ao clicar em "Salvar"
  fotoPendente = signal<File | null>(null);
  previewFoto = signal<string | null>(null);
  remocaoPendente = signal(false);

  // UI state
  salvando = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});
  erroFoto = signal('');
  sucesso = signal('');
  processandoFoto = signal(false);

  // Modal de confirmação (descartar alterações / sair sem salvar)
  confirmacao = signal<Confirmacao | null>(null);
  private resolverConfirmacao: ((confirmado: boolean) => void) | null = null;

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

  readonly camposAlterados = computed(() => {
    const perfil = this.perfilService.perfil();
    if (!perfil) return false;
    const diferente = (atual: string, original: string | null) => atual.trim() !== (original ?? '').trim();
    const digitos = (valor: string | null) => (valor ?? '').replace(/\D/g, '');
    return (
      diferente(this.firstName(), perfil.first_name) ||
      diferente(this.lastName(), perfil.last_name) ||
      diferente(this.email(), perfil.email) ||
      digitos(this.telefone()) !== digitos(perfil.telefone) ||
      diferente(this.especialidade(), perfil.especialidade) ||
      diferente(this.crefito(), perfil.crefito)
    );
  });

  readonly temAlteracoesPendentes = computed(
    () =>
      !!this.perfilService.perfil() &&
      (this.camposAlterados() || !!this.fotoPendente() || this.remocaoPendente())
  );

  readonly fotoExibida = computed(() => this.previewFoto() ?? this.perfilService.perfil()?.foto ?? null);

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

    inject(DestroyRef).onDestroy(() => {
      this.revogarPreview();
      this.responderConfirmacao(false);
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
    if (this.salvando()) return;

    this.erros.set({});
    this.erroGeral.set('');
    this.erroFoto.set('');
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
      next: () => this.salvarFoto(),
      error: (err) => {
        this.salvando.set(false);
        tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao salvar perfil.');
      },
    });
  }

  private salvarFoto() {
    const foto = this.fotoPendente();
    let operacao$: Observable<unknown> | null = null;
    if (foto) {
      operacao$ = this.perfilService.uploadFoto(foto);
    } else if (this.remocaoPendente()) {
      operacao$ = this.perfilService.removerFoto();
    }

    if (!operacao$) {
      this.concluirSalvamento();
      return;
    }

    this.processandoFoto.set(true);
    operacao$.subscribe({
      next: () => {
        this.processandoFoto.set(false);
        this.descartarFotoPendente();
        this.remocaoPendente.set(false);
        this.concluirSalvamento();
      },
      error: (err) => {
        this.processandoFoto.set(false);
        this.salvando.set(false);
        const acao = foto ? 'enviar a foto' : 'remover a foto';
        const motivo = this.extrairErroFoto(err) ?? 'Tente novamente.';
        this.erroFoto.set(`Os dados do perfil foram salvos, mas não foi possível ${acao}. ${motivo}`);
      },
    });
  }

  private concluirSalvamento() {
    this.salvando.set(false);
    this.sucesso.set('Perfil atualizado com sucesso!');
    setTimeout(() => this.sucesso.set(''), 3000);
  }

  private extrairErroFoto(err: any): string | null {
    const foto = err?.error?.foto;
    if (!foto) return null;
    return Array.isArray(foto) ? foto.join(' ') : String(foto);
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
    input.value = '';
    if (!arquivo) return;

    if (!TIPOS_FOTO_PERMITIDOS.includes(arquivo.type)) {
      this.erroFoto.set('Formato não suportado. Envie uma imagem JPEG, PNG ou WEBP.');
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
      this.erroFoto.set('A imagem deve ter no máximo 5 MB.');
      return;
    }

    this.erroFoto.set('');
    this.revogarPreview();
    this.fotoPendente.set(arquivo);
    this.previewFoto.set(URL.createObjectURL(arquivo));
    this.remocaoPendente.set(false);
  }

  removerFoto() {
    this.erroFoto.set('');
    if (this.fotoPendente()) {
      this.descartarFotoPendente();
      return;
    }
    if (this.perfilService.perfil()?.foto) {
      this.remocaoPendente.set(true);
    }
  }

  desfazerRemocao() {
    this.remocaoPendente.set(false);
  }

  private descartarFotoPendente() {
    this.revogarPreview();
    this.fotoPendente.set(null);
  }

  private revogarPreview() {
    const url = this.previewFoto();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewFoto.set(null);
    }
  }

  private descartarAlteracoes() {
    const perfil = this.perfilService.perfil();
    if (perfil) {
      this.preencherCampos(perfil);
    }
    this.descartarFotoPendente();
    this.remocaoPendente.set(false);
    this.erros.set({});
    this.erroGeral.set('');
    this.erroFoto.set('');
  }

  private pedirConfirmacao(confirmacao: Confirmacao): Promise<boolean> {
    this.responderConfirmacao(false);
    this.confirmacao.set(confirmacao);
    return new Promise((resolve) => (this.resolverConfirmacao = resolve));
  }

  responderConfirmacao(confirmado: boolean) {
    const resolver = this.resolverConfirmacao;
    this.resolverConfirmacao = null;
    this.confirmacao.set(null);
    resolver?.(confirmado);
  }

  confirmarSaida(): boolean | Promise<boolean> {
    if (!this.temAlteracoesPendentes()) return true;

    return this.pedirConfirmacao({
      titulo: 'Sair sem salvar?',
      mensagem: 'Você tem alterações não salvas. Deseja sair e descartá-las?',
      confirmarLabel: 'Sair sem salvar',
    }).then((confirmado) => {
      if (confirmado) this.descartarAlteracoes();
      return confirmado;
    });
  }

  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.temAlteracoesPendentes()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  voltar() {
    this.router.navigate(['/agenda']);
  }

  async cancelar() {
    if (!this.temAlteracoesPendentes()) {
      this.router.navigate(['/agenda']);
      return;
    }

    const confirmado = await this.pedirConfirmacao({
      titulo: 'Descartar alterações?',
      mensagem: 'Você tem alterações não salvas. Deseja descartá-las?',
      confirmarLabel: 'Descartar',
    });
    if (confirmado) {
      this.descartarAlteracoes();
    }
  }

  async sair() {
    // O logout limpa o perfil, o que desarmaria o guard — então pergunta antes
    if (this.temAlteracoesPendentes()) {
      const confirmado = await this.pedirConfirmacao({
        titulo: 'Sair sem salvar?',
        mensagem: 'Você tem alterações não salvas no perfil. Deseja sair da conta mesmo assim?',
        confirmarLabel: 'Sair da conta',
      });
      if (!confirmado) return;
      this.descartarAlteracoes();
    }

    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
