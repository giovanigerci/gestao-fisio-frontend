import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { PerfilService } from '../../services/perfil.service';
import { ClinicaService } from '../../services/clinica.service';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  private auth = inject(Auth);
  private router = inject(Router);
  readonly perfilService = inject(PerfilService);
  private clinicaService = inject(ClinicaService);

  clinicasCount = signal<number | null>(null);

  constructor() {
    this.perfilService.carregar();
    this.clinicaService.listar().subscribe({
      next: (resp) => this.clinicasCount.set(resp.count),
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
