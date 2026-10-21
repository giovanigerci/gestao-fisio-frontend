import { podeRecarregarAutomaticamente } from './trava-de-recarga';

describe('trava de recarga automática', () => {
  const agora = new Date(2026, 9, 21, 10, 0).getTime();

  beforeEach(() => sessionStorage.clear());

  afterEach(() => vi.restoreAllMocks());

  it('a primeira recarga pode acontecer', () => {
    expect(podeRecarregarAutomaticamente(agora)).toBe(true);
  });

  it('uma segunda em menos de um minuto é barrada', () => {
    podeRecarregarAutomaticamente(agora);

    expect(podeRecarregarAutomaticamente(agora + 59_000)).toBe(false);
  });

  it('depois de um minuto pode recarregar de novo', () => {
    podeRecarregarAutomaticamente(agora);

    expect(podeRecarregarAutomaticamente(agora + 60_000)).toBe(true);
  });

  it('relógio voltando para trás não trava as recargas para sempre', () => {
    podeRecarregarAutomaticamente(agora);

    expect(podeRecarregarAutomaticamente(agora - 3_600_000)).toBe(true);
  });

  it('sem sessionStorage, recarrega mesmo assim', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(podeRecarregarAutomaticamente(agora)).toBe(true);
  });
});
