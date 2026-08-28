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
    this.atualizarNav(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.atualizarNav(event.urlAfterRedirects);
    });
  }

  private atualizarNav(url: string) {
    this.mostrarNav.set(!url.startsWith('/login'));
  }
}
