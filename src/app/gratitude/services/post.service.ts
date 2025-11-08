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

import { FirebaseError } from '@angular/fire/app';
import { BehaviorSubject, Observable, defer } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Post } from '../models/post';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PostService {

  private firestore = inject(Firestore);
  private storage = inject(Storage);

  private readonly useStorage = !!(environment as any).useFirebaseStorage;

  private collectionRef = collection(this.firestore, 'posts');
  private readonly localStorageKey = 'gratitude-mural-posts';
  private readonly localPosts$ = new BehaviorSubject<Post[]>(this.loadLocalPosts());
  private localMode = false;
  private fallbackLogged = false;

  private readonly firebaseStream$ = defer(() =>
    collectionData(query(this.collectionRef, orderBy('createdAt', 'desc')), { idField: 'id' })
  ).pipe(
    map(posts => (posts as Post[]).map(p => this.withDefaults(p))),
    tap({
      next: () => {
        this.localMode = false;
      }
    }),
    catchError(error => {
      this.activateLocalFallback(error);
      return this.localPosts$;
    })
  );

  /**
   * Crear post + subir imagen si existe
   */
  async create(post: Partial<Post>, file?: File): Promise<void> {
    if (this.localMode) {
      await this.createLocal(post, file);
      return;
    }

    try {
      let photoUrl = '';
      let photoPath: string | null = null;

      if (file) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        photoPath = `photos/${timestamp}_${safeName}`;

        if (this.useStorage) {
          console.log('📤 Subiendo imagen a Firebase Storage:', file.name);
          
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
        country: post.country ?? '',
        message: post.message ?? '',
        photoUrl,
        photoPath,
        createdAt: serverTimestamp()
      });

      console.log('✅ Post guardado');

    } catch (error: any) {
      if (this.shouldFallback(error)) {
        console.warn('⚠️ No fue posible crear el post en Firestore. Activando modo local.', error);
        this.activateLocalFallback(error);
        await this.createLocal(post, file);
        return;
      }

      console.error('❌ Error al crear post:', error);
      throw new Error(error?.message || 'Error al crear post');
    }
  }

  /**
   * Stream en tiempo real del mural
   */
  stream(): Observable<Post[]> {
    if (this.localMode) {
      return this.localPosts$.asObservable();
    }

    return this.firebaseStream$;
  }

  /**
   * Eliminar un post (y su imagen si existe)
   * Soporta AMBAS firmas para compatibilidad:
   *  - deleteById(id, photoPath?)
   *  - deleteById(id, photoUrl?, photoPath?)
   */
  async deleteById(id: string, a?: string | null, b?: string | null): Promise<void> {
    if (this.localMode) {
      this.removeLocal(id);
      return;
    }

    try {
      // Si hay 3 argumentos, el 3ro es photoPath; si no, el 2do puede ser photoPath
      const photoPath = (b !== undefined ? b : a) ?? null;

      if (this.useStorage && photoPath && photoPath.trim().length > 0) {
        try {
          await deleteObject(ref(this.storage, photoPath));
        } catch (e) {
          console.warn('⚠️ No se encontró/borró la imagen:', photoPath, e);
        }
      }

      await deleteDoc(doc(this.firestore, 'posts', id));
      console.log('🗑️ Post eliminado');

    } catch (error) {
      if (this.shouldFallback(error)) {
        console.warn('⚠️ Error de permisos al eliminar. Continuando en modo local.', error);
        this.activateLocalFallback(error);
        this.removeLocal(id);
        return;
      }

      console.error('❌ Error al eliminar:', error);
      throw error;
    }
  }

  /**
   * Limpiar mural completo
   */
  async deleteAll(): Promise<void> {
    if (this.localMode) {
      this.localPosts$.next([]);
      this.persistLocalPosts();
      console.log('🧹 Mural limpiado (modo local)');
      return;
    }

    const snapshot = await getDocs(this.collectionRef);

    const deletes = snapshot.docs.map(d => {
      const data = d.data() as Post;
      // Llama explícitamente con 3 args para que el 3ro sea el photoPath
      return this.deleteById(d.id, undefined, data.photoPath ?? null);
    });

    await Promise.all(deletes);
    console.log('🧹 Mural limpiado');
  }

  private async createLocal(post: Partial<Post>, file?: File): Promise<void> {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let photoUrl: string | null = null;

    if (file) {
      photoUrl = await this.fileToDataUrl(file);
    }

    const entry: Post = {
      id,
      name: post.name ?? '',
      country: post.country ?? '',
      message: post.message ?? '',
      photoUrl,
      photoPath: null,
      createdAt: Date.now()
    };

    const posts = [entry, ...this.localPosts$.value].map(p => this.withDefaults(p));
    this.localPosts$.next(posts);
    this.persistLocalPosts();
    console.log('📝 Post guardado en modo local');
  }

  private removeLocal(id: string): void {
    const posts = this.localPosts$.value
      .filter(p => p.id !== id)
      .map(p => this.withDefaults(p));
    this.localPosts$.next(posts);
    this.persistLocalPosts();
    console.log('🗑️ Post eliminado (modo local)');
  }

  private shouldFallback(error: any): boolean {
    const code = (error as FirebaseError)?.code ?? error?.code;
    return code === 'permission-denied'
      || code === 'unauthenticated'
      || code === 'failed-precondition'
      || code === 'storage/unauthorized'
      || code === 'storage/quota-exceeded';
  }

  private activateLocalFallback(error: any): void {
    if (this.localMode) {
      return;
    }

    this.localMode = true;
    if (!this.fallbackLogged) {
      console.warn('⚠️ Activando modo local para el mural. Las publicaciones solo se guardarán en este navegador.', error);
      this.fallbackLogged = true;
    }
  }

  private loadLocalPosts(): Post[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(this.localStorageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as Post[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(p => this.withDefaults(p));
    } catch (error) {
      console.warn('No se pudo leer el mural local:', error);
      return [];
    }
  }

  private persistLocalPosts(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = JSON.stringify(this.localPosts$.value.map(p => this.withDefaults(p)));
      window.localStorage.setItem(this.localStorageKey, serialized);
    } catch (error) {
      console.warn('No se pudo guardar el mural local:', error);
    }
  }

  private async fileToDataUrl(file: File): Promise<string> {
    const reader = new FileReader();
    const result = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    return result;
  }

  private withDefaults(post: Partial<Post>): Post {
    return {
      id: post.id ?? '',
      name: post.name ?? '',
      country: post.country ?? '',
      message: post.message ?? '',
      photoUrl: post.photoUrl ?? null,
      photoPath: post.photoPath ?? null,
      createdAt: post.createdAt
    };
  }
}