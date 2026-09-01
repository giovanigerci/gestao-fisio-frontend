import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PerfilService } from '../../services/perfil.service';
import { PacienteService } from '../../services/paciente.service';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly perfilService = inject(PerfilService);
  private pacienteService = inject(PacienteService);

  pacientesCount = signal<number | null>(null);

  constructor() {
    this.perfilService.carregar();
    this.pacienteService.listar().subscribe({
      next: (resp) => this.pacientesCount.set(resp.count),
    });
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }
}
