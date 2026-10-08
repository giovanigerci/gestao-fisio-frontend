import { CORES_CLINICA_HEX, corDaClinica, corDaClinicaHex, proximaCorDeClinica } from './clinic-colors';

describe('proximaCorDeClinica (mesma regra do backend)', () => {
  it('sem clínicas, a primeira da paleta', () => {
    expect(proximaCorDeClinica([])).toBe(1);
  });

  it('a primeira cor livre', () => {
    expect(proximaCorDeClinica([1, 2, 4])).toBe(3);
  });

  it('com todas usadas, a menos usada; no empate, a primeira', () => {
    expect(proximaCorDeClinica([1, 2, 3, 4, 5])).toBe(1);
    expect(proximaCorDeClinica([1, 1, 2, 3, 4, 5])).toBe(2);
  });
});

describe('corDaClinica', () => {
  it('a cor guardada (1 a 5) aponta para o token da paleta', () => {
    expect(corDaClinica(1)).toBe('var(--color-clinic-1)');
    expect(corDaClinica(5)).toBe('var(--color-clinic-5)');
    expect(corDaClinicaHex(3)).toBe(CORES_CLINICA_HEX[2]);
  });

  it('sem cor (resposta antiga ou ausente), usa um cinza neutro em vez de uma cor de outra clínica', () => {
    expect(corDaClinica(undefined)).toBe('var(--color-text-muted)');
    expect(corDaClinicaHex(null)).toBe('#64748b');
  });
});
