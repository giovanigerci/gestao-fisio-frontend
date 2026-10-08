import { Component, ElementRef, Injector, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PacienteService } from '../../../services/paciente.service';
import { ComAlteracoesPendentes } from '../../../guards/alteracoes-pendentes-guard';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { TelefoneMaskDirective } from '../../../shared/directives/telefone-mask.directive';
import { CpfMaskDirective } from '../../../shared/directives/cpf-mask.directive';
import { ControleDeSaida } from '../../../shared/utils/controle-de-saida';
import { focarPrimeiroCampoComErro, tratarErrosApi, temErro, mensagensErro } from '../../../shared/utils/form-errors';
import { formatarDataISO, idadeEmAnos } from '../../../shared/utils/datas';

/** Criar/editar paciente num modal sobre a listagem (rotas filhas de /pacientes). */
@Component({
  selector: 'app-paciente-form',
  imports: [Modal, ConfirmModal, TelefoneMaskDirective, CpfMaskDirective],
  templateUrl: './paciente-form.html',
  styleUrls: ['../../../../styles/form-page.css', '../../../../styles/modal-form.css', './paciente-form.css'],
})
export class PacienteForm implements ComAlteracoesPendentes {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);
  private pacienteService = inject(PacienteService);

  modoEdicao = signal(false);
  pacienteId = signal<number | null>(null);
  nomeSalvo = signal('');
  carregando = signal(false);
  salvando = signal(false);
  excluindo = signal(false);
  confirmandoExclusao = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});

  nome = signal('');
  cpf = signal('');
  telefone = signal('');
  email = signal('');
  dataNascimento = signal('');
  endereco = signal('');
  historicoMedico = signal('');

  readonly LIMITE_HISTORICO = 10000;
  readonly mostrarContadorHistorico = computed(() => this.historicoMedico().length >= this.LIMITE_HISTORICO * 0.8);
  readonly contadorHistorico = computed(
    () => `${this.historicoMedico().length.toLocaleString('pt-BR')} / ${this.LIMITE_HISTORICO.toLocaleString('pt-BR')}`
  );

  // Limites para data de nascimento
  readonly hoje = formatarDataISO();
  readonly dataMinima = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return formatarDataISO(d);
  })();

  /**
   * Data já validada ao sair do campo. A idade vem dela, não do que está sendo digitado: no meio da
   * digitação o ano ainda está incompleto (ex: "0120") e a idade sairia absurda.
   */
  private readonly dataConfirmada = signal('');
  readonly idade = computed(() => idadeEmAnos(this.dataConfirmada(), this.hoje));

  private readonly estadoInicial = signal('');
  private readonly estadoAtual = computed(() =>
    JSON.stringify([
      this.nome().trim(), this.cpf(), this.telefone(), this.email().trim(),
      this.dataNascimento(), this.endereco().trim(), this.historicoMedico().trim(),
    ])
  );
  readonly temAlteracoes = computed(() => this.estadoAtual() !== this.estadoInicial());
  readonly saida = new ControleDeSaida(
    () => this.temAlteracoes(),
    () => this.salvando() || this.confirmandoExclusao(),
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicao.set(true);
      this.pacienteId.set(+id);
      this.carregarPaciente(+id);
    } else {
      this.estadoInicial.set(this.estadoAtual());
    }
  }

  private carregarPaciente(id: number) {
    this.carregando.set(true);
    this.pacienteService.buscarPorId(id).subscribe({
      next: (paciente) => {
        this.nome.set(paciente.nome);
        this.nomeSalvo.set(paciente.nome);
        this.cpf.set(paciente.cpf);
        this.telefone.set(paciente.telefone);
        this.email.set(paciente.email ?? '');
        this.dataNascimento.set(paciente.data_nascimento ?? '');
        this.dataConfirmada.set(paciente.data_nascimento ?? '');
        this.endereco.set(paciente.endereco);
        this.historicoMedico.set(paciente.historico_medico);
        this.estadoInicial.set(this.estadoAtual());
        this.carregando.set(false);
      },
      error: () => {
        this.erroGeral.set('Erro ao carregar dados do paciente.');
        this.carregando.set(false);
      },
    });
  }

  /** Erro da data de nascimento, ou '' se estiver vazia (opcional) ou válida. */
  private erroDaData(): string {
    const valor = this.dataNascimento();
    if (!valor) return '';
    if (valor > this.hoje) return 'Data de nascimento não pode ser uma data futura.';
    if (valor < this.dataMinima) return 'Data de nascimento inválida (máximo 120 anos).';
    return '';
  }

  /** Enquanto digita: esconde a idade até a data ser confirmada ao sair do campo. */
  digitarDataNascimento(valor: string) {
    this.dataNascimento.set(valor);
    this.dataConfirmada.set('');
  }

  /** Ao sair do campo de data: mostra (ou limpa) o erro só desse campo e, se válida, a idade. */
  validarDataNascimento() {
    const erro = this.erroDaData();
    this.erros.update(({ data_nascimento: _, ...outros }) => (erro ? { ...outros, data_nascimento: [erro] } : outros));
    this.dataConfirmada.set(erro ? '' : this.dataNascimento());
  }

  private validar(): Record<string, string[]> {
    const erros: Record<string, string[]> = {};
    if (!this.nome().trim()) erros['nome'] = ['Informe o nome do paciente.'];
    if (!this.cpf().trim()) erros['cpf'] = ['Informe o CPF.'];
    if (!this.telefone().trim()) erros['telefone'] = ['Informe o telefone do paciente.'];
    const erroData = this.erroDaData();
    if (erroData) erros['data_nascimento'] = [erroData];
    return erros;
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
      cpf: this.cpf().trim(),
      telefone: this.telefone().trim(),
      email: this.email().trim() || null,
      data_nascimento: this.dataNascimento() || null,
      endereco: this.endereco().trim(),
      historico_medico: this.historicoMedico().trim(),
    };
    const operacao = this.modoEdicao()
      ? this.pacienteService.atualizar(this.pacienteId()!, dados)
      : this.pacienteService.criar(dados);

    operacao.subscribe({
      next: () => {
        this.saida.concluir();
        this.voltarParaLista();
      },
      error: (err) => {
        this.salvando.set(false);
        tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao salvar paciente.');
        focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      },
    });
  }

  // ─── Fechar e descartar ───

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

  // ─── Excluir (só na edição) ───

  pedirExclusao() {
    this.confirmandoExclusao.set(true);
  }

  cancelarExclusao() {
    this.confirmandoExclusao.set(false);
  }

  confirmarExclusao() {
    this.excluindo.set(true);
    this.pacienteService.excluir(this.pacienteId()!).subscribe({
      next: () => {
        this.saida.concluir();
        this.confirmandoExclusao.set(false);
        this.voltarParaLista();
      },
      error: () => {
        this.excluindo.set(false);
        this.confirmandoExclusao.set(false);
        this.erroGeral.set('Erro ao excluir paciente.');
      },
    });
  }

  private voltarParaLista() {
    this.router.navigate(['/pacientes']);
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }
}
