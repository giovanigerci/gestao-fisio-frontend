import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, throwError, retry, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { PerfilService } from '../services/perfil.service';
import { SKIP_AUTH_RETRY } from './auth-context';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const perfilService = inject(PerfilService);

  const reqComCredenciais = req.clone({ withCredentials: true });
  const requisicaoToken = req.url.includes('/auth/token/');
  const skipRetry = req.context.get(SKIP_AUTH_RETRY);

  return next(reqComCredenciais).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === 401 && !requisicaoToken && !skipRetry) {
        return http
          .post(`${environment.apiUrl}/auth/token/refresh/`, {}, { withCredentials: true })
          .pipe(
            retry({
              count: 3,
              delay: (error, retryCount) => {
                if (error.status === 0 || error.status >= 500) {
                  return timer(retryCount * 3000);
                }
                return throwError(() => error);
              }
            }),
            switchMap(() => next(reqComCredenciais)),
            catchError((erroRefresh: HttpErrorResponse) => {
              if (erroRefresh.status === 401 || erroRefresh.status === 403) {
                perfilService.limpar();
                router.navigate(['/login']);
              }
              return throwError(() => erroRefresh);
            })
          );
      }

      return throwError(() => erro);
    })
  );
};