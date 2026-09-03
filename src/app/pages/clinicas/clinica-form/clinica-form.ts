import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClinicaService } from '../../../services/clinica.service';
import { TelefoneMaskDirective } from '../../../shared/directives/telefone-mask.directive';
import { tratarErrosApi, temErro, mensagensErro } from '../../../shared/utils/form-errors';

@Component({
  selector: 'app-clinica-form',
  imports: [TelefoneMaskDirective],
  templateUrl: './clinica-form.html',
  styleUrls: ['../../../../styles/form-page.css', './clinica-form.css'],
})
export class ClinicaForm {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clinicaService = inject(ClinicaService);

  modoEdicao = signal(false);
  clinicaId = signal<number | null>(null);
  carregando = signal(false);
  salvando = signal(false);
  erroGeral = signal('');
  erros = signal<Record<string, string[]>>({});

  // Form fields
  nome = signal('');
  endereco = signal('');
  telefone = signal('');
  valorPorAtendimento = signal('');
  ativo = signal(true);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicao.set(true);
      this.clinicaId.set(+id);
      this.carregarClinica(+id);
    }
  }

  private carregarClinica(id: number) {
    this.carregando.set(true);
    this.clinicaService.buscarPorId(id).subscribe({
      next: (clinica) => {
        this.nome.set(clinica.nome);
        this.endereco.set(clinica.endereco);
        this.telefone.set(clinica.telefone ?? '');
        this.valorPorAtendimento.set(clinica.valor_por_atendimento);
        this.ativo.set(clinica.ativo);
        this.carregando.set(false);
      },
      error: () => {
        this.erroGeral.set('Erro ao carregar dados da clínica.');
        this.carregando.set(false);
      },
    });
  }

  toggleAtivo() {
    this.ativo.update(v => !v);
  }

  salvar() {
    this.erros.set({});
    this.erroGeral.set('');

    if (!this.nome().trim() || !this.endereco().trim() || !this.valorPorAtendimento().trim()) {
      this.erroGeral.set('Preencha todos os campos obrigatórios (*).');
      return;
    }

    this.salvando.set(true);

    const dados = {
      nome: this.nome().trim(),
      endereco: this.endereco().trim(),
      telefone: this.telefone().trim(),
      valor_por_atendimento: this.valorPorAtendimento().trim(),
      ativo: this.ativo(),
    };

    const operacao = this.modoEdicao()
      ? this.clinicaService.atualizar(this.clinicaId()!, dados)
      : this.clinicaService.criar(dados);

    operacao.subscribe({
      next: () => {
        this.router.navigate(['/clinicas']);
      },
      error: (err) => {
        this.salvando.set(false);
        tratarErrosApi(err, this.erros, this.erroGeral, 'Erro ao salvar clínica.');
      },
    });
  }

  temErro(campo: string): boolean {
    return temErro(this.erros(), campo);
  }

  mensagensErro(campo: string): string[] {
    return mensagensErro(this.erros(), campo);
  }

  cancelar() {
    this.router.navigate(['/clinicas']);
  }
}
