import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AiChatWidgetComponent } from './shared/components/ai-chat-widget/ai-chat-widget.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AiChatWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Eagerly inject so the effect runs and sets data-theme on boot
  private readonly _theme = inject(ThemeService);
}
