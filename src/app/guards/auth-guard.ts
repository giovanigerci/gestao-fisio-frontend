import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { PerfilService } from '../services/perfil.service';

export const authGuard: CanActivateFn = (route, state) => {
  const perfilService = inject(PerfilService);
  const router = inject(Router);

  return perfilService.carregar().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};
