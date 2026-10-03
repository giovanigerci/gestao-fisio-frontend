/**
 * Paleta rotativa para identificação visual de clínicas.
 *
 * Cada cor é uma referência ao token CSS correspondente, garantindo que a
 * alteração de uma cor na paleta se propague automaticamente para todo o
 * produto sem tocar em nenhum componente.
 *
 * @see docs/design-system-frontend.md — Seção 3
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

/** Posição da clínica na paleta (0–4): use para ordenar marcas que se tocam (ex: fatias da rosca). */
export function indiceCorDaClinica(clinicaId: number): number {
  return clinicaId % CORES_CLINICA_HEX.length;
}

/**
 * Retorna a cor CSS (como `var(--color-clinic-N)`) atribuída deterministicamente
 * a uma clínica com base no seu `id`.
 *
 * Garante que a mesma clínica sempre receba a mesma cor em qualquer tela
 * (Agenda, Financeiro, listagem de Clínicas), sem armazenar nada no banco.
 */
export function corDaClinica(clinicaId: number): string {
  return CORES_CLINICA[clinicaId % CORES_CLINICA.length];
}

/**
 * Versão hex de `corDaClinica`, para contextos que não suportam `var()`.
 */
export function corDaClinicaHex(clinicaId: number): string {
  return CORES_CLINICA_HEX[clinicaId % CORES_CLINICA_HEX.length];
}

/**
 * Retorna a cor CSS atribuída deterministicamente a um paciente com base no
 * seu `id`, reutilizando a mesma paleta `--color-clinic-*`.
 */
export function corDoPaciente(pacienteId: number): string {
  return CORES_CLINICA[pacienteId % CORES_CLINICA.length];
}
