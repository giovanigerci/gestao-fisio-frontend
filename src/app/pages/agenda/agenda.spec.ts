import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Agenda } from './agenda';
import { formatarDataISO } from '../../shared/utils/datas';

describe('Agenda — semana de domingo a sábado', () => {
  let component: Agenda;

  function semanaDe(dia: Date) {
    component.dataReferencia.set(dia);
    return {
      inicio: formatarDataISO(component.inicioSemana()),
      fim: formatarDataISO(component.fimSemana()),
      dias: component.diasDaSemana().map((d) => d.diaSemanaAbrev),
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    component = TestBed.createComponent(Agenda).componentInstance;
  });

  it('a semana começa no domingo e termina no sábado', () => {
    const semana = semanaDe(new Date(2026, 9, 7)); // quarta, 07/10/2026

    expect(semana.inicio).toBe('2026-10-04');
    expect(semana.fim).toBe('2026-10-10');
    expect(semana.dias).toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
  });

  it('no domingo, a semana começa no próprio dia', () => {
    expect(semanaDe(new Date(2026, 9, 4)).inicio).toBe('2026-10-04');
  });

  it('no sábado, a semana ainda é a que começou no domingo anterior', () => {
    expect(semanaDe(new Date(2026, 9, 10)).inicio).toBe('2026-10-04');
  });
});
