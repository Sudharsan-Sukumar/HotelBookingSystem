import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ChatRequest, ChatResponse } from '../models/ai-chat.model';

/** Real HTTP client for Features/AI/Controllers/AiChatController.cs (api/ai/chat).
 * The OpenRouter API key never reaches this layer or the browser — the backend holds it. */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly base = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  sendMessage(request: ChatRequest): Observable<ApiResponse<ChatResponse>> {
    return this.http.post<ApiResponse<ChatResponse>>(`${this.base}/chat`, request);
  }
}
