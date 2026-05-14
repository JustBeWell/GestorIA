import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GiaConversationSummary, GiaFileItem, GiaMessageItem, GiaMode } from '../../../core/models/gia.models';
import { GiaService } from '../../../core/services/gia.service';
import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-gia-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IntranetSidebarComponent],
  templateUrl: './gia-page.component.html',
  styleUrl: './gia-page.component.css',
})
export class GiaPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('messageList') private readonly messageList?: ElementRef<HTMLDivElement>;

  private readonly giaService = inject(GiaService);

  protected readonly conversations = signal<GiaConversationSummary[]>([]);
  protected readonly messages = signal<GiaMessageItem[]>([]);
  protected readonly files = signal<GiaFileItem[]>([]);
  protected readonly activeConversationId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly mobileSidebarOpen = signal(false);

  protected readonly busy = computed(() => this.sending() || this.deletingId() !== null);
  protected readonly userFiles = computed(() => this.files().filter(f => f.tipo === 'upload'));

  protected prompt = '';
  protected mode: GiaMode = 'respuesta';
  protected selectedFiles: File[] = [];

  private shouldScroll = false;

  ngOnInit(): void {
    this.loadConversations();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messageList?.nativeElement) {
      const el = this.messageList.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  protected loadConversations(): void {
    this.loading.set(true);
    this.error.set(null);
    this.giaService.listConversations().subscribe({
      next: (items) => {
        this.conversations.set(items);
        this.loading.set(false);
        if (items.length) {
          this.openConversation(items[0].id);
        } else {
          this.createConversation();
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar GIA.');
      },
    });
  }

  protected createConversation(): void {
    if (this.busy()) return;
    this.giaService.createConversation().subscribe({
      next: (conversation) => {
        this.conversations.update((items) => [
          conversation,
          ...items.filter((item) => item.id !== conversation.id),
        ]);
        this.activeConversationId.set(conversation.id);
        this.messages.set([]);
        this.files.set([]);
        this.mobileSidebarOpen.set(false);
      },
      error: () => this.error.set('No se pudo crear la conversación.'),
    });
  }

  protected openConversation(id: string): void {
    if (this.busy() && this.activeConversationId() !== id) return;
    this.activeConversationId.set(id);
    this.giaService.getConversation(id).subscribe({
      next: (conversation) => {
        this.messages.set(conversation.messages);
        this.files.set(conversation.files);
        this.shouldScroll = true;
        this.mobileSidebarOpen.set(false);
      },
      error: () => this.error.set('No se pudo abrir la conversación.'),
    });
  }

  protected deleteConversation(event: Event, id: string): void {
    event.stopPropagation();
    if (this.busy()) return;
    const target = this.conversations().find((c) => c.id === id);
    const label = target?.titulo ?? 'esta conversación';
    if (!confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.deletingId.set(id);
    this.error.set(null);
    this.giaService.deleteConversation(id).subscribe({
      next: () => {
        const remaining = this.conversations().filter((c) => c.id !== id);
        this.conversations.set(remaining);
        this.deletingId.set(null);
        if (this.activeConversationId() === id) {
          this.messages.set([]);
          this.files.set([]);
          this.activeConversationId.set(null);
          if (remaining.length) {
            this.openConversation(remaining[0].id);
          } else {
            this.createConversation();
          }
        }
      },
      error: () => {
        this.deletingId.set(null);
        this.error.set('No se pudo eliminar la conversación.');
      },
    });
  }

  protected setMode(mode: GiaMode): void {
    if (this.busy()) return;
    this.mode = mode;
  }

  protected onFilesSelected(event: Event): void {
    if (this.busy()) return;
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files ?? []);
  }

  protected clearFiles(): void {
    this.selectedFiles = [];
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  protected onPromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected send(): void {
    const text = this.prompt.trim();
    const conversationId = this.activeConversationId();
    if (!text || !conversationId || this.busy()) {
      return;
    }

    const filesToSend = this.selectedFiles;
    const tempId = `tmp-${Date.now()}`;

    const optimisticFiles: GiaFileItem[] = filesToSend.map((file, idx) => ({
      id: `${tempId}-f${idx}`,
      nombre_original: file.name,
      mime_type: file.type || 'application/octet-stream',
      tamano_bytes: file.size,
      tipo: 'upload',
      download_url: '',
      created_at: new Date().toISOString(),
    }));
    const optimisticMessage: GiaMessageItem = {
      id: tempId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
      files: optimisticFiles,
    };
    this.messages.update((items) => [...items, optimisticMessage]);

    this.prompt = '';
    this.clearFiles();

    this.sending.set(true);
    this.error.set(null);
    this.shouldScroll = true;

    this.giaService.sendMessage(conversationId, text, this.mode, filesToSend).subscribe({
      next: (response) => {
        this.messages.update((items) => [
          ...items.filter((m) => m.id !== tempId),
          response.user_message,
          response.assistant_message,
        ]);
        this.files.update((items) => [
          ...response.generated_files,
          ...response.user_message.files,
          ...items,
        ]);
        this.conversations.update((items) => [
          response.conversation,
          ...items.filter((item) => item.id !== response.conversation.id),
        ]);
        this.sending.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        this.messages.update((items) => items.filter((m) => m.id !== tempId));
        this.prompt = text;
        this.error.set(err?.error?.detail ?? 'No se pudo enviar el mensaje a GIA.');
        this.sending.set(false);
      },
    });
  }

  protected toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  protected downloadUrl(file: GiaFileItem): string {
    return this.giaService.downloadUrl(file.download_url);
  }

  protected downloadFile(file: GiaFileItem): void {
    this.giaService.downloadFile(file.id, file.nombre_original);
  }

  protected fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  protected isImage(file: GiaFileItem): boolean {
    return file.mime_type.startsWith('image/');
  }

  protected fileIconType(mimeType: string): 'pdf' | 'image' | 'excel' | 'word' | 'text' | 'zip' | 'file' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (
      mimeType.includes('spreadsheetml') ||
      mimeType.includes('ms-excel') ||
      mimeType === 'text/csv' ||
      mimeType.includes('opendocument.spreadsheet')
    ) return 'excel';
    if (
      mimeType.includes('wordprocessingml') ||
      mimeType.includes('msword') ||
      mimeType.includes('opendocument.text')
    ) return 'word';
    if (mimeType.startsWith('text/')) return 'text';
    if (
      mimeType.includes('zip') ||
      mimeType.includes('x-tar') ||
      mimeType.includes('x-7z') ||
      mimeType.includes('x-rar') ||
      mimeType.includes('compressed')
    ) return 'zip';
    return 'file';
  }

  protected formatTime(value: string): string {
    try {
      return new Date(value).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
