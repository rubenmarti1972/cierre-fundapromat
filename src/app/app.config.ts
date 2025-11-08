import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideAuth, getAuth, Auth, signInAnonymously } from '@angular/fire/auth';

import { environment } from '../environments/environment';

function initAnonymousAuth(auth: Auth) {
  return () => {
    if (auth.currentUser) {
      return Promise.resolve();
    }

    return signInAnonymously(auth).then(() => undefined).catch(error => {
      console.error('No fue posible iniciar sesión anónima en Firebase.', error);
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideAuth(() => getAuth()),
    {
      provide: APP_INITIALIZER,
      useFactory: initAnonymousAuth,
      deps: [Auth],
      multi: true
    }
  ]
};
