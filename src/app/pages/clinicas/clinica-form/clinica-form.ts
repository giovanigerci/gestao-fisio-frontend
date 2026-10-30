import { Component, ElementRef, Injector, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClinicaService } from '../../../services/clinica.service';
import { ComAlteracoesPendentes } from '../../../guards/alteracoes-pendentes-guard';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { TelefoneMaskDirective } from '../../../shared/directives/telefone-mask.directive';
import { MoedaMaskDirective } from '../../../shared/directives/moeda-mask.directive';
import { corDaClinica, proximaCorDeClinica } from '../../../shared/utils/clinic-colors';
import { iniciais } from '../../../shared/utils/iniciais';
import { ControleDeSaida } from '../../../shared/utils/controle-de-saida';
import { focarPrimeiroCampoComErro, tratarErrosApi, temErro, mensagensErro } from '../../../shared/utils/form-errors';

@Component({
  selector: 'app-clinica-form',
  imports: [Modal, ConfirmModal, TelefoneMaskDirective, MoedaMaskDirective],
  templateUrl: './clinica-form.html',
  styleUrls: ['../../../../styles/form-page.css', '../../../../styles/modal-form.css'],
})
export class ClinicaForm implements ComAlteracoesPendentes {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);
  private clinicaService = inject(ClinicaService);

  modoEdicao = signal(false);
  clinicaId = signal<number | null>(null);
  carregando = signal(false);
  salvando = signal(false);
  excluindo = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});
  confirmandoExclusao = signal(false);

  nome = signal('');
  endereco = signal('');
  telefone = signal('');
  valorPorAtendimento = signal('');
  ativo = signal(true);
  /** Na edição, a cor salva; na criação, a que o backend vai escolher (só para a prévia). */
  cor = signal<number | null>(null);

  private readonly estadoInicial = signal('');
  private readonly estadoAtual = computed(() =>
    JSON.stringify([this.nome().trim(), this.endereco().trim(), this.telefone(), this.valorPorAtendimento(), this.ativo()])
  );
  readonly temAlteracoes = computed(() => this.estadoAtual() !== this.estadoInicial());
  readonly saida = new ControleDeSaida(
    () => this.temAlteracoes(),
    () => this.salvando() || this.confirmandoExclusao(),
  );

  readonly previaCor = computed(() => corDaClinica(this.cor()));
  readonly previaIniciais = computed(() => iniciais(this.nome()) || '?');
  readonly previaDetalhe = computed(() => {
    const partes = [this.endereco().trim()];
    if (this.valorPorAtendimento()) partes.push(`${this.formatarValor(this.valorPorAtendimento())} por atendimento`);
    return partes.filter(Boolean).join(' · ');
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicao.set(true);
      this.clinicaId.set(+id);
      this.carregarClinica(+id);
    } else {
      this.estadoInicial.set(this.estadoAtual());
      this.clinicaService.buscarOpcoes().subscribe({
        next: (clinicas) => this.cor.set(proximaCorDeClinica(clinicas.map((c) => c.cor))),
        error: () => this.cor.set(null), // a prévia fica neutra; não impede o cadastro
      });
    }
  }

  private carregarClinica(id: number) {
    this.carregando.set(true);
    this.clinicaService.buscarPorId(id).subscribe({
      next: (clinica) => {
        this.nome.set(clinica.nome);
        this.endereco.set(clinica.endereco);
        this.telefone.set(clinica.telefone ?? '');
        this.valorPorAtendimento.set(clinica.valor_por_atendimento);
        this.ativo.set(clinica.ativo);
        this.cor.set(clinica.cor ?? null);
        this.estadoInicial.set(this.estadoAtual());
        this.carregando.set(false);
      },
      error: () => {
        this.erroGeral.set('Erro ao carregar dados da clínica.');
        this.carregando.set(false);
      },
    });
  }

  salvar() {
    if (this.salvando()) return;
    this.erroGeral.set('');
    const errosLocais = this.validar();
    this.erros.set(errosLocais);
    if (Object.keys(errosLocais).length) {
      focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      return;
    }

    this.salvando.set(true);
    const dados = {
      nome: this.nome().trim(),
      endereco: this.endereco().trim(),
      telefone: this.telefone().trim(),
      valor_por_atendimento: this.valorPorAtendimento().trim(),
      ativo: this.ativo(),
    };
    const operacao = this.modoEdicao()
      ? this.clinicaService.atualizar(this.clinicaId()!, dados)
      : this.clinicaService.criar(dados);

    operacao.subscribe({
      next: () => {
        this.saida.concluir();
        this.voltarParaLista();
      },
      error: (err) => {
        this.salvando.set(false);
        tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao salvar clínica.');
        focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      },
    });
  }

  private validar(): Record<string, string[]> {
    const erros: Record<string, string[]> = {};
    if (!this.nome().trim()) erros['nome'] = ['Informe o nome da clínica.'];
    if (!this.endereco().trim()) erros['endereco'] = ['Informe o endereço.'];
    if (!this.valorPorAtendimento().trim()) erros['valor_por_atendimento'] = ['Informe o valor por atendimento.'];
    return erros;
  }

  /** ✕, Esc ou clique fora: volta para a listagem; o guard da rota pergunta se há alterações. */
  fechar() {
    this.voltarParaLista();
  }

  confirmarSaida(): boolean | Promise<boolean> {
    return this.saida.confirmarSaida();
  }

  responderDescarte(descartar: boolean) {
    this.saida.responder(descartar);
  }

  pedirExclusao() {
    this.confirmandoExclusao.set(true);
  }

  cancelarExclusao() {
    this.confirmandoExclusao.set(false);
  }

  confirmarExclusao() {
    this.excluindo.set(true);
    this.clinicaService.excluir(this.clinicaId()!).subscribe({
      next: () => {
        this.saida.concluir();
        this.confirmandoExclusao.set(false);
        this.voltarParaLista();
      },
      error: () => {
        this.excluindo.set(false);
        this.confirmandoExclusao.set(false);
        this.erroGeral.set('Erro ao excluir clínica.');
      },
    });
  }

  private voltarParaLista() {
    this.router.navigate(['/clinicas']);
  }

  toggleAtivo() {
    this.ativo.update((v) => !v);
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }

  formatarValor(valor: string): string {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
