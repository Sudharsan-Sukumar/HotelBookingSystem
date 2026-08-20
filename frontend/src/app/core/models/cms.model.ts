/** Mirrors Features/CMS/DTOs/ContentDtos.cs — HeroContentResponseDto (GET/PUT api/content/hero). */
export interface HeroContent {
  id: number;
  updatedAt: string;
  heading: string;
  subheading: string;
  backgroundImageUrl: string;
}

/** Payload shape for PUT api/content/hero (HeroContentDto — no id/updatedAt). */
export interface HeroContentRequest {
  heading: string;
  subheading: string;
  backgroundImageUrl: string;
}

/** Mirrors AboutContentResponseDto (GET/PUT api/content/about). */
export interface AboutContent {
  id: number;
  updatedAt: string;
  heading: string;
  subheading: string;
  history: string;
}

/** Payload shape for PUT api/content/about (AboutContentDto). */
export interface AboutContentRequest {
  heading: string;
  subheading: string;
  history: string;
}

/** Mirrors ContactContentResponseDto (GET/PUT api/content/contact). */
export interface ContactContent {
  id: number;
  updatedAt: string;
  phone: string;
  email: string;
  address: string;
}

/** Payload shape for PUT api/content/contact (ContactContentDto). */
export interface ContactContentRequest {
  phone: string;
  email: string;
  address: string;
}

/** Mirrors HelpArticleResponseDto (GET api/content/help-articles[/{id}]). */
export interface HelpArticle {
  id: number;
  title: string;
  category: string;
  content: string;
  tags: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/** Payload shape for POST/PUT api/content/help-articles (HelpArticleRequestDto). */
export interface HelpArticleRequest {
  title: string;
  category: string;
  content: string;
  tags?: string | null;
  isPublished: boolean;
}

/** Mirrors Features/CMS/DTOs/SystemSettingDto.cs — used for GET/POST/PUT api/systemsettings. */
export interface SystemSetting {
  key: string;
  value: string;
  updatedAt?: string | null;
}
