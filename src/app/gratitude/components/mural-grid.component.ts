// src/app/gratitude/components/mural-grid.component.ts
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Post } from '../models/post';
import { PostService } from '../services/post.service';
import { environment } from '../../../environments/environment';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-mural-grid',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mural-grid.component.html',
  styleUrls: ['./mural-grid.component.css']
})
export class MuralGridComponent implements OnInit, OnDestroy {
  items: Post[] = [];
  sub?: Subscription;

  adminUnlocked = false;
  adminHint = 'Modo Visitante';
  private posts = inject(PostService);

  ngOnInit(): void {
    // ✅ CAMBIO: Verificar si es admin, pero NO redirigir si no lo es
    // Todos pueden ver el mural, solo admin puede editar/borrar
    this.adminUnlocked = localStorage.getItem('adminUnlocked') === '1';
    
    if (this.adminUnlocked) {
      this.adminHint = 'Modo Administrador';
    } else {
      this.adminHint = 'Modo Visitante';
    }

    // ✅ Cargar el mural para TODOS (admin o no)
    this.sub = this.posts.stream().subscribe(list => this.items = list);
  }

  ngOnDestroy(): void { 
    this.sub?.unsubscribe(); 
  }

  unlock() {
    if (this.adminUnlocked) {
      // Desbloquear
      this.adminUnlocked = false;
      this.adminHint = 'Modo Visitante';
      localStorage.removeItem('adminUnlocked');
      return;
    }
    
    // Intentar desbloquear
    const code = prompt('🔐 Código de administrador:');
    if (code && code === (environment as any).adminCode) {
      this.adminUnlocked = true;
      this.adminHint = 'Modo Administrador';
      localStorage.setItem('adminUnlocked','1');
      alert('✅ Acceso de administrador activado');
    } else if (code) {
      alert('❌ Código incorrecto');
    }
  }

  toDate(v: any): Date | null {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'number') return new Date(v);
    if (v instanceof Date) return v;
    return null;
  }

  async remove(it: Post) {
    if (!this.adminUnlocked || !it.id) return;
    if (confirm('⚠️ ¿Eliminar esta publicación?')) {
      await this.posts.deleteById(it.id, it.photoUrl, it.photoPath ?? undefined);
    }
  }

  async clearAll() {
    if (!this.adminUnlocked) return;
    if (confirm('⚠️⚠️ Esto borrará TODO el mural. ¿Estás seguro?')) {
      await this.posts.deleteAll();
    }
  }

  async downloadPNG() {
    const el = document.getElementById('muralContainer');
    if (!el) return;
    const canvas = await html2canvas(el, {useCORS: true, backgroundColor: '#fde7f2', scale: 2});
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.download = `mural-fundapromat-${ts}.png`;
    a.click();
  }
}