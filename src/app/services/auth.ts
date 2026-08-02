import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Service()
export class Auth {
    private http = inject(HttpClient);

    login(username: string, password: string) {
        return this.http.post(`${environment.apiUrl}/auth/token/`, {
            username, 
            password,
        });
    }
}
