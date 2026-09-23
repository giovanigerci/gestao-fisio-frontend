import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PerfilPage } from './perfil';
import { Perfil } from '../../services/perfil.service';
import { alteracoesPendentesGuard } from '../../guards/alteracoes-pendentes-guard';
import { environment } from '../../../environments/environment';

@Component({ template: '' })
class AgendaFake {}

const URL_PERFIL = `${environment.apiUrl}/auth/me/`;
const URL_FOTO = `${URL_PERFIL}foto/`;

const PERFIL: Perfil = {
  id: 1,
  username: 'dr_silva',
  first_name: 'João',
  last_name: 'Silva',
  email: 'joao@exemplo.com',
  telefone: '11999999999',
  especialidade: 'Ortopedia',
  crefito: '12345-F',
  foto: 'https://pub-teste.r2.dev/perfis/antiga.jpg',
};

function arquivo(tipo = 'image/png', tamanho = 1024): File {
  return new File([new Uint8Array(tamanho)], 'foto', { type: tipo });
}

function selecionarFoto(component: PerfilPage, file: File) {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', { value: [file] });
  component.onFotoSelecionada({ target: input } as unknown as Event);
}

describe('PerfilPage', () => {
  let harness: RouterTestingHarness;
  let component: PerfilPage;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'perfil', component: PerfilPage, canDeactivate: [alteracoesPendentesGuard] },
          { path: 'agenda', component: AgendaFake },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    component = await harness.navigateByUrl('/perfil', PerfilPage);
    http.expectOne(URL_PERFIL).flush(PERFIL);
    harness.detectChanges();
  });

  afterEach(() => http.verify());

  describe('foto só é persistida ao salvar', () => {
    it('selecionar foto gera preview local sem chamar a API', () => {
      selecionarFoto(component, arquivo());

      expect(component.fotoPendente()).toBeTruthy();
      expect(component.fotoExibida()).toBe('blob:preview');
      expect(component.temAlteracoesPendentes()).toBe(true);
      http.expectNone(URL_FOTO);
    });

    it('rejeita formato não suportado e arquivo maior que 5 MB', () => {
      selecionarFoto(component, arquivo('image/gif'));
      expect(component.erroFoto()).toContain('JPEG, PNG ou WEBP');

      selecionarFoto(component, arquivo('image/jpeg', 5 * 1024 * 1024 + 1));
      expect(component.erroFoto()).toContain('5 MB');

      expect(component.fotoPendente()).toBeNull();
    });

    it('salvar com foto pendente envia PATCH e depois POST da foto', () => {
      selecionarFoto(component, arquivo());
      component.salvar();

      http.expectOne({ method: 'PATCH', url: URL_PERFIL }).flush(PERFIL);
      const upload = http.expectOne({ method: 'POST', url: URL_FOTO });
      expect(upload.request.body.get('foto')).toBeInstanceOf(File);
      upload.flush({ foto: 'https://pub-teste.r2.dev/perfis/nova.png' });

      expect(component.fotoPendente()).toBeNull();
      expect(component.fotoExibida()).toBe('https://pub-teste.r2.dev/perfis/nova.png');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
      expect(component.temAlteracoesPendentes()).toBe(false);
      expect(component.sucesso()).toBeTruthy();
    });

    it('salvar com remoção pendente envia DELETE', () => {
      component.removerFoto();
      expect(component.remocaoPendente()).toBe(true);
      http.expectNone(URL_FOTO);

      component.salvar();
      http.expectOne({ method: 'PATCH', url: URL_PERFIL }).flush(PERFIL);
      http.expectOne({ method: 'DELETE', url: URL_FOTO }).flush(null, { status: 204, statusText: 'No Content' });

      expect(component.remocaoPendente()).toBe(false);
      expect(component.fotoExibida()).toBeNull();
    });

    it('salvar sem alteração de foto não chama o endpoint de foto', () => {
      component.salvar();
      http.expectOne({ method: 'PATCH', url: URL_PERFIL }).flush(PERFIL);
      http.expectNone(URL_FOTO);
    });

    it('remover uma foto nova ainda não enviada só descarta localmente', () => {
      selecionarFoto(component, arquivo());
      component.removerFoto();

      expect(component.fotoPendente()).toBeNull();
      expect(component.remocaoPendente()).toBe(false);
      expect(component.fotoExibida()).toBe(PERFIL.foto);
      http.expectNone(URL_FOTO);
    });

    it('erro no upload mostra mensagem e mantém os campos e a foto pendente', () => {
      component.firstName.set('Joana');
      selecionarFoto(component, arquivo());
      component.salvar();

      http.expectOne({ method: 'PATCH', url: URL_PERFIL }).flush({ ...PERFIL, first_name: 'Joana' });
      http.expectOne({ method: 'POST', url: URL_FOTO }).flush(
        { foto: ['O arquivo enviado não é uma imagem válida.'] },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(component.erroFoto()).toContain('Os dados do perfil foram salvos');
      expect(component.erroFoto()).toContain('não é uma imagem válida');
      expect(component.firstName()).toBe('Joana');
      expect(component.fotoPendente()).toBeTruthy();
      expect(component.salvando()).toBe(false);
    });

    it('erro no PATCH não envia a foto', () => {
      selecionarFoto(component, arquivo());
      component.salvar();

      http.expectOne({ method: 'PATCH', url: URL_PERFIL }).flush(
        { crefito: ['Este CREFITO já está em uso por outro profissional.'] },
        { status: 400, statusText: 'Bad Request' }
      );

      http.expectNone(URL_FOTO);
      expect(component.fotoPendente()).toBeTruthy();
    });
  });

  describe('alterações não salvas', () => {
    it('editar e desfazer manualmente um campo volta a ficar limpo', () => {
      component.firstName.set('Joana');
      expect(component.temAlteracoesPendentes()).toBe(true);

      component.firstName.set('João');
      expect(component.temAlteracoesPendentes()).toBe(false);
    });

    it('telefone com máscara não é considerado alteração', () => {
      component.telefone.set('(11) 99999-9999');
      expect(component.temAlteracoesPendentes()).toBe(false);
    });

    it('cancelar sem alterações navega direto, sem modal', async () => {
      await component.cancelar();
      expect(component.confirmacao()).toBeNull();
      await vi.waitFor(() => expect(router.url).toBe('/agenda'));
    });

    it('cancelar com alterações abre o modal; confirmar descarta e volta para a foto antiga', async () => {
      component.firstName.set('Joana');
      selecionarFoto(component, arquivo());

      const cancelamento = component.cancelar();
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('app-confirm-modal')).toBeTruthy();

      component.responderConfirmacao(true);
      await cancelamento;

      expect(component.firstName()).toBe('João');
      expect(component.fotoPendente()).toBeNull();
      expect(component.fotoExibida()).toBe(PERFIL.foto);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
      expect(component.temAlteracoesPendentes()).toBe(false);
      expect(router.url).toBe('/perfil');
    });

    it('cancelar com alterações e fechar o modal mantém tudo', async () => {
      component.firstName.set('Joana');

      const cancelamento = component.cancelar();
      component.responderConfirmacao(false);
      await cancelamento;

      expect(component.firstName()).toBe('Joana');
      expect(component.temAlteracoesPendentes()).toBe(true);
    });

    it('guard bloqueia a navegação se o modal for cancelado', async () => {
      component.firstName.set('Joana');

      const navegacao = router.navigateByUrl('/agenda');
      await vi.waitFor(() => expect(component.confirmacao()?.titulo).toBe('Sair sem salvar?'));

      component.responderConfirmacao(false);
      expect(await navegacao).toBe(false);
      expect(router.url).toBe('/perfil');
      expect(component.firstName()).toBe('Joana');
    });

    it('guard permite a navegação se o modal for confirmado', async () => {
      component.removerFoto();

      const navegacao = router.navigateByUrl('/agenda');
      await vi.waitFor(() => expect(component.confirmacao()).toBeTruthy());
      component.responderConfirmacao(true);

      expect(await navegacao).toBe(true);
      expect(router.url).toBe('/agenda');
    });

    it('guard não pergunta nada quando não há alterações', async () => {
      expect(await router.navigateByUrl('/agenda')).toBe(true);
    });

    it('beforeunload só bloqueia quando há alterações', () => {
      const limpo = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(limpo);
      expect(limpo.defaultPrevented).toBe(false);

      component.email.set('outro@exemplo.com');
      const sujo = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(sujo);
      expect(sujo.defaultPrevented).toBe(true);
    });
  });
});
