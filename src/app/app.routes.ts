import { Routes } from '@angular/router';
import { PostFormComponent } from './gratitude/components/post-form.component';
import { MuralGridComponent } from './gratitude/components/mural-grid.component';

export const routes: Routes = [
  { path: 'form', component: PostFormComponent },
  { path: 'mural', component: MuralGridComponent },
  { path: '', pathMatch: 'full', redirectTo: 'form' }
];
