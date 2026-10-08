import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Modal } from './modal';
import { simularDialogNativo } from './simular-dialog.spec-helper';

@Component({
  imports: [Modal],
  template: `
    <app-modal titulo="Nova clínica" subtitulo="Ela aparece na agenda" (fechar)="fechou = fechou + 1">
      <p class="conteudo">Conteúdo</p>
      <button modal-rodape class="rodape">Salvar</button>
    </app-modal>
  `,
})
class Hospedeiro {
  fechou = 0;
}

describe('Modal', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let dialogo: HTMLDialogElement;
  let simulado: ReturnType<typeof simularDialogNativo>;

  beforeEach(() => {
    simulado = simularDialogNativo();
    fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    dialogo = fixture.nativeElement.querySelector('dialog');
  });

  afterEach(() => simulado.restaurar());

  const clicar = (alvo: Element, inicio: Element = alvo) => {
    inicio.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    alvo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  it('abre como modal nativo, com o título ligado ao dialog para leitores de tela', () => {
    const titulo = dialogo.querySelector('h2')!;

    expect(simulado.showModal).toHaveBeenCalled();
    expect(dialogo.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(titulo.textContent).toContain('Nova clínica');
    expect(dialogo.querySelector('.modal-corpo .conteudo')).toBeTruthy();
    expect(dialogo.querySelector('.modal-rodape .rodape')).toBeTruthy();
  });

  it('Esc pede para fechar em vez de fechar direto', () => {
    const esc = new Event('cancel', { cancelable: true });
    dialogo.dispatchEvent(esc);

    expect(esc.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.fechou).toBe(1);
  });

  it('clique no fundo escurecido pede para fechar', () => {
    clicar(dialogo);

    expect(fixture.componentInstance.fechou).toBe(1);
  });

  it('clique dentro da caixa não fecha', () => {
    clicar(dialogo.querySelector('.conteudo')!);

    expect(fixture.componentInstance.fechou).toBe(0);
  });

  it('arrastar de dentro para fora (ex: selecionando texto) não fecha', () => {
    clicar(dialogo, dialogo.querySelector('.conteudo')!);

    expect(fixture.componentInstance.fechou).toBe(0);
  });

  it('botão ✕ pede para fechar', () => {
    (dialogo.querySelector('.modal-fechar') as HTMLButtonElement).click();

    expect(fixture.componentInstance.fechou).toBe(1);
  });

  it('ao sair da tela fecha o dialog (devolve o foco a quem abriu)', () => {
    fixture.destroy();

    expect(simulado.close).toHaveBeenCalled();
  });
});
