// Mirrors HotelBooking.API/Features/CMS/DTOs/ContentDtos.cs

export interface HeroContentResponseDto {
  id: number;
  heading: string;
  subheading: string;
  backgroundImageUrl: string;
  updatedAt: string;
}

export interface AboutContentResponseDto {
  id: number;
  heading: string;
  subheading: string;
  history: string;
  updatedAt: string;
}

export interface ContactContentResponseDto {
  id: number;
  phone: string;
  email: string;
  address: string;
  updatedAt: string;
}
