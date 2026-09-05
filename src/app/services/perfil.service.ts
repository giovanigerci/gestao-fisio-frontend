import { Service, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap, shareReplay, Observable, of } from 'rxjs';

export interface Perfil {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  telefone: string;
  especialidade: string;
  crefito: string;
  foto: string | null;
}

@Service()
export class PerfilService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth/me/`;

  private _perfil = signal<Perfil | null>(null);
  private _carregando = signal(false);
  private _carregado = false;

  readonly perfil = this._perfil.asReadonly();
  readonly carregando = this._carregando.asReadonly();

  readonly nomeExibicao = computed(() => {
    const p = this._perfil();
    if (!p) return '';
    const nome = [p.first_name, p.last_name].filter(Boolean).join(' ');
    return nome || p.username;
  });

  readonly iniciais = computed(() => {
    const p = this._perfil();
    if (!p) return '';
    if (p.first_name && p.last_name) {
      return (p.first_name[0] + p.last_name[0]).toUpperCase();
    }
    if (p.first_name) return p.first_name[0].toUpperCase();
    if (p.last_name) return p.last_name[0].toUpperCase();
    return p.username[0].toUpperCase();
  });

  private _perfilRequest$: Observable<Perfil> | null = null;


  carregar(): Observable<Perfil> {
    const atual = this._perfil();
    if (atual) return of(atual);

    if (!this._perfilRequest$) {
      this._carregando.set(true);
      this._perfilRequest$ = this.http.get<Perfil>(this.url).pipe(
        tap({
          next: (perfil) => {
            this._perfil.set(perfil);
            this._carregando.set(false);
            this._carregado = true;
            this._perfilRequest$ = null;
          },
          error: () => {
            this._carregado = false;
            this._carregando.set(false);
            this._perfilRequest$ = null;
          }
        }),
        shareReplay(1)
      );
    }
    return this._perfilRequest$;
  }

  atualizar(dados: Partial<Perfil>) {
    return this.http.patch<Perfil>(this.url, dados).pipe(
      tap((perfil) => this._perfil.set(perfil))
    );
  }

  uploadFoto(arquivo: File) {
    const formData = new FormData();
    formData.append('foto', arquivo);

    return this.http.post<{ foto: string }>(`${this.url}foto/`, formData).pipe(
      tap((resp) => {
        const atual = this._perfil();
        if (atual) {
          this._perfil.set({ ...atual, foto: resp.foto });
        }
      })
    );
  }

  removerFoto() {
    return this.http.delete(`${this.url}foto/`).pipe(
      tap(() => {
        const atual = this._perfil();
        if (atual) {
          this._perfil.set({ ...atual, foto: null });
        }
      })
    );
  }
}
