import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { simularDialogNativo } from '../modal/simular-dialog.spec-helper';
import { Folha } from './folha';

@Component({
  imports: [Folha],
  template: `
    <app-folha rotuladoPor="titulo-teste" [ancora]="ancora" (fechar)="fechou = fechou + 1">
      <h2 id="titulo-teste">Título</h2>
      <button type="button">Ação</button>
    </app-folha>
  `,
})
class Hospedeiro {
  ancora: DOMRect | null = null;
  fechou = 0;
}

describe('Folha', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let dialogo: ReturnType<typeof simularDialogNativo>;
  const elementoDialogo = () => (fixture.nativeElement as HTMLElement).querySelector('dialog')!;

  function abrir(ancora: DOMRect | null = null) {
    fixture = TestBed.createComponent(Hospedeiro);
    fixture.componentInstance.ancora = ancora;
    fixture.detectChanges();
    fixture.detectChanges();
  }

  function simularTela(desktop: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: desktop }),
    });
  }

  beforeEach(() => (dialogo = simularDialogNativo()));

  afterEach(() => {
    dialogo.restaurar();
    vi.restoreAllMocks();
    delete (window as Partial<Window>).matchMedia;
  });

  it('abre como diálogo modal, anunciado pelo título do conteúdo', () => {
    abrir();

    expect(dialogo.showModal).toHaveBeenCalled();
    expect(elementoDialogo().getAttribute('aria-labelledby')).toBe('titulo-teste');
    expect(elementoDialogo().querySelector('h2')?.textContent).toBe('Título');
  });

  it('o Esc pede para fechar em vez de fechar sozinho', () => {
    abrir();
    const evento = new Event('cancel', { cancelable: true });

    elementoDialogo().dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.fechou).toBe(1);
  });

  it('clique no fundo pede para fechar; arrastar de dentro para fora não', () => {
    abrir();
    const botao = elementoDialogo().querySelector('button')!;

    botao.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    elementoDialogo().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.fechou).toBe(0);

    elementoDialogo().dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    elementoDialogo().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.fechou).toBe(1);
  });

  it('ao sair da tela fecha o diálogo, que devolve o foco a quem abriu', () => {
    abrir();

    fixture.destroy();

    expect(dialogo.close).toHaveBeenCalled();
  });

  it('no desktop, com âncora, abre ao lado do elemento clicado', () => {
    simularTela(true);
    vi.spyOn(HTMLDialogElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 400, height: 300 } as DOMRect);

    abrir(new DOMRect(300, 200, 120, 100));

    expect(elementoDialogo().classList).toContain('folha--ao-lado');
    expect(elementoDialogo().style.left).toBe('428px');
    expect(elementoDialogo().style.top).toBe('200px');
  });

  it('no celular, ignora a âncora e sobe de baixo', () => {
    simularTela(false);

    abrir(new DOMRect(300, 200, 120, 100));

    expect(elementoDialogo().classList).not.toContain('folha--ao-lado');
    expect(elementoDialogo().style.left).toBe('');
  });
});
