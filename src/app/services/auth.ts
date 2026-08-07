import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Service()
export class Auth {
    private http = inject(HttpClient);

    login(username: string, password: string) {
        return this.http.post<{ access: string; refresh: string }>(
            `${environment.apiUrl}/auth/token/`, 
            { username, password }
        );
    }

    renovarToken() {
        const refresh = this.getRefreshToken();
        return this.http.post<{ access: string }>(
            `${environment.apiUrl}/auth/token/refresh/`,
            { refresh }
        );
    }

    salvarTokens(access: string, refresh: string) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    }

    salvarAccessToken(access: string) {
        localStorage.setItem('access_token', access);
    }

    getAccessToken(): string | null {
        return localStorage.getItem('access_token');
    }

    getRefreshToken(): string | null {
        return localStorage.getItem('refresh_token');
    }

    estaAutenticado(): boolean {
        return !!this.getAccessToken();
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
}
