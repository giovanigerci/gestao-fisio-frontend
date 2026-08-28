import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PerfilService } from '../../services/perfil.service';

@Component({
  selector: 'app-mobile-header',
  imports: [RouterLink],
  templateUrl: './mobile-header.html',
  styleUrl: './mobile-header.css',
})
export class MobileHeader {
  readonly perfilService = inject(PerfilService);
}
