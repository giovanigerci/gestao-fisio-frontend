import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacidade',
  imports: [RouterLink],
  templateUrl: './privacidade.html',
  styleUrl: './privacidade.css',
  encapsulation: ViewEncapsulation.None,
})
export class PrivacidadePage {}
