/** Até duas iniciais em maiúsculas para avatares: "Studio Pilates Bem-Estar" → "SP". */
export function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}
