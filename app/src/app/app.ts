import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AiChatWidgetComponent } from './shared/components/ai-chat-widget/ai-chat-widget.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AiChatWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
