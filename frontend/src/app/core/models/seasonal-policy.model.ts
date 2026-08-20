/** Mirrors Features/CMS/DTOs/SeasonalPolicyDto.cs — GET api/admin/policies. */
export interface SeasonalPolicy {
  id: number;
  seasonName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  fullRefundHours: number;
  partialRefundHours: number;
  partialRefundPercentage: number;
  createdAt: string;
  updatedAt: string;
}

/** Payload shape for POST/PUT api/admin/policies (SeasonalPolicyRequestDto). */
export interface SeasonalPolicyRequest {
  seasonName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  fullRefundHours: number;
  partialRefundHours: number;
  partialRefundPercentage: number;
}

/** Mirrors EffectiveCancellationPolicyDto — GET api/policies/effective. */
export interface EffectiveCancellationPolicy {
  seasonName: string | null;
  fullRefundHours: number;
  partialRefundHours: number;
  partialRefundPercentage: number;
  updatedAt: string | null;
}
