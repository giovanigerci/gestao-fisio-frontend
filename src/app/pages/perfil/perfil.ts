import { Component, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { PerfilService, Perfil } from '../../services/perfil.service';
import { AuthService } from '../../services/auth.service';
import { ContaService, ResumoDosDados } from '../../services/conta.service';
import { ExportacaoDados } from '../../services/exportacao-dados.service';
import { TelefoneMaskDirective } from '../../shared/directives/telefone-mask.directive';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { ComAlteracoesPendentes } from '../../guards/alteracoes-pendentes-guard';
import { tratarErrosApi, temErro, mensagensErro } from '../../shared/utils/form-errors';
import { AlterarEmail } from './alterar-email/alterar-email';
import { AlterarSenha } from './alterar-senha/alterar-senha';
import { ExcluirConta } from './excluir-conta/excluir-conta';

type DadosEditaveis = Pick<Perfil, 'first_name' | 'last_name' | 'telefone' | 'especialidade' | 'crefito' | 'username'>;

const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;
const DURACAO_AVISO_MS = 4000;

interface Confirmacao {
  titulo: string;
  mensagem: string;
  confirmarLabel: string;
}

@Component({
  selector: 'app-perfil',
  imports: [TelefoneMaskDirective, ConfirmModal, AlterarEmail, AlterarSenha, ExcluirConta],
  templateUrl: './perfil.html',
  styleUrls: ['../../../styles/form-page.css', '../../../styles/modal-form.css', './perfil.css'],
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class PerfilPage implements ComAlteracoesPendentes {
  private router = inject(Router);
  readonly perfilService = inject(PerfilService);
  private auth = inject(AuthService);
  private conta = inject(ContaService);
  readonly exportacao = inject(ExportacaoDados);

  firstName = signal('');
  lastName = signal('');
  telefone = signal('');
  especialidade = signal('');
  crefito = signal('');
  username = signal('');

  // Foto: só é enviada/removida no backend ao clicar em "Salvar"
  fotoPendente = signal<File | null>(null);
  previewFoto = signal<string | null>(null);
  remocaoPendente = signal(false);

  salvando = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});
  erroFoto = signal('');
  processandoFoto = signal(false);

  /** Números da conta no cabeçalho (clínicas, pacientes, sessões); null enquanto carrega ou se falhar. */
  resumo = signal<ResumoDosDados | null>(null);
  /** Aviso flutuante de sucesso ("Perfil atualizado", "Senha alterada"), some sozinho. */
  aviso = signal('');
  private temporizadorAviso: ReturnType<typeof setTimeout> | null = null;
  alterandoSenha = signal(false);
  alterandoEmail = signal(false);

  confirmacao = signal<Confirmacao | null>(null);
  private resolverConfirmacao: ((confirmado: boolean) => void) | null = null;

  readonly camposAlterados = computed(() => {
    const perfil = this.perfilService.perfil();
    if (!perfil) return false;
    const diferente = (atual: string, original: string | null) => atual.trim() !== (original ?? '').trim();
    const digitos = (valor: string | null) => (valor ?? '').replace(/\D/g, '');
    return (
      diferente(this.firstName(), perfil.first_name) ||
      diferente(this.lastName(), perfil.last_name) ||
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

  /** Só os dados do formulário: trocar o e-mail ou a foto não recarrega os campos (e não apaga edições não salvas). */
  private readonly dadosEditaveis = computed<DadosEditaveis | null>(
    () => {
      const perfil = this.perfilService.perfil();
      if (!perfil) return null;
      const { first_name, last_name, telefone, especialidade, crefito, username } = perfil;
      return { first_name, last_name, telefone, especialidade, crefito, username };
    },
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );

  constructor() {
    // Garante que o perfil seja carregado (idempotente — se já carregou, não faz nada)
    this.perfilService.carregar().subscribe();
    this.conta.resumo().subscribe({
      next: (resumo) => this.resumo.set(resumo),
      error: () => this.resumo.set(null), // a faixa de números só não aparece
    });

    effect(() => {
      const dados = this.dadosEditaveis();
      if (dados) {
        this.preencherCampos(dados);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.revogarPreview();
      this.responderConfirmacao(false);
      if (this.temporizadorAviso) clearTimeout(this.temporizadorAviso);
    });
  }

  private preencherCampos(perfil: DadosEditaveis) {
    this.firstName.set(perfil.first_name);
    this.lastName.set(perfil.last_name);
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
    this.salvando.set(true);

    const dados: Partial<Perfil> = {
      first_name: this.firstName().trim(),
      last_name: this.lastName().trim(),
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
    this.mostrarAviso('Perfil atualizado');
  }

  private mostrarAviso(mensagem: string) {
    if (this.temporizadorAviso) clearTimeout(this.temporizadorAviso);
    this.aviso.set(mensagem);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(''), DURACAO_AVISO_MS);
  }

  aoAlterarSenha() {
    this.alterandoSenha.set(false);
    this.mostrarAviso('Senha alterada');
  }

  aoAlterarEmail() {
    this.alterandoEmail.set(false);
    this.mostrarAviso('E-mail alterado');
  }

  formatarNumero(valor: number): string {
    return valor.toLocaleString('pt-BR');
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

  /** "Descartar" da barra de alterações: pede confirmação e volta aos dados salvos. */
  async descartar() {
    if (!this.temAlteracoesPendentes()) return;

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

  /** Conta excluída no backend (cookies já apagados): limpa a sessão local e vai para o login. */
  aoExcluirConta() {
    this.descartarAlteracoes(); // nada a salvar: o guard de alterações pendentes não deve perguntar
    this.perfilService.limpar();
    this.router.navigate(['/login'], { queryParams: { mensagem: 'conta-excluida' } });
  }
}
