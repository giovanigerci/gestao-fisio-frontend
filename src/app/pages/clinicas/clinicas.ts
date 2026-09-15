import { Component, inject, signal, DestroyRef, ElementRef, viewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { ClinicaService, Clinica } from '../../services/clinica.service';
import { Card } from '../../shared/components/card/card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Badge, BadgeVariant } from '../../shared/components/badge/badge';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { corDoPaciente } from '../../shared/utils/clinic-colors';

@Component({
  selector: 'app-clinicas',
  imports: [RouterLink, Card, EmptyState, Badge, ConfirmModal],
  templateUrl: './clinicas.html',
  styleUrls: ['../../../styles/list-page.css', './clinicas.css'],
})
export class Clinicas implements AfterViewInit, OnDestroy {
  private clinicaService = inject(ClinicaService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  clinicas = signal<Clinica[]>([]);
  termoBusca = signal('');
  carregando = signal(true);
  carregandoMais = signal(false);
  erro = signal('');
  processandoAcao = signal(false);
  confirmandoExclusao = signal<Clinica | null>(null);
  nextUrl = signal<string | null>(null);

  corDoPaciente = corDoPaciente;

  totalCadastradas = signal(0);

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
        this.clinicas.set([]);
        this.nextUrl.set(null);
        this.carregando.set(true);
        this.erro.set('');
      }),
      // switchMap cancela a requisição anterior automaticamente
      switchMap(termo => this.clinicaService.listar(1, termo)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (resposta) => {
        this.clinicas.set(resposta.results);
        this.nextUrl.set(resposta.next);
        this.totalCadastradas.set(resposta.count);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar clínicas. Tente novamente.');
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
    this.clinicaService.listarPorUrl(url).subscribe({
      next: (resposta) => {
        this.clinicas.update(lista => [...lista, ...resposta.results]);
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

  editarClinica(clinica: Clinica) {
    this.router.navigate(['/clinicas', clinica.id, 'editar']);
  }

  confirmarExclusao(clinica: Clinica, event: Event) {
    event.stopPropagation();
    this.confirmandoExclusao.set(clinica);
  }

  confirmarExclusaoModal() {
    const clinica = this.confirmandoExclusao();
    if (!clinica) return;

    this.processandoAcao.set(true);
    this.clinicaService.excluir(clinica.id).subscribe({
      next: () => {
        this.clinicas.update(lista => lista.filter(c => c.id !== clinica.id));
        this.totalCadastradas.update(total => total - 1);
        this.processandoAcao.set(false);
        this.confirmandoExclusao.set(null);
      },
      error: () => {
        this.erro.set('Erro ao excluir clínica.');
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

  formatarValor(valor: string | undefined): string {
    if (!valor) return 'R$ 0,00';
    return (+valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getStatusVariant(ativo: boolean): BadgeVariant {
    return ativo ? 'ativo' : 'inativo';
  }
}
