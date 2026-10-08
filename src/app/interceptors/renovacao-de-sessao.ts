import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, retry, shareReplay, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Um refresh de sessão por vez. O backend rotaciona o refresh token e invalida o anterior a cada uso:
 * se duas requisições recebem 401 juntas e cada uma faz o seu refresh, o segundo usa um token já
 * invalidado, recebe 401 e desloga o usuário com a sessão válida. Aqui, quem chega com um refresh
 * em andamento espera o mesmo.
 */
@Service()
export class RenovacaoDeSessao {
  private http = inject(HttpClient);
  private emAndamento: Observable<void> | null = null;

  renovar(): Observable<void> {
    this.emAndamento ??= this.http
      .post(`${environment.apiUrl}/auth/token/refresh/`, {}, { withCredentials: true })
      .pipe(
        // Backend acordando ou fora do ar: tenta de novo; 401/403 é sessão expirada e não adianta repetir
        retry({
          count: 3,
          delay: (erro, tentativa) =>
            erro.status === 0 || erro.status >= 500 ? timer(tentativa * 3000) : throwError(() => erro),
        }),
        map(() => undefined),
        finalize(() => (this.emAndamento = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.emAndamento;
  }
}
