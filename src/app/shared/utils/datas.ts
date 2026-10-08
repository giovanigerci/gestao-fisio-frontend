export function formatarDataISO(data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function parseDataISO(dataISO: string): Date {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12);
}

/** Idade em anos completos em `hoje` (ambos YYYY-MM-DD); null se a data estiver vazia ou no futuro. */
export function idadeEmAnos(nascimentoISO: string, hojeISO: string = formatarDataISO()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimentoISO) || nascimentoISO > hojeISO) return null;
  const [anoN, mesN, diaN] = nascimentoISO.split('-').map(Number);
  const [anoH, mesH, diaH] = hojeISO.split('-').map(Number);
  const aindaNaoFezAniversario = mesH < mesN || (mesH === mesN && diaH < diaN);
  return anoH - anoN - (aindaNaoFezAniversario ? 1 : 0);
}
