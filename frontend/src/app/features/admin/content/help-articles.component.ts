import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { HelpArticle } from '../../../core/models/cms.model';

/**
 * New Help Center Articles screen (previously missing) — full CRUD against
 * Features/CMS/Controllers/ContentController.cs help-articles endpoints
 * (GET/POST/PUT/DELETE api/content/help-articles[/{id}]). List + inline
 * add/edit form on one component (mode flag), consistent with the
 * content.component.html tile pattern this is linked from.
 */
@Component({
  selector: 'app-admin-help-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminTopNavComponent],
  templateUrl: './help-articles.component.html',
  styleUrls: ['./help-articles.component.scss']
})
export class HelpArticlesComponent implements OnInit {
  articles: HelpArticle[] = [];
  loading = false;

  showForm = false;
  editingId: number | null = null;
  saving = false;

  title = '';
  category = '';
  content = '';
  tags = '';
  isPublished = true;

  constructor(
    private contentService: ContentService,
    private ui: GlobalUiService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.contentService.getHelpArticles(false).subscribe({
      next: (res) => {
        this.articles = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openAdd(): void {
    this.editingId = null;
    this.title = '';
    this.category = '';
    this.content = '';
    this.tags = '';
    this.isPublished = true;
    this.showForm = true;
  }

  openEdit(article: HelpArticle): void {
    this.editingId = article.id;
    this.title = article.title;
    this.category = article.category;
    this.content = article.content;
    this.tags = article.tags || '';
    this.isPublished = article.isPublished;
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.saving = true;
    const dto = {
      title: this.title,
      category: this.category,
      content: this.content,
      tags: this.tags || null,
      isPublished: this.isPublished
    };

    const request$ = this.editingId
      ? this.contentService.updateHelpArticle(this.editingId, dto)
      : this.contentService.createHelpArticle(dto);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editingId = null;
        this.ui.showToast(this.editingId ? 'Article updated successfully.' : 'Article created successfully.');
        this.load();
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  deleteArticle(article: HelpArticle): void {
    if (!confirm(`Delete help article "${article.title}"?`)) {
      return;
    }
    this.contentService.deleteHelpArticle(article.id).subscribe({
      next: () => {
        this.ui.showToast('Article deleted successfully.');
        this.load();
      }
    });
  }
}
