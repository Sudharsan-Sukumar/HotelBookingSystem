/** Mirrors Features/CMS/Models/Promotion.cs (GET api/promotions[/{id}]). */
export interface PromotionResponseDto {
  id: number;
  title: string;
  discountDescription: string;
  couponCode: string;
  validUntil: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

/** Payload shape for POST/PUT api/promotions (Features/CMS/DTOs/PromotionRequestDto.cs). */
export interface PromotionRequestDto {
  title: string;
  discountDescription: string;
  couponCode: string;
  validUntil: string;
  imageUrl: string;
  isActive: boolean;
}
