import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
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
export class GiaPageComponent implements OnInit {
  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  private readonly giaService = inject(GiaService);

  protected readonly conversations = signal<GiaConversationSummary[]>([]);
  protected readonly messages = signal<GiaMessageItem[]>([]);
  protected readonly files = signal<GiaFileItem[]>([]);
  protected readonly activeConversationId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected prompt = '';
  protected mode: GiaMode = 'respuesta';
  protected selectedFiles: File[] = [];

  ngOnInit(): void {
    this.loadConversations();
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
    this.giaService.createConversation().subscribe({
      next: (conversation) => {
        this.conversations.update((items) => [conversation, ...items.filter((item) => item.id !== conversation.id)]);
        this.activeConversationId.set(conversation.id);
        this.messages.set([]);
        this.files.set([]);
      },
      error: () => this.error.set('No se pudo crear la conversación.'),
    });
  }

  protected openConversation(id: string): void {
    this.activeConversationId.set(id);
    this.giaService.getConversation(id).subscribe({
      next: (conversation) => {
        this.messages.set(conversation.messages);
        this.files.set(conversation.files);
      },
      error: () => this.error.set('No se pudo abrir la conversación.'),
    });
  }

  protected setMode(mode: GiaMode): void {
    this.mode = mode;
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files ?? []);
  }

  protected clearFiles(): void {
    this.selectedFiles = [];
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  protected send(): void {
    const text = this.prompt.trim();
    const conversationId = this.activeConversationId();
    if (!text || !conversationId || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.giaService.sendMessage(conversationId, text, this.mode, this.selectedFiles).subscribe({
      next: (response) => {
        this.messages.update((items) => [...items, response.user_message, response.assistant_message]);
        this.files.update((items) => [...response.generated_files, ...response.user_message.files, ...items]);
        this.conversations.update((items) => [
          response.conversation,
          ...items.filter((item) => item.id !== response.conversation.id),
        ]);
        this.prompt = '';
        this.clearFiles();
        this.sending.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'No se pudo enviar el mensaje a GIA.');
        this.sending.set(false);
      },
    });
  }

  protected downloadUrl(file: GiaFileItem): string {
    return this.giaService.downloadUrl(file.download_url);
  }

  protected fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  protected isImage(file: GiaFileItem): boolean {
    return file.mime_type.startsWith('image/');
  }
}
