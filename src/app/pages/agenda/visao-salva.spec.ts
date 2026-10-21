import { lerVisaoSalva, salvarVisao } from './visao-salva';

describe('visão salva da agenda', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.restoreAllMocks());

  it('sem escolha anterior, abre na semana', () => {
    expect(lerVisaoSalva()).toBe('semana');
  });

  it('lembra a visão escolhida', () => {
    salvarVisao('mes');

    expect(lerVisaoSalva()).toBe('mes');
  });

  it('valor estranho no armazenamento volta para a semana', () => {
    localStorage.setItem('gf:agenda-visao', 'ano');

    expect(lerVisaoSalva()).toBe('semana');
  });

  it('armazenamento indisponível: abre na semana e salvar não quebra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(lerVisaoSalva()).toBe('semana');
    expect(() => salvarVisao('mes')).not.toThrow();
  });
});
