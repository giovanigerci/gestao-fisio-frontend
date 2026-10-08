/**
 * O jsdom (ambiente dos testes) não implementa showModal()/close() do <dialog>.
 * Simula o essencial — o atributo `open` — e devolve os mocks para conferir as chamadas.
 * Use no beforeEach e chame `restaurar()` no afterEach.
 */
export function simularDialogNativo() {
  const prototipo = HTMLDialogElement.prototype as HTMLDialogElement & Record<string, unknown>;
  const originais = { showModal: prototipo.showModal, close: prototipo.close };

  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
  Object.assign(prototipo, { showModal, close });

  return {
    showModal,
    close,
    restaurar: () => Object.assign(prototipo, originais),
  };
}
