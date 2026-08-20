/** Mirrors Features/AI/DTOs/ChatDtos.cs exactly. */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatTurn[];
}

export interface ChatResponse {
  reply: string;
}
