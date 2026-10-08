import { Component, computed, input, linkedSignal, model, signal } from '@angular/core';
import { corDoPaciente } from '../../utils/clinic-colors';
import { iniciais } from '../../utils/iniciais';

export interface OpcaoCombobox {
  id: number;
  nome: string;
}

const MAX_RESULTADOS = 8;

/** Sem acento e minúsculo: "José" é encontrado digitando "jose". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * Campo de busca com lista de opções (padrão "combobox" do WAI-ARIA): digita para filtrar,
 * setas para navegar, Enter escolhe, Esc fecha a lista (sem fechar o modal em volta).
 * Usado para escolher o paciente da sessão.
 */
@Component({
  selector: 'app-combobox',
  templateUrl: './combobox.html',
  styleUrl: './combobox.css',
})
export class Combobox {
  readonly opcoes = input.required<OpcaoCombobox[]>();
  readonly valor = model<number | null>(null);
  /** id do <input>, para o <label for> de quem usa. */
  readonly idCampo = input.required<string>();
  readonly placeholder = input('');
  readonly invalido = input(false);
  readonly descritoPor = input<string | null>(null);
  readonly textoSemResultado = input('Nada encontrado');

  readonly aberto = signal(false);
  readonly indiceAtivo = signal(0);

  private readonly selecionada = computed(() => this.opcoes().find((o) => o.id === this.valor()) ?? null);
  /** O que está no campo: volta ao nome da opção escolhida sempre que a escolha muda. */
  readonly texto = linkedSignal(() => this.selecionada()?.nome ?? '');

  readonly filtradas = computed(() => {
    const busca = normalizar(this.texto());
    const todas = this.opcoes();
    // Campo mostrando a escolha atual (ou vazio): lista tudo, para trocar sem apagar o texto
    const lista = !busca || busca === normalizar(this.selecionada()?.nome ?? '')
      ? todas
      : todas.filter((o) => normalizar(o.nome).includes(busca));
    return lista.slice(0, MAX_RESULTADOS);
  });

  readonly idLista = computed(() => `${this.idCampo()}-opcoes`);
  readonly idAtivo = computed(() => {
    const opcao = this.filtradas()[this.indiceAtivo()];
    return this.aberto() && opcao ? `${this.idCampo()}-opcao-${opcao.id}` : null;
  });

  readonly iniciaisDe = iniciais;
  readonly corDe = corDoPaciente;
  readonly selecionadaAtual = this.selecionada;

  abrir() {
    if (this.aberto()) return;
    const atual = this.filtradas().findIndex((o) => o.id === this.valor());
    this.indiceAtivo.set(Math.max(atual, 0));
    this.aberto.set(true);
  }

  fechar() {
    this.aberto.set(false);
  }

  digitar(texto: string) {
    this.texto.set(texto);
    this.indiceAtivo.set(0);
    this.aberto.set(true);
    if (!texto.trim()) this.valor.set(null);
  }

  escolher(opcao: OpcaoCombobox) {
    this.valor.set(opcao.id);
    this.texto.set(opcao.nome);
    this.fechar();
  }

  /** Saiu do campo sem escolher: volta ao nome da opção escolhida (ou vazio). */
  sair() {
    this.fechar();
    this.texto.set(this.selecionada()?.nome ?? '');
  }

  teclar(evento: KeyboardEvent) {
    const total = this.filtradas().length;
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        if (!this.aberto()) return this.abrir();
        this.indiceAtivo.update((i) => Math.min(i + 1, total - 1));
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.indiceAtivo.update((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        if (this.aberto() && total) {
          evento.preventDefault(); // escolhe a opção em vez de enviar o formulário
          this.escolher(this.filtradas()[this.indiceAtivo()]);
        }
        break;
      case 'Escape':
        if (this.aberto()) {
          evento.preventDefault(); // fecha só a lista: sem isso o Esc fecharia o modal inteiro
          evento.stopPropagation();
          this.sair();
        }
        break;
    }
  }
}
