import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Service()
export class Auth {
    private http = inject(HttpClient);

    login(username: string, password: string, manterConectado: boolean = false) {
        return this.http.post(
            `${environment.apiUrl}/auth/token/`,
            { username, password, manter_conectado: manterConectado },
            { withCredentials: true }
        );
    }

    registrar(dados: { username: string; password: string; telefone: string; especialidade: string; crefito: string }) {
        return this.http.post(
            `${environment.apiUrl}/auth/registrar/`,
            dados,
            { withCredentials: true }
        );
    }

    logout() {
        return this.http.post(
            `${environment.apiUrl}/auth/logout/`,
            {},
            { withCredentials: true }
        );
    }

    perfil() {
        return this.http.get(
            `${environment.apiUrl}/auth/me/`,
            { withCredentials: true }
        );
    }
}
