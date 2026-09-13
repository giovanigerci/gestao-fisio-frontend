import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavBar } from './components/nav-bar/nav-bar';
import { MobileHeader } from './components/mobile-header/mobile-header';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBar, MobileHeader],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);
  mostrarNav = signal(false);

  constructor() {
    this.atualizarNav(window.location.pathname);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      // urlAfterRedirects contem a url completa com query params
      // mas location.pathname também serviria aqui. Vamos usar event.urlAfterRedirects e extrair só o path:
      const path = event.urlAfterRedirects.split('?')[0];
      this.atualizarNav(path);
    });
  }

  private atualizarNav(url: string) {
    this.mostrarNav.set(
      !url.startsWith('/login') && 
      !url.startsWith('/registrar') && 
      !url.startsWith('/esqueci-senha') && 
      !url.startsWith('/redefinir-senha') &&
      !url.startsWith('/termos') &&
      !url.startsWith('/privacidade')
    );
  }
}
