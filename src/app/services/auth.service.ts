import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';


export interface LoginResponse {
    detail?: string;
}

export interface RegistroResponse {
    username: string;
    email: string;
}

@Service()
export class AuthService {
    private http = inject(HttpClient);

    login(username: string, password: string, manterConectado: boolean = false) {
        return this.http.post<LoginResponse>(
            `${environment.apiUrl}/auth/token/`,
            { username, password, manter_conectado: manterConectado },
            { withCredentials: true }
        );
    }

    registrar(dados: { username: string; password: string; telefone: string; especialidade: string; crefito: string }) {
        return this.http.post<RegistroResponse>(
            `${environment.apiUrl}/auth/registrar/`,
            dados,
            { withCredentials: true }
        );
    }

    logout() {
        return this.http.post<{ detail?: string }>(
            `${environment.apiUrl}/auth/logout/`,
            {},
            { withCredentials: true }
        );
    }

    trocarSenha(senhaAtual: string, novaSenha: string, confirmarSenha: string) {
        return this.http.post<{ detail?: string }>(
            `${environment.apiUrl}/auth/trocar-senha/`,
            { senha_atual: senhaAtual, nova_senha: novaSenha, confirmar_senha: confirmarSenha },
            { withCredentials: true }
        );
    }

    solicitarResetSenha(email: string) {
        return this.http.post<{ detail?: string }>(
            `${environment.apiUrl}/auth/esqueci-senha/`,
            { email },
            { withCredentials: true }
        );
    }

    redefinirSenha(uid: string, token: string, novaSenha: string, confirmarSenha: string) {
        return this.http.post<{ detail?: string }>(
            `${environment.apiUrl}/auth/redefinir-senha/`,
            { uid, token, nova_senha: novaSenha, confirmar_senha: confirmarSenha },
            { withCredentials: true }
        );
    }
}
