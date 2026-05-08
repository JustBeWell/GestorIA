import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GiaConversationDetail,
  GiaConversationSummary,
  GiaMessageResponse,
  GiaMode,
} from '../models/gia.models';

@Injectable({ providedIn: 'root' })
export class GiaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listConversations(): Observable<GiaConversationSummary[]> {
    return this.http.get<GiaConversationSummary[]>(`${this.apiUrl}/ai/gia/conversations`);
  }

  createConversation(title?: string): Observable<GiaConversationSummary> {
    const query = title ? `?title=${encodeURIComponent(title)}` : '';
    return this.http.post<GiaConversationSummary>(`${this.apiUrl}/ai/gia/conversations${query}`, {}).pipe(
      map((conversation) => ({
        ...conversation,
        last_message: conversation.last_message ?? null,
        message_count: conversation.message_count ?? 0,
      })),
    );
  }

  getConversation(id: string): Observable<GiaConversationDetail> {
    return this.http.get<GiaConversationDetail>(`${this.apiUrl}/ai/gia/conversations/${id}`);
  }

  sendMessage(conversationId: string, message: string, mode: GiaMode, files: File[]): Observable<GiaMessageResponse> {
    const formData = new FormData();
    formData.set('message', message);
    formData.set('mode', mode);
    files.forEach((file) => formData.append('files', file, file.name));
    return this.http.post<GiaMessageResponse>(
      `${this.apiUrl}/ai/gia/conversations/${conversationId}/messages`,
      formData,
    );
  }

  downloadUrl(path: string): string {
    return `${this.apiUrl}${path}`;
  }
}
