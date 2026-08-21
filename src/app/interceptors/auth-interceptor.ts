import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  const reqComCredenciais = req.clone({ withCredentials: true });
  const requisicaoToken = req.url.includes('/auth/token/');

  return next(reqComCredenciais).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === 401 && !requisicaoToken) {
        return http
          .post(`${environment.apiUrl}/auth/token/refresh/`, {}, { withCredentials: true })
          .pipe(
            switchMap(() => next(reqComCredenciais)),
            catchError((erroRefresh) => {
              router.navigate(['/login']);
              return throwError(() => erroRefresh);
            })
          );
      }

      return throwError(() => erro);
    })
  );
};