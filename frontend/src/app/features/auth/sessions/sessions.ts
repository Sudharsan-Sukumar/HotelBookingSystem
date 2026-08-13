import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sessions.html',
  styleUrl: './sessions.scss',
})
export class Sessions {
  readonly loggingOutAll = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  logoutAllDevices(): void {
    this.errorMessage.set(null);
    this.loggingOutAll.set(true);

    this.auth.logoutAllDevices().subscribe({
      next: () => {
        this.loggingOutAll.set(false);
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.loggingOutAll.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }
}
