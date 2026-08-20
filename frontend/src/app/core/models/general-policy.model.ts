/** Mirrors Features/CMS/DTOs/GeneralPolicyDto.cs — GET api/content/general-policies[/{type}]. */
export type GeneralPolicyType = 'Privacy' | 'Terms' | 'Modification' | 'CancellationRefund';

export interface GeneralPolicy {
  policyType: GeneralPolicyType;
  title: string;
  content: string;
  updatedAt: string;
}

/** Payload shape for PUT api/content/general-policies/{type} (GeneralPolicyRequestDto). */
export interface GeneralPolicyRequest {
  title: string;
  content: string;
}
