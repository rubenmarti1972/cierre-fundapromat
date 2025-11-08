import { Component } from "@angular/core";
import { RouterOutlet, RouterLink } from "@angular/router";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="container">
      <div class="row12">
        <div class="col-3">
          <img
            class="logo"
            src="assets/logo-fundapromat.png"
            alt="Logo Fundapromat"
          />
        </div>
        <div class="col-9">
          <h1>Cierre de los jolgorios</h1>
        </div>
      </div>
      <nav class="toolbar">
        <button class="ghost" [routerLink]="['/form']">Formulario</button>
        <button class="ghost" [routerLink]="['/mural']">Mural</button>
      </nav>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .row12{
      display:grid;
      grid-template-columns: repeat(12, minmax(0, 2fr));
      align-items:center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .col-3 { grid-column: span 4; }
    .col-9 { grid-column: span 8; }
    .logo{
      display:block;
      max-width:100%;
      height:auto;
      max-height:40%;
    }
  `]
})
export class AppComponent {}
