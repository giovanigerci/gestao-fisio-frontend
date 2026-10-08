import { TestBed } from '@angular/core/testing';
import { NavigationError } from '@angular/router';
import { ehFalhaAoBaixarCodigo, podeRecarregar, recarregarSeFalhouAoBaixarCodigo } from './falha-ao-carregar-pagina';
import { RECARGA_DA_PAGINA } from './recarga-da-pagina';

describe('falha ao carregar o código da página', () => {
  beforeEach(() => sessionStorage.clear());

  it('reconhece a mensagem de cada navegador', () => {
    expect(ehFalhaAoBaixarCodigo(new TypeError('Failed to fetch dynamically imported module: https://x/chunk-AB12.js'))).toBe(true);
    expect(ehFalhaAoBaixarCodigo(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(ehFalhaAoBaixarCodigo(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(ehFalhaAoBaixarCodigo(Object.assign(new Error('Loading chunk 12 failed'), { name: 'ChunkLoadError' }))).toBe(true);
  });

  it('outros erros de navegação não são confundidos com falha de download', () => {
    expect(ehFalhaAoBaixarCodigo(new Error('NG04002: Cannot match any routes'))).toBe(false);
    expect(ehFalhaAoBaixarCodigo(undefined)).toBe(false);
  });

  it('recarrega uma vez por URL; se falhar de novo logo em seguida, não entra em ciclo', () => {
    expect(podeRecarregar('/agenda', 1_000)).toBe(true);
    expect(podeRecarregar('/agenda', 5_000)).toBe(false);
    expect(podeRecarregar('/agenda', 12_000)).toBe(true); // passou a janela de 10s
    expect(podeRecarregar('/pacientes', 12_500)).toBe(true); // outra página
  });

  describe('no roteador', () => {
    const abrir = vi.fn();

    beforeEach(() => {
      abrir.mockClear();
      TestBed.configureTestingModule({
        providers: [{ provide: RECARGA_DA_PAGINA, useValue: { abrir, recarregar: vi.fn() } }],
      });
    });

    const falha = (url: string, erro: unknown) =>
      TestBed.runInInjectionContext(() => recarregarSeFalhouAoBaixarCodigo(new NavigationError(1, url, erro)));

    it('código da página não baixou: abre a página de destino do zero', () => {
      falha('/agenda', new TypeError('Failed to fetch dynamically imported module'));

      expect(abrir).toHaveBeenCalledWith('/agenda');
    });

    it('outro erro de navegação: não recarrega', () => {
      falha('/agenda', new Error('erro qualquer'));

      expect(abrir).not.toHaveBeenCalled();
    });
  });
});
