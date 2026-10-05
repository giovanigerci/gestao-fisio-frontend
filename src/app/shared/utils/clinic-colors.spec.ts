import { CORES_CLINICA_HEX, corDaClinica, corDaClinicaHex } from './clinic-colors';

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
