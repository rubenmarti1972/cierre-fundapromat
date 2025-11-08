// src/app/gratitude/services/post.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs
} from '@angular/fire/firestore';

import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from '@angular/fire/storage';

import { Observable } from 'rxjs';
import { Post } from '../models/post';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PostService {

  private firestore = inject(Firestore);
  private storage = inject(Storage);

  private readonly useStorage = !!(environment as any).useFirebaseStorage;

  private collectionRef = collection(this.firestore, 'posts');

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Crear post + subir imagen si existe
   */
  async create(post: Partial<Post>, file?: File): Promise<void> {
    try {
      let photoUrl = '';
      let photoPath: string | null = null;

      if (file) {
        if (this.useStorage) {
          console.log('📤 Subiendo imagen a Firebase Storage:', file.name);

          const timestamp = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
          photoPath = `photos/${timestamp}_${safeName}`;

          const storageRef = ref(this.storage, photoPath);
          const uploadTask = uploadBytesResumable(storageRef, file);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed', () => {}, reject, resolve);
          });

          photoUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('✅ Imagen subida:', photoUrl);
        } else {
          console.log('📸 Convertiendo imagen a Data URL (Storage deshabilitado):', file.name);
          photoUrl = await this.fileToDataUrl(file);
        }
      }

      await addDoc(this.collectionRef, {
        name: post.name ?? '',
        message: post.message ?? '',
        photoUrl,
        photoPath,
        createdAt: serverTimestamp()
      });

      console.log('✅ Post guardado');

    } catch (error: any) {
      console.error('❌ Error al crear post:', error);
      throw new Error(error.message || 'Error al crear post');
    }
  }

  /**
   * Stream en tiempo real del mural
   */
  stream(): Observable<Post[]> {
    const q = query(this.collectionRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Post[]>;
  }

  /**
   * Eliminar un post (y su imagen si existe)
   * Soporta AMBAS firmas para compatibilidad:
   *  - deleteById(id, photoPath?)
   *  - deleteById(id, photoUrl?, photoPath?)
   */
  async deleteById(id: string, a?: string | null, b?: string | null): Promise<void> {
    try {
      // Si hay 3 argumentos, el 3ro es photoPath; si no, el 2do puede ser photoPath
      const photoPath = (b !== undefined ? b : a) ?? null;

      if (this.useStorage && photoPath && photoPath.trim().length > 0) {
        try {
          await deleteObject(ref(this.storage, photoPath));
        } catch (e) {
          console.warn('⚠️ No se encontró/borro la imagen:', photoPath, e);
        }
      }

      await deleteDoc(doc(this.firestore, 'posts', id));
      console.log('🗑️ Post eliminado');

    } catch (error) {
      console.error('❌ Error al eliminar:', error);
      throw error;
    }
  }

  /**
   * Limpiar mural completo
   */
  async deleteAll(): Promise<void> {
    const snapshot = await getDocs(this.collectionRef);

    const deletes = snapshot.docs.map(d => {
      const data = d.data() as Post;
      // Llama explícitamente con 3 args para que el 3ro sea el photoPath
      return this.deleteById(d.id, undefined, data.photoPath ?? null);
    });

    await Promise.all(deletes);
    console.log('🧹 Mural limpiado');
  }
}
