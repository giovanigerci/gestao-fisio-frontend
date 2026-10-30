import { Component, DestroyRef, ElementRef, Injector, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { AgendamentoService, PreviaRecorrencia } from '../../../services/agendamento.service';
import { PacienteService } from '../../../services/paciente.service';
import { ClinicaService } from '../../../services/clinica.service';
import { ComAlteracoesPendentes } from '../../../guards/alteracoes-pendentes-guard';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { Combobox, OpcaoCombobox } from '../../../shared/components/combobox/combobox';
import { ControleDeSaida } from '../../../shared/utils/controle-de-saida';
import { corDaClinica } from '../../../shared/utils/clinic-colors';
import { formatarDataCurta, formatarDataPorExtenso } from '../../../shared/utils/datas';
import { focarPrimeiroCampoComErro, tratarErrosApi, temErro, mensagensErro } from '../../../shared/utils/form-errors';

interface OpcaoClinica {
  id: number;
  nome: string;
  cor: number;
}

@Component({
  selector: 'app-agendamento-form',
  imports: [Modal, ConfirmModal, Combobox],
  templateUrl: './agendamento-form.html',
  styleUrls: ['../../../../styles/form-page.css', '../../../../styles/modal-form.css', './agendamento-form.css'],
})
export class AgendamentoForm implements ComAlteracoesPendentes {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private agendamentoService = inject(AgendamentoService);
  private pacienteService = inject(PacienteService);
  private clinicaService = inject(ClinicaService);

  readonly MIN_SEMANAS = 1;
  readonly MAX_SEMANAS = 12;

  modoEdicao = signal(false);
  agendamentoId = signal<number | null>(null);
  carregando = signal(false);
  carregandoOpcoes = signal(true);
  salvando = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});

  pacientes = signal<OpcaoCombobox[]>([]);
  clinicas = signal<OpcaoClinica[]>([]);

  paciente = signal<number | null>(null);
  clinica = signal<number | null>(null);
  data = signal('');
  horaInicio = signal('');
  horaFim = signal('');
  ehExperimental = signal(false);
  repetirSemanal = signal(false);
  repeticoes = signal(4);

  readonly corDaClinica = corDaClinica;
  readonly formatarDataCurta = formatarDataCurta;
  readonly subtitulo = computed(() => (this.data() ? formatarDataPorExtenso(this.data()) : ''));

  private readonly estadoInicial = signal('');
  private readonly estadoAtual = computed(() =>
    JSON.stringify([
      this.paciente(), this.clinica(), this.data(), this.horaInicio(), this.horaFim(),
      this.ehExperimental(), this.repetirSemanal(), this.repeticoes(),
    ])
  );
  readonly temAlteracoes = computed(() => this.estadoAtual() !== this.estadoInicial());
  readonly saida = new ControleDeSaida(() => this.temAlteracoes(), () => this.salvando());

  readonly previa = signal<PreviaRecorrencia | null>(null);
  private readonly parametrosDaPrevia = computed(() => {
    if (this.modoEdicao() || !this.repetirSemanal()) return null;
    const paciente = this.paciente();
    const semanas = this.repeticoes();
    if (!paciente || !this.data() || !this.horaInicio() || semanas < this.MIN_SEMANAS || semanas > this.MAX_SEMANAS) {
      return null;
    }
    return { paciente, data: this.data(), hora_inicio: this.horaInicio(), repeticoes: semanas };
  });
  readonly datasLivres = computed(() => this.previa()?.datas.filter((d) => !d.conflito).length ?? null);
  readonly datasOcupadas = computed(() => this.previa()?.datas.filter((d) => d.conflito) ?? []);

  readonly rotuloSalvar = computed(() => {
    if (this.salvando()) return 'Salvando…';
    if (this.modoEdicao()) return 'Salvar alterações';
    if (!this.repetirSemanal()) return 'Salvar sessão';
    const livres = this.datasLivres() ?? this.repeticoes();
    if (livres === 0) return 'Nenhuma data livre';
    return livres === 1 ? 'Criar 1 sessão' : `Criar ${livres} sessões`;
  });
  readonly podeSalvar = computed(() => !this.salvando() && !this.carregando() && this.datasLivres() !== 0);

  constructor() {
    this.carregarOpcoes();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicao.set(true);
      this.agendamentoId.set(+id);
      this.carregarAgendamento(+id);
    } else {
      const dataParam = this.route.snapshot.queryParamMap.get('data');
      if (dataParam) this.data.set(dataParam);
      this.estadoInicial.set(this.estadoAtual());
    }

    toObservable(this.parametrosDaPrevia)
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap((parametros) =>
          parametros ? this.agendamentoService.verificarRecorrencia(parametros).pipe(catchError(() => of(null))) : of(null)
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((previa) => this.previa.set(previa));
  }

  private carregarOpcoes() {
    let pendentes = 2;
    const concluir = () => {
      if (--pendentes === 0) this.carregandoOpcoes.set(false);
    };

    this.pacienteService.buscarOpcoes().pipe(finalize(concluir)).subscribe({
      next: (pacientes) => this.pacientes.set(pacientes),
      error: () => this.erroGeral.set('Erro ao carregar lista de pacientes.'),
    });
    this.clinicaService.buscarOpcoes().pipe(finalize(concluir)).subscribe({
      next: (clinicas) => this.clinicas.set(clinicas),
      error: () => this.erroGeral.set('Erro ao carregar lista de clínicas.'),
    });
  }

  private carregarAgendamento(id: number) {
    this.carregando.set(true);
    this.agendamentoService.buscarPorId(id).subscribe({
      next: (ag) => {
        this.paciente.set(ag.paciente);
        this.clinica.set(ag.clinica);
        this.data.set(ag.data);
        this.horaInicio.set(ag.hora_inicio.substring(0, 5));
        this.horaFim.set(ag.hora_fim.substring(0, 5));
        this.ehExperimental.set(ag.eh_experimental);
        this.estadoInicial.set(this.estadoAtual());
        this.carregando.set(false);
      },
      error: () => {
        this.erroGeral.set('Erro ao carregar dados da sessão.');
        this.carregando.set(false);
      },
    });
  }

  /** Início sugere o fim uma hora depois (o mais comum); o fim continua editável. */
  mudarHoraInicio(valor: string) {
    this.horaInicio.set(valor);
    if (valor) {
      const [h, m] = valor.split(':').map(Number);
      this.horaFim.set(`${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  mudarSemanas(delta: number) {
    this.repeticoes.update((n) => Math.min(this.MAX_SEMANAS, Math.max(this.MIN_SEMANAS, n + delta)));
  }

  private validar(): Record<string, string[]> {
    const erros: Record<string, string[]> = {};
    if (!this.paciente()) erros['paciente'] = ['Escolha o paciente.'];
    if (!this.clinica()) erros['clinica'] = ['Escolha a clínica.'];
    if (!this.data()) erros['data'] = ['Informe a data.'];
    if (!this.horaInicio()) erros['hora_inicio'] = ['Informe o início.'];
    if (!this.horaFim()) erros['hora_fim'] = ['Informe o fim.'];
    return erros;
  }

  salvar() {
    if (!this.podeSalvar()) return;
    this.erroGeral.set('');
    const errosLocais = this.validar();
    this.erros.set(errosLocais);
    if (Object.keys(errosLocais).length) {
      focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      return;
    }

    this.salvando.set(true);
    const dados = {
      paciente: this.paciente()!,
      clinica: this.clinica()!,
      data: this.data(),
      hora_inicio: this.horaInicio(),
      hora_fim: this.horaFim(),
      eh_experimental: this.ehExperimental(),
    };

    // As datas ocupadas já foram mostradas na prévia; o backend pula as mesmas ao criar
    const operacao: Observable<unknown> = this.modoEdicao()
      ? this.agendamentoService.atualizar(this.agendamentoId()!, dados)
      : this.repetirSemanal()
        ? this.agendamentoService.criarRecorrente({ ...dados, repeticoes: this.repeticoes() })
        : this.agendamentoService.criar(dados);

    operacao.subscribe({
      next: () => {
        this.saida.concluir();
        this.voltarParaAgenda();
      },
      error: (err) => {
        this.salvando.set(false);
        tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao salvar a sessão.');
        focarPrimeiroCampoComErro(this.host.nativeElement, this.injector);
      },
    });
  }

  /** ✕, Esc ou clique fora: volta para a agenda; o guard da rota pergunta se há alterações. */
  fechar() {
    this.voltarParaAgenda();
  }

  confirmarSaida(): boolean | Promise<boolean> {
    return this.saida.confirmarSaida();
  }

  responderDescarte(descartar: boolean) {
    this.saida.responder(descartar);
  }

  private voltarParaAgenda() {
    this.router.navigate(['/agenda'], { queryParams: this.data() ? { data: this.data() } : {} });
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }
}
