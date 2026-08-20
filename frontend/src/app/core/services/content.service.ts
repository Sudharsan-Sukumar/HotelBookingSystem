import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AboutContent,
  AboutContentRequest,
  ContactContent,
  ContactContentRequest,
  HeroContent,
  HeroContentRequest,
  HelpArticle,
  HelpArticleRequest
} from '../models/cms.model';

/** Real HTTP client for Features/CMS/Controllers/ContentController.cs (api/content/*). */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly base = `${environment.apiUrl}/content`;

  constructor(private http: HttpClient) {}

  getHero(): Observable<ApiResponse<HeroContent>> {
    return this.http.get<ApiResponse<HeroContent>>(`${this.base}/hero`);
  }

  updateHero(dto: HeroContentRequest): Observable<ApiResponse<HeroContent>> {
    return this.http.put<ApiResponse<HeroContent>>(`${this.base}/hero`, dto);
  }

  /** Uploads a local image file for the Hero banner and returns its resulting URL — does not
   * itself save anything against the Hero record; pass the returned URL to updateHero(). */
  uploadHeroImage(file: File): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('File', file);
    return this.http.post<ApiResponse<string>>(`${this.base}/hero/image`, formData);
  }

  getAbout(): Observable<ApiResponse<AboutContent>> {
    return this.http.get<ApiResponse<AboutContent>>(`${this.base}/about`);
  }

  updateAbout(dto: AboutContentRequest): Observable<ApiResponse<AboutContent>> {
    return this.http.put<ApiResponse<AboutContent>>(`${this.base}/about`, dto);
  }

  getContact(): Observable<ApiResponse<ContactContent>> {
    return this.http.get<ApiResponse<ContactContent>>(`${this.base}/contact`);
  }

  updateContact(dto: ContactContentRequest): Observable<ApiResponse<ContactContent>> {
    return this.http.put<ApiResponse<ContactContent>>(`${this.base}/contact`, dto);
  }

  getHelpArticles(publishedOnly = false): Observable<ApiResponse<HelpArticle[]>> {
    return this.http.get<ApiResponse<HelpArticle[]>>(`${this.base}/help-articles?publishedOnly=${publishedOnly}`);
  }

  getHelpArticle(id: number): Observable<ApiResponse<HelpArticle>> {
    return this.http.get<ApiResponse<HelpArticle>>(`${this.base}/help-articles/${id}`);
  }

  createHelpArticle(dto: HelpArticleRequest): Observable<ApiResponse<HelpArticle>> {
    return this.http.post<ApiResponse<HelpArticle>>(`${this.base}/help-articles`, dto);
  }

  updateHelpArticle(id: number, dto: HelpArticleRequest): Observable<ApiResponse<HelpArticle>> {
    return this.http.put<ApiResponse<HelpArticle>>(`${this.base}/help-articles/${id}`, dto);
  }

  deleteHelpArticle(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/help-articles/${id}`);
  }
}
