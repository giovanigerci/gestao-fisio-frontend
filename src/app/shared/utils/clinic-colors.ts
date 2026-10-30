/**
 * A cor de cada clínica é escolhida pelo backend na criação (campo `cor`, de 1 a 5:
 * a menos usada entre as clínicas do profissional) e vem da API — `cor` na clínica,
 * `cor_clinica` no agendamento, `clinica__cor` no resumo financeiro. Assim duas clínicas
 * do mesmo profissional não repetem cor (até 5 clínicas) e a cor é a mesma em todas as telas.
 */
const CORES_CLINICA = [
  'var(--color-clinic-1)',
  'var(--color-clinic-2)',
  'var(--color-clinic-3)',
  'var(--color-clinic-4)',
  'var(--color-clinic-5)',
] as const;

/**
 * Valores raw (hex) para cenários onde `var()` não funciona (e.g. Canvas, SVG
 * inline gerado programaticamente). Manter sincronizado com tokens.css.
 *
 * Validados para a superfície escura (#131b2e) com o validador de paleta categórica:
 * luminosidade na faixa do modo escuro, contraste >= 3:1 e separação para daltonismo
 * entre cores vizinhas nesta ordem. Atenção: azul (1) e violeta (4) se confundem se
 * ficarem lado a lado — em gráficos, mantenha as cores na ordem da paleta.
 */
export const CORES_CLINICA_HEX = [
  '#3b82f6',
  '#b8813a',
  '#14a08f',
  '#8b5cf6',
  '#e8475f',
] as const;

const COR_SEM_CLINICA = 'var(--color-text-muted)';
const COR_SEM_CLINICA_HEX = '#64748b';

/** Posição na paleta (0–4) da `cor` vinda da API (1–5); -1 se ausente. */
function indiceDaCor(cor: number | null | undefined): number {
  return cor ? (cor - 1) % CORES_CLINICA.length : -1;
}

/** Cor CSS (`var(--color-clinic-N)`) a partir do campo `cor` da clínica. */
export function corDaClinica(cor: number | null | undefined): string {
  const indice = indiceDaCor(cor);
  return indice < 0 ? COR_SEM_CLINICA : CORES_CLINICA[indice];
}

/** Versão hex de `corDaClinica`, para contextos que não suportam `var()` (canvas). */
export function corDaClinicaHex(cor: number | null | undefined): string {
  const indice = indiceDaCor(cor);
  return indice < 0 ? COR_SEM_CLINICA_HEX : CORES_CLINICA_HEX[indice];
}

/**
 * Cor que o backend vai dar a uma clínica nova: a menos usada entre as do profissional; no empate,
 * a primeira da paleta (espelha `escolher_cor` em clinicas/models.py). Só para a prévia no
 * formulário: quem decide é o backend, que devolve a cor salva.
 */
export function proximaCorDeClinica(coresEmUso: number[]): number {
  const contagem = new Map<number, number>();
  coresEmUso.forEach((cor) => contagem.set(cor, (contagem.get(cor) ?? 0) + 1));
  let escolhida = 1;
  for (let cor = 2; cor <= CORES_CLINICA.length; cor++) {
    if ((contagem.get(cor) ?? 0) < (contagem.get(escolhida) ?? 0)) escolhida = cor;
  }
  return escolhida;
}

/**
 * Retorna a cor CSS atribuída deterministicamente a um paciente com base no
 * seu `id`, reutilizando a mesma paleta `--color-clinic-*` (só decorativa: repetir não confunde).
 */
export function corDoPaciente(pacienteId: number): string {
  return CORES_CLINICA[pacienteId % CORES_CLINICA.length];
}
