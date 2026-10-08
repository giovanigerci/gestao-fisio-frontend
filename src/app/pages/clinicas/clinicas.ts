import { Component, inject, signal, DestroyRef, ElementRef, viewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ClinicaService, Clinica } from '../../services/clinica.service';
import { Badge } from '../../shared/components/badge/badge';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { corDaClinica } from '../../shared/utils/clinic-colors';
import { iniciais } from '../../shared/utils/iniciais';

@Component({
  selector: 'app-clinicas',
  imports: [RouterLink, RouterOutlet, Badge, ConfirmModal],
  templateUrl: './clinicas.html',
  styleUrls: ['../../../styles/list-page.css', './clinicas.css'],
})
export class Clinicas implements AfterViewInit, OnDestroy {
  private clinicaService = inject(ClinicaService);
  private destroyRef = inject(DestroyRef);

  clinicas = signal<Clinica[]>([]);
  carregando = signal(true);
  carregandoMais = signal(false);
  erro = signal('');
  processandoAcao = signal(false);
  confirmandoExclusao = signal<Clinica | null>(null);
  nextUrl = signal<string | null>(null);
  totalCadastradas = signal(0);

  corDaClinica = corDaClinica;
  getIniciais = iniciais;

  /** Referência ao elemento sentinela para IntersectionObserver */
  scrollSentinel = viewChild<ElementRef>('scrollSentinel');
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.carregar();
    // Clínica criada, editada ou excluída (no modal ou aqui): recarrega sem tirar a lista da tela
    this.clinicaService.alteradas$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.carregar({ silencioso: true }));
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  carregar({ silencioso = false } = {}) {
    if (!silencioso) this.carregando.set(true);
    this.erro.set('');
    this.clinicaService.listar(1).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  formatarValor(valor: string | number | undefined): string {
    if (!valor) return 'R$ 0,00';
    return (+valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
