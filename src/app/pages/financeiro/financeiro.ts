import { Component, inject, signal, effect } from '@angular/core';
import { FinanceiroService, ResumoClinica } from '../../services/financeiro.service';

@Component({
  selector: 'app-financeiro',
  imports: [],
  templateUrl: './financeiro.html',
  styleUrl: './financeiro.css',
})
export class Financeiro {
  private financeiroService = inject(FinanceiroService);

  periodo = signal<'mes' | 'semana'>('mes');
  porClinica = signal<ResumoClinica[]>([]);
  totalGeral = signal(0);
  carregando = signal(true);
  erro = signal('');

  constructor() {
    effect(() => {
      this.carregarResumo(this.periodo());
    });
  }

  carregarResumo(periodo: 'mes' | 'semana') {
    this.carregando.set(true);
    this.erro.set('');

    this.financeiroService.buscarResumo(periodo).subscribe({
      next: (resposta) => {
        this.porClinica.set(resposta.por_clinica);
        this.totalGeral.set(resposta.total_geral);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar resumo financeiro. Tente novamente.');
        this.carregando.set(false);
      },
    });
  }

  trocarPeriodo(periodo: 'mes' | 'semana') {
    this.periodo.set(periodo);
  }

  formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getPeriodoLabel(): string {
    return this.periodo() === 'mes' ? 'este mês' : 'esta semana';
  }
}
