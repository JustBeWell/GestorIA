import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly http = inject(HttpClient);

  sendMessage(message: string, history: ChatMessage[]): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${environment.apiUrl}/ai/chat`, { message, history });
  }
}
