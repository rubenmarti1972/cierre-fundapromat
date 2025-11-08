import { environment } from '../../../environments/environment';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PostService } from '../services/post.service';
import { Router } from '@angular/router';

interface MathSticker {
  name: string;
  path: string;
}

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  templateUrl: './post-form.component.html',
  styleUrls: ['./post-form.component.css']
})
export class PostFormComponent {
  loading = false;
  status = '';
  photoFile: File | null = null;
  photoMode: 'upload' | 'sticker' = 'upload';
  selectedSticker: MathSticker | null = null;

  // Stickers matemáticos predefinidos
  mathStickers: MathSticker[] = [
    { name: 'Gato', path: 'assets/stickers/gato.png' },
   
  ];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    message: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
  });

  constructor(private fb: FormBuilder, private posts: PostService, private router: Router) {}

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.photoFile = (input.files && input.files[0]) || null;
    if (this.photoFile) {
      this.selectedSticker = null;
      this.photoMode = 'upload';
    }
  }

  selectSticker(sticker: MathSticker) {
    this.selectedSticker = sticker;
    this.photoFile = null;
    this.photoMode = 'sticker';
  }

  async submit() {
    // Validar formulario
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.status = '⚠️ Completa los campos requeridos.';
      return;
    }

    // Validar que hay foto o sticker
    if (!this.photoFile && !this.selectedSticker) {
      this.status = '⚠️ Debes subir una foto o seleccionar un sticker.';
      return;
    }

    this.loading = true;
    this.status = '📤 Publicando tu mensaje...';
    
    try {
      const { name, message } = this.form.getRawValue();
      
      // Si es sticker, convertir la URL a File
      let fileToUpload = this.photoFile;
      
      if (this.selectedSticker && !this.photoFile) {
        // Descargar el sticker y convertirlo a File
        const response = await fetch(this.selectedSticker.path);
        const blob = await response.blob();
        fileToUpload = new File([blob], this.selectedSticker.name + '.png', { type: 'image/png' });
      }

      await this.posts.create(
        { 
          name: (name || '').trim(), 
          message: (message || '').trim() 
        } as any,
        fileToUpload ?? undefined
      );
      
      this.status = '✅ ¡Publicado exitosamente!';
      this.form.reset();
      this.photoFile = null;
      this.selectedSticker = null;
      this.photoMode = 'upload';
      
      // Redirigir al mural después de 1.5 segundos
      setTimeout(() => {
        this.router.navigateByUrl('/mural');
      }, 1500);
      
    } catch (err: any) {
      console.error(err);
      this.status = '❌ ' + (err?.message ?? 'Error al publicar.');
    } finally {
      this.loading = false;
    }
  }

  get f() { 
    return this.form.controls; 
  }
  
  showError(ctrl: 'name' | 'message', error: string) {
    const c = this.f[ctrl];
    return c.touched && c.errors?.[error];
  }

  unlockAdmin() {
    const code = prompt('🔐 Código de administrador:');
    if (code && code === (environment as any).adminCode) {
      localStorage.setItem('adminUnlocked', '1');
      this.router.navigateByUrl('/mural');
    } else if (code) {
      alert('❌ Código incorrecto');
    }
  }

  tapCount = 0;
  tapTimeout: any;
  
  secretTap() {
    this.tapCount++;
    clearTimeout(this.tapTimeout);
    this.tapTimeout = setTimeout(() => this.tapCount = 0, 1200);

    if (this.tapCount >= 5) {
      this.tapCount = 0;
      this.unlockAdmin();
    }
  }
}