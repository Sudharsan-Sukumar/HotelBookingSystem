import { Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiChatService } from '../../../core/services/ai-chat.service';
import { ChatTurn } from '../../../core/models/ai-chat.model';

interface DisplayMessage extends ChatTurn {
  isError?: boolean;
}

/**
 * Floating "ElegantEnclave Assistant" button + chat panel. An additional feature layered onto the
 * landing page — does not alter any existing landing-page markup, state, or workflow. All AI
 * calls go through AiChatService -> POST /api/ai/chat; the OpenRouter key never reaches this
 * component or the browser at all.
 */
@Component({
  selector: 'app-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chatbot.component.html',
  styleUrls: ['./ai-chatbot.component.scss']
})
export class AiChatbotComponent implements AfterViewChecked {
  isOpen = false;
  messages: DisplayMessage[] = [];
  draft = '';
  loading = false;

  @ViewChild('messagesEl') private messagesEl?: ElementRef<HTMLDivElement>;
  private shouldScroll = false;

  readonly welcomeMessage = "Hello! I'm the Elegant Enclave Assistant. I can help with hotel branches, rooms, availability, bookings, cancellation policy, and more. How can I help you today?";

  constructor(private aiChatService: AiChatService, private cdr: ChangeDetectorRef) {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messagesEl) {
      this.messagesEl.nativeElement.scrollTop = this.messagesEl.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.shouldScroll = true;
  }

  close(): void {
    this.isOpen = false;
  }

  clearConversation(): void {
    this.messages = [];
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.loading) return;

    this.messages.push({ role: 'user', content: text });
    this.draft = '';
    this.loading = true;
    this.shouldScroll = true;

    // Only prior user/assistant turns (excluding the message just added, which the backend
    // receives separately) — this session's conversation history only, never persisted.
    const history: ChatTurn[] = this.messages
      .slice(0, -1)
      .map(m => ({ role: m.role, content: m.content }));

    this.aiChatService.sendMessage({ message: text, history }).subscribe({
      next: (res) => {
        this.messages.push({ role: 'assistant', content: res.data?.reply || "I'm sorry, I didn't get a response. Please try again." });
        this.loading = false;
        this.shouldScroll = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.messages.push({ role: 'assistant', content: this.friendlyErrorMessage(err), isError: true });
        this.loading = false;
        this.shouldScroll = true;
        this.cdr.markForCheck();
      }
    });
  }

  private friendlyErrorMessage(err: any): string {
    if (err?.status === 0) {
      return "I'm having trouble connecting right now. Please check your connection and try again.";
    }
    if (err?.status === 429) {
      return "I'm getting a lot of questions right now — please try again in a moment.";
    }
    if (err?.status === 503) {
      return "The assistant is temporarily unavailable. Please try again shortly.";
    }
    if (err?.status === 408 || err?.name === 'TimeoutError') {
      return "That took too long to answer. Please try again.";
    }
    return "Something went wrong on my end. Please try again in a moment.";
  }
}
