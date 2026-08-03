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

    salvarTokens(access: string, refresh: string) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    }

    getAccessToken(): string | null {
        return localStorage.getItem('access_token');
    }

    estaAutenticado(): boolean {
        return !!this.getAccessToken();
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
}
