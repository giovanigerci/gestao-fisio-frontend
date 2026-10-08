import { idadeEmAnos, formatarDataCurta, formatarDataISO, formatarDataPorExtenso, parseDataISO } from './datas';

describe('datas', () => {
  it('formata no fuso local, mesmo à noite (sem virar o dia como no toISOString)', () => {
    expect(formatarDataISO(new Date(2026, 8, 22, 22, 30))).toBe('2026-09-22');
    expect(formatarDataISO(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  it('interpreta YYYY-MM-DD como data local', () => {
    const d = parseDataISO('2026-09-22');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 22]);
  });

  it('ida e volta preserva a data', () => {
    expect(formatarDataISO(parseDataISO('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('idadeEmAnos', () => {
  it('conta só aniversários já completados', () => {
    expect(idadeEmAnos('1992-03-14', '2026-03-13')).toBe(33);
    expect(idadeEmAnos('1992-03-14', '2026-03-14')).toBe(34);
  });

  it('nascido em 29/02 completa ano em 01/03 nos anos não bissextos', () => {
    expect(idadeEmAnos('2000-02-29', '2026-02-28')).toBe(25);
    expect(idadeEmAnos('2000-02-29', '2026-03-01')).toBe(26);
  });

  it('data vazia, incompleta ou no futuro não tem idade', () => {
    expect(idadeEmAnos('', '2026-10-07')).toBeNull();
    expect(idadeEmAnos('2026-1', '2026-10-07')).toBeNull();
    expect(idadeEmAnos('2027-01-01', '2026-10-07')).toBeNull();
  });
});

describe('datas por extenso', () => {
  it('dia da semana, dia e mês', () => {
    expect(formatarDataPorExtenso('2026-10-05')).toBe('Segunda, 5 de outubro');
    expect(formatarDataPorExtenso('2026-03-01')).toBe('Domingo, 1 de março');
  });

  it('versão curta para listas', () => {
    expect(formatarDataCurta('2026-10-05')).toBe('Seg, 05/10');
    expect(formatarDataCurta('2026-10-10')).toBe('Sáb, 10/10');
  });
});
