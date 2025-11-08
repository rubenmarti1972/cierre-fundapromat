# Fix Firebase (sin App Check) / No CORS

Este parche hace lo siguiente:
- Elimina App Check en dev (que te estaba lanzando 403 `exchangeDebugToken`).
- Usa sólo el SDK oficial de Firebase (Auth anónima + Firestore + Storage).
- Incluye `environment.ts` con las claves de tu app web `jolgorios-f5048` (ajústalas si es necesario).
- `main.ts` inicia sesión anónima automáticamente.
- `app.config.ts` registra los providers sin App Check.

## Reglas temporales (Firebase Console)
**Firestore Rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Storage Rules:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

> Luego endurece las reglas para producción.

## Arranque
1. `pnpm install` o `npm install`
2. `pnpm start` o `ng serve`
3. Verifica en DevTools que **no** existan llamadas a `content-firebaseappcheck.googleapis.com`.
4. Publica desde tu formulario y valida progreso de subida y creación del documento.
