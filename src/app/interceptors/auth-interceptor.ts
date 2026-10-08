import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { PerfilService } from '../services/perfil.service';
import { SKIP_AUTH_RETRY } from './auth-context';
import { RenovacaoDeSessao } from './renovacao-de-sessao';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const perfilService = inject(PerfilService);
  const sessao = inject(RenovacaoDeSessao);

  const reqComCredenciais = req.clone({ withCredentials: true });
  const requisicaoToken = req.url.includes('/auth/token/');
  const skipRetry = req.context.get(SKIP_AUTH_RETRY);

  return next(reqComCredenciais).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === 401 && !requisicaoToken && !skipRetry) {
        // Access token expirado: renova a sessão (um refresh compartilhado) e repete a requisição
        return sessao.renovar().pipe(
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
