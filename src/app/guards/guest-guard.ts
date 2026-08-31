import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient, HttpContext } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_AUTH_RETRY } from '../interceptors/auth-interceptor';

export const guestGuard: CanActivateFn = (route, state) => {
  const http = inject(HttpClient);
  const router = inject(Router);

  return http.get(`${environment.apiUrl}/auth/me/`, {
    withCredentials: true,
    context: new HttpContext().set(SKIP_AUTH_RETRY, true),
  }).pipe(
    map(() => {
      router.navigate(['/agenda']);
      return false;
    }),
    catchError(() => {
      return of(true);
    })
  );
};
