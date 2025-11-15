# Instrucciones para Configurar Firebase Storage

## Problema Identificado

Las imágenes no se guardaban en Firebase Storage porque la opción `useFirebaseStorage` estaba deshabilitada en los archivos de configuración. Esto hacía que las imágenes se guardaran como Data URLs (base64) directamente en Firestore, lo cual:

- Hace los documentos de Firestore muy grandes
- Puede causar problemas al compartir el link
- No es eficiente para imágenes

## Solución Aplicada

### 1. Habilitar Firebase Storage ✅

Se ha cambiado `useFirebaseStorage: true` en:
- `/src/environments/environment.ts` (línea 4)
- `/src/environments/environment.prod.ts` (línea 4)

Ahora las imágenes se subirán a Firebase Storage y solo la URL se guardará en Firestore.

### 2. Configurar CORS en Firebase Storage

Para que las imágenes funcionen correctamente cuando compartes el link, necesitas configurar CORS en Firebase Storage.

#### Opción A: Usando Google Cloud Console (Recomendado)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto: `jolgorios-f5048`
3. Ve a **Cloud Storage** > **Buckets**
4. Haz clic en tu bucket: `jolgorios-f5048.appspot.com`
5. Ve a la pestaña **Permissions** > **CORS configuration**
6. Añade la siguiente configuración:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
  }
]
```

#### Opción B: Usando gsutil (Línea de comandos)

Si tienes instalado Google Cloud SDK, puedes usar el archivo `cors.json` incluido:

```bash
# Instalar Google Cloud SDK si no lo tienes
# https://cloud.google.com/sdk/docs/install

# Autenticarte
gcloud auth login

# Configurar el proyecto
gcloud config set project jolgorios-f5048

# Aplicar configuración CORS
gsutil cors set cors.json gs://jolgorios-f5048.appspot.com
```

### 3. Verificar las Reglas de Seguridad

Asegúrate de que las reglas de Firebase Storage permitan lectura y escritura. En [Firebase Console](https://console.firebase.google.com/):

1. Ve a **Storage** > **Rules**
2. Para desarrollo/pruebas (temporal):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

3. Para producción (recomendado):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Solo usuarios autenticados pueden subir
    match /posts/{postId}/{fileName} {
      allow read: if true;  // Lectura pública
      allow write: if request.auth != null  // Solo usuarios autenticados
                   && request.resource.size < 5 * 1024 * 1024  // Max 5MB
                   && request.resource.contentType.matches('image/.*');  // Solo imágenes
    }
  }
}
```

### 4. Probar la Aplicación

1. Reconstruir la aplicación:
```bash
npm run build
```

2. Servir en desarrollo:
```bash
npm start
```

3. Probar enviando un formulario con una imagen
4. Verificar en Firebase Console > Storage que la imagen se haya subido
5. Verificar en Firebase Console > Firestore que el documento tenga una URL de Firebase Storage (no un Data URL largo)

### 5. Verificar que Funciona

Una vez configurado:

1. Envía un formulario con una imagen
2. Abre la consola del navegador (F12) y busca logs que digan:
   - `📤 Uploading to Firebase Storage: [nombre-archivo]`
   - Esto confirma que está usando Firebase Storage

3. En Firebase Console > Storage, deberías ver las imágenes en la carpeta `posts/`

4. En Firebase Console > Firestore > `posts`, el campo `photoUrl` debe ser una URL que comience con:
   - `https://firebasestorage.googleapis.com/...`

   NO debe ser:
   - `data:image/jpeg;base64,/9j/4AAQ...` (esto sería un Data URL)

## Notas Importantes

### Bucket de Storage

Actualmente configurado: `jolgorios-f5048.appspot.com`

Si tienes problemas, hay un comentario en el código que sugiere usar:
`jolgorios-f5048.firebasestorage.app`

Puedes cambiar esto en los archivos de environment si es necesario.

### Seguridad

⚠️ **Las reglas actuales son MUY ABIERTAS** (allow read, write: if true)

Esto es solo para desarrollo. Para producción:
1. Endurece las reglas de Storage (ver ejemplo arriba)
2. Endurece las reglas de Firestore
3. Considera implementar App Check para proteger contra abuso
4. Valida el tamaño y tipo de archivo en las reglas

### Admin Code

El código de admin (`gratitud2025`) está en el código del cliente, cualquiera puede verlo inspeccionando el código fuente. Para producción, considera validar esto en el backend.

## Troubleshooting

### "Error: Permission denied"
- Verifica las reglas de Storage en Firebase Console
- Asegúrate de que el usuario esté autenticado (la app usa auth anónima)

### "CORS error"
- Aplica la configuración CORS usando una de las opciones arriba
- Espera unos minutos para que se propague la configuración

### "File too large"
- El límite es 5MB
- Comprime la imagen antes de subirla

### Las imágenes no aparecen
- Verifica que `useFirebaseStorage: true` en environment.ts
- Revisa la consola del navegador para ver errores
- Verifica en Firebase Console > Storage que las imágenes se hayan subido

## Contacto

Si tienes problemas, revisa:
1. Firebase Console > Storage > Files (¿las imágenes están ahí?)
2. Firebase Console > Firestore > posts (¿el photoUrl es una URL válida?)
3. Consola del navegador (F12) > Console (¿hay errores?)
4. Consola del navegador (F12) > Network (¿las peticiones a Storage fallan?)
