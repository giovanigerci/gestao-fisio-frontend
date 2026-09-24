import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { PerfilService } from '../services/perfil.service';

export const guestGuard: CanActivateFn = () => {
  const perfilService = inject(PerfilService);
  const router = inject(Router);

  return perfilService.verificarSessao().pipe(
    map((logado) => (logado ? router.createUrlTree(['/agenda']) : true))
  );
};
