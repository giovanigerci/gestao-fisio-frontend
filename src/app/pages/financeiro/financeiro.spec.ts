import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Financeiro } from './financeiro';

describe('Financeiro', () => {
  let component: Financeiro;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 31, 22, 30));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    component = TestBed.createComponent(Financeiro).componentInstance;
  });

  afterEach(() => vi.useRealTimers());

  it('usa a data local de hoje, não a data UTC', () => {
    expect(component.dataReferencia()).toBe('2026-01-31');
    expect(component.periodoLabel()).toBe('Janeiro 2026');
  });

  it('avança e volta um mês sem pular fevereiro a partir do dia 31', () => {
    component.proximoPeriodo();
    expect(component.periodoLabel()).toBe('Fevereiro 2026');

    component.proximoPeriodo();
    expect(component.periodoLabel()).toBe('Março 2026');

    component.periodoAnterior();
    expect(component.periodoLabel()).toBe('Fevereiro 2026');
  });

  it('navega por semana em passos de 7 dias', () => {
    component.trocarPeriodo('semana');
    component.proximoPeriodo();
    expect(component.dataReferencia()).toBe('2026-02-07');
  });
});
