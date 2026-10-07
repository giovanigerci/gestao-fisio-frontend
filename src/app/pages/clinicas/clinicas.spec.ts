import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Clinicas } from './clinicas';
import { Clinica } from '../../services/clinica.service';

describe('Clinicas', () => {
  let fixture: ComponentFixture<Clinicas>;
  let http: HttpTestingController;

  const clinica = (parcial: Partial<Clinica> = {}): Clinica => ({
    id: 1, profissional: 1, nome: 'Studio Pilates', endereco: 'Rua A, 10', telefone: '',
    valor_por_atendimento: '80.00', ativo: true, cor: 2, atendimentos_mes: 12, receita_mes: '960.00',
    ...parcial,
  });

  function responder(clinicas: Clinica[]) {
    http.expectOne((req) => req.url.endsWith('/clinicas/')).flush({ count: clinicas.length, next: null, previous: null, results: clinicas });
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (no: Element) => no.textContent!.replace(/\s+/g, ' '); // moeda usa espaço não separável

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Clinicas);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it('mostra um card por clínica com o valor e os números do mês', () => {
    responder([clinica(), clinica({ id: 2, nome: 'Movi', cor: 3 })]);
    const card = el().querySelector('.clinica-card')!;

    expect(el().querySelectorAll('.clinica-card').length).toBe(2);
    expect(texto(card)).toContain('Studio Pilates');
    expect(texto(card)).toContain('R$ 80,00');
    expect(texto(card)).toContain('12 atendimentos');
    expect(texto(card)).toContain('R$ 960,00');
  });

  it('cada card usa a cor guardada da clínica', () => {
    responder([clinica({ cor: 4 })]);

    expect((el().querySelector('.clinica-card') as HTMLElement).style.getPropertyValue('--cor-clinica')).toBe('var(--color-clinic-4)');
  });

  it('o card inteiro leva à edição da clínica', () => {
    responder([clinica({ id: 7 })]);

    expect(el().querySelector('.clinica-link')!.getAttribute('href')).toBe('/clinicas/7/editar');
  });

  it('clínica inativa fica esmaecida e com o selo de inativa', () => {
    responder([clinica({ ativo: false })]);
    const card = el().querySelector('.clinica-card')!;

    expect(card.classList).toContain('clinica-card--inativa');
    expect(card.querySelector('app-badge')).toBeTruthy();
  });

  it('o card de nova clínica fica no fim da lista', () => {
    responder([clinica()]);

    expect(el().querySelector('.clinica-nova')!.textContent).toContain('Nova clínica');
  });

  it('sem clínicas, o card de cadastro vira o estado vazio', () => {
    responder([]);

    expect(el().querySelector('.clinica-card')).toBeNull();
    expect(el().querySelector('.clinica-nova-item--vazio')!.textContent).toContain('Cadastre sua primeira clínica');
  });

  it('excluir pede confirmação e tira a clínica da lista', () => {
    responder([clinica(), clinica({ id: 2, nome: 'Movi' })]);

    (el().querySelector('.clinica-excluir') as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.componentInstance.confirmarExclusaoModal();
    http.expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/clinicas/1/')).flush(null);
    fixture.detectChanges();

    expect(el().querySelectorAll('.clinica-card').length).toBe(1);
    expect(el().querySelector('.page-counter')!.textContent).toContain('1 cadastrada');
  });
});
