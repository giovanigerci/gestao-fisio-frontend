import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-termos',
  imports: [RouterLink],
  templateUrl: './termos.html',
  styleUrl: './termos.css',
  encapsulation: ViewEncapsulation.None,
})
export class TermosPage {}
