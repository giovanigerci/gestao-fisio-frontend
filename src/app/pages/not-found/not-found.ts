import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="not-found">
      <div class="not-found-content">
        <span class="not-found-code">404</span>
        <h1 class="not-found-title">Página não encontrada</h1>
        <p class="not-found-text">A página que você procura não existe ou foi movida.</p>
        <a routerLink="/agenda" class="not-found-link">Voltar para a agenda</a>
      </div>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }

    .not-found-content {
      text-align: center;
    }

    .not-found-code {
      font-size: 6rem;
      font-weight: 800;
      color: var(--color-primary, #6366f1);
      line-height: 1;
      opacity: 0.3;
    }

    .not-found-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text, #e2e8f0);
      margin: 0.5rem 0;
    }

    .not-found-text {
      color: var(--color-text-secondary, #94a3b8);
      margin-bottom: 2rem;
    }

    .not-found-link {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: var(--color-primary, #6366f1);
      color: white;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .not-found-link:hover {
      opacity: 0.9;
    }
  `]
})
export class NotFound {}
