import { Component, inject, signal, effect, computed } from '@angular/core';
import { FinanceiroService, ResumoClinica } from '../../services/financeiro.service';
import { Card } from '../../shared/components/card/card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ProgressBar } from '../../shared/components/progress-bar/progress-bar';
import { corDaClinica } from '../../shared/utils/clinic-colors';

@Component({
  selector: 'app-financeiro',
  imports: [EmptyState, ProgressBar],
  templateUrl: './financeiro.html',
  styleUrl: './financeiro.css',
})
export class Financeiro {
  private financeiroService = inject(FinanceiroService);

  periodo = signal<'mes' | 'semana'>('mes');
  dataReferencia = signal<string>(new Date().toISOString().split('T')[0]);
  porClinica = signal<ResumoClinica[]>([]);
  totalGeral = signal(0);
  carregando = signal(true);
  erro = signal('');

  corDaClinica = corDaClinica;

  totalAtendimentos = computed(() => {
    return this.porClinica().reduce((acc, curr) => acc + curr.total_atendimentos, 0);
  });

  totalClinicas = computed(() => {
    return this.porClinica().length;
  });

  ticketMedio = computed(() => {
    const atendimentos = this.totalAtendimentos();
    if (atendimentos === 0) return 0;
    return this.totalGeral() / atendimentos;
  });

  periodoLabel = computed(() => {
    const data = new Date(this.dataReferencia() + 'T12:00:00');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    if (this.periodo() === 'mes') {
      return `${mesesCompletos[data.getMonth()]} ${data.getFullYear()}`;
    } else {
      const d = new Date(this.dataReferencia() + 'T12:00:00');
      const dia = d.getDay();
      const diff = dia === 0 ? 6 : dia - 1; // Considerar segunda-feira como início
      d.setDate(d.getDate() - diff);
      
      const inicio = new Date(d);
      d.setDate(d.getDate() + 6);
      const fim = new Date(d);
      
      return `${inicio.getDate()} ${meses[inicio.getMonth()]} - ${fim.getDate()} ${meses[fim.getMonth()]}`;
    }
  });

  constructor() {
    effect(() => {
      this.carregarResumo(this.periodo(), this.dataReferencia());
    });
  }

  carregarResumo(periodo: 'mes' | 'semana', data: string) {
    this.carregando.set(true);
    this.erro.set('');

    this.financeiroService.buscarResumo(periodo, data).subscribe({
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

  porcentagem(receita: number): string {
    const total = this.totalGeral();
    if (total === 0) return '0%';
    const pct = (receita / total) * 100;
    return `${Math.round(pct)}%`;
  }

  progressSegments = computed(() => {
    const total = this.totalGeral();
    if (total === 0) return [];
    
    // Sort by value descending for the progress bar
    const sorted = [...this.porClinica()].sort((a, b) => b.receita_total - a.receita_total);
    
    return sorted.map(c => ({
      value: c.receita_total,
      color: corDaClinica(c.clinica)
    }));
  });

  trocarPeriodo(periodo: 'mes' | 'semana') {
    this.periodo.set(periodo);
    this.dataReferencia.set(new Date().toISOString().split('T')[0]);
  }

  periodoAnterior() {
    const d = new Date(this.dataReferencia() + 'T12:00:00');
    if (this.periodo() === 'mes') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    this.dataReferencia.set(d.toISOString().split('T')[0]);
  }

  proximoPeriodo() {
    const d = new Date(this.dataReferencia() + 'T12:00:00');
    if (this.periodo() === 'mes') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    this.dataReferencia.set(d.toISOString().split('T')[0]);
  }

  formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getPeriodoLabel(): string {
    return this.periodo() === 'mes' ? 'este mês' : 'esta semana';
  }
}
