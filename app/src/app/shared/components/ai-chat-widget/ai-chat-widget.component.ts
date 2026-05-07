import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewChecked,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { AiChatService, ChatMessage } from '../../../core/services/ai-chat.service';

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-chat-widget.component.html',
  styleUrl: './ai-chat-widget.component.css',
})
export class AiChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly aiChatService = inject(AiChatService);
  private readonly router = inject(Router);
  private routerSub?: Subscription;

  readonly visible = signal(false);
  readonly isOpen = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(false);

  inputText = '';

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.updateVisibility(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateVisibility(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  private updateVisibility(url: string): void {
    const isPublic = url === '/' || url.startsWith('/auth') || url.startsWith('/intro');
    this.visible.set(!isPublic);
    if (isPublic) this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;

    const history = this.messages();
    this.messages.update((msgs) => [...msgs, { role: 'user', content: text }]);
    this.inputText = '';
    this.loading.set(true);

    this.aiChatService.sendMessage(text, history).subscribe({
      next: (res) => {
        this.messages.update((msgs) => [...msgs, { role: 'assistant', content: res.reply }]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            role: 'assistant',
            content: 'Lo siento, no puedo responder en este momento. Por favor, inténtalo de nuevo.',
          },
        ]);
        this.loading.set(false);
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
