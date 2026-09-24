import { formatarDataISO, parseDataISO } from './datas';

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
