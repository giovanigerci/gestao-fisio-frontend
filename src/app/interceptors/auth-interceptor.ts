import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const token = authService.getAccessToken();

  const reqComToken = token
  ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
  : req;

  const ehRequisicaoDeAuth = req.url.includes('/auth/token')

  return next(reqComToken).pipe(
    catchError((erro: HttpErrorResponse) => {
      const temRefresh = !!authService.getRefreshToken();

      if (erro.status === 401 && temRefresh && !ehRequisicaoDeAuth) {
        return authService.renovarToken().pipe(
          switchMap((resposta) => {
            authService.salvarAccessToken(resposta.access);
            const reqRenovada = req.clone({
              setHeaders: { Authorization: `Bearer ${resposta.access}` },
            });
            return next(reqRenovada);
          }),
          catchError((erroRefresh) => {
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => erroRefresh);
          })
        );
      }
      if (erro.status === 401 && !ehRequisicaoDeAuth) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => erro);
    })
  );
};
