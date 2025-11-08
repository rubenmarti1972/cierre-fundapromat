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

@Injectable({ providedIn: 'root' })
export class PostService {

  private firestore = inject(Firestore);
  private storage = inject(Storage);

  private collectionRef = collection(this.firestore, 'posts');

  /**
   * Crear post + subir imagen si existe
   */
  async create(post: Partial<Post>, file?: File): Promise<void> {
    try {
      let photoUrl = '';
      let photoPath = '';

      if (file) {
        console.log('📤 Subiendo imagen:', file.name);

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        photoPath = `posts/${timestamp}_${safeName}`;

        const storageRef = ref(this.storage, photoPath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', () => {}, reject, resolve);
        });

        photoUrl = await getDownloadURL(uploadTask.snapshot.ref);
        console.log('✅ Imagen subida:', photoUrl);
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
   */
  async deleteById(id: string, photoPath?: string | null): Promise<void> {
    try {
      if (photoPath) {
        try {
          await deleteObject(ref(this.storage, photoPath));
        } catch (e) {
          console.warn('⚠️ No se encontró imagen para borrar:', photoPath);
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
      return this.deleteById(d.id, data.photoPath ?? null);
    });

    await Promise.all(deletes);
    console.log('🧹 Mural limpiado');
  }
}
