import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PacienteForm } from './paciente-form';

describe('PacienteForm — limite do histórico médico', () => {
  let fixture: ComponentFixture<PacienteForm>;
  let component: PacienteForm;

  function contador(): HTMLElement | null {
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.contador-historico');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(PacienteForm);
    component = fixture.componentInstance;
  });

  it('o campo usa o mesmo limite do backend (10.000)', () => {
    fixture.detectChanges();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');

    expect(textarea.maxLength).toBe(10000);
  });

  it('contador fica escondido até 80% do limite', () => {
    component.historicoMedico.set('a'.repeat(7999));

    expect(contador()).toBeNull();
  });

  it('contador aparece a partir de 80% do limite, formatado em pt-BR', () => {
    component.historicoMedico.set('a'.repeat(8000));

    expect(contador()?.textContent?.trim()).toBe('8.000 / 10.000 caracteres');
    expect(contador()?.classList).not.toContain('contador-historico--limite');
  });

  it('contador fica em destaque ao atingir o limite', () => {
    component.historicoMedico.set('a'.repeat(10000));

    expect(contador()?.classList).toContain('contador-historico--limite');
  });
});
