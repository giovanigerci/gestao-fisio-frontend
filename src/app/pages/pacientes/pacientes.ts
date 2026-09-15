import { Component, inject, signal, DestroyRef, ElementRef, viewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { PacienteService, Paciente } from '../../services/paciente.service';
import { Card } from '../../shared/components/card/card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Badge, BadgeVariant } from '../../shared/components/badge/badge';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { corDoPaciente } from '../../shared/utils/clinic-colors';
import { TelefonePipe } from '../../shared/pipes/telefone.pipe';

@Component({
  selector: 'app-pacientes',
  imports: [RouterLink, Card, EmptyState, Badge, ConfirmModal, TelefonePipe],
  templateUrl: './pacientes.html',
  styleUrls: ['../../../styles/list-page.css', './pacientes.css'],
})
export class Pacientes implements AfterViewInit, OnDestroy {
  private pacienteService = inject(PacienteService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  pacientes = signal<Paciente[]>([]);
  termoBusca = signal('');
  carregando = signal(true);
  carregandoMais = signal(false);
  erro = signal('');
  processandoAcao = signal(false);
  confirmandoExclusao = signal<Paciente | null>(null);
  nextUrl = signal<string | null>(null);

  corDoPaciente = corDoPaciente;

  totalCadastrados = signal(0);

  /** Referência ao elemento sentinela para IntersectionObserver */
  scrollSentinel = viewChild<ElementRef>('scrollSentinel');
  private observer: IntersectionObserver | null = null;

  constructor() {
    // ── Busca reativa com debounce ──
    toObservable(this.termoBusca).pipe(
      debounceTime(350),
      distinctUntilChanged(),
      tap(() => {
        // RESET: limpa lista e nextUrl ANTES de disparar a requisição
        this.pacientes.set([]);
        this.nextUrl.set(null);
        this.carregando.set(true);
        this.erro.set('');
      }),
      // switchMap cancela a requisição anterior automaticamente
      switchMap(termo => this.pacienteService.listar(1, termo)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (resposta) => {
        this.pacientes.set(resposta.results);
        this.nextUrl.set(resposta.next);
        this.totalCadastrados.set(resposta.count);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar pacientes. Tente novamente.');
        this.carregando.set(false);
      },
    });
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          this.carregarMais();
        }
      },
      { rootMargin: '200px' }
    );

    // Observar quando o elemento sentinela existir no DOM
    const check = () => {
      const el = this.scrollSentinel()?.nativeElement;
      if (el) {
        this.observer!.observe(el);
      } else {
        // Tentar novamente após renderização
        requestAnimationFrame(check);
      }
    };
    check();
  }

  carregarMais() {
    const url = this.nextUrl();
    if (!url || this.carregandoMais() || this.carregando()) return;

    this.carregandoMais.set(true);
    this.pacienteService.listarPorUrl(url).subscribe({
      next: (resposta) => {
        this.pacientes.update(lista => [...lista, ...resposta.results]);
        this.nextUrl.set(resposta.next);
        this.carregandoMais.set(false);
      },
      error: () => {
        this.carregandoMais.set(false);
      },
    });
  }

  recarregar() {
    this.termoBusca.set('');
  }

  editarPaciente(paciente: Paciente) {
    this.router.navigate(['/pacientes', paciente.id, 'editar']);
  }

  confirmarExclusao(paciente: Paciente, event: Event) {
    event.stopPropagation();
    this.confirmandoExclusao.set(paciente);
  }

  confirmarExclusaoModal() {
    const paciente = this.confirmandoExclusao();
    if (!paciente) return;

    this.processandoAcao.set(true);
    this.pacienteService.excluir(paciente.id).subscribe({
      next: () => {
        this.pacientes.update(lista => lista.filter(p => p.id !== paciente.id));
        this.totalCadastrados.update(total => total - 1);
        this.processandoAcao.set(false);
        this.confirmandoExclusao.set(null);
      },
      error: () => {
        this.erro.set('Erro ao excluir paciente.');
        this.processandoAcao.set(false);
        this.confirmandoExclusao.set(null);
      },
    });
  }

  cancelarExclusao() {
    this.confirmandoExclusao.set(null);
  }

  getIniciais(nome: string): string {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  getStatusVariant(status: string): BadgeVariant {
    return status === 'Ativo' ? 'ativo' : 'inativo';
  }

  formatarUltimaVisita(data: string | null): string {
    if (!data) return 'Nunca';
    const partes = data.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return data;
  }
}
