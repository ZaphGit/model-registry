import type { CapabilityProfile, IntegrationMetadata, Model, ModelRoute, PricingRecord, SuitabilityProfile } from './types';

export interface ProvenanceSnapshot {
  model: {
    sourceUrls: string[];
    notes?: string;
    lastVerifiedAt?: string;
  };
  capability?: {
    sourceUrl?: string;
    notes?: string;
    lastVerifiedAt?: string;
  };
  suitability?: {
    notes?: string;
    lastReviewedAt?: string;
  };
  routes: Array<{
    id: string;
    label: string;
    sourceUrl?: string;
    notes?: string;
    lastVerifiedAt?: string;
    pricing: Array<{
      id: string;
      billingUnit: PricingRecord['billingUnit'];
      sourceUrl: string;
      notes?: string;
      lastVerifiedAt: string;
    }>;
    integrations: Array<{
      id: string;
      integrationTarget: IntegrationMetadata['integrationTarget'];
      notes?: string;
    }>;
  }>;
}

export function extractProvenance(detail: {
  model: Model;
  capabilityProfile: CapabilityProfile | null;
  suitabilityProfile: SuitabilityProfile | null;
  routes: ModelRoute[];
  pricingRecords: PricingRecord[];
  integrationMetadata: IntegrationMetadata[];
}): ProvenanceSnapshot {
  return {
    model: {
      sourceUrls: detail.model.sourceUrls ?? [],
      notes: detail.model.notes,
      lastVerifiedAt: detail.model.lastVerifiedAt,
    },
    capability: detail.capabilityProfile
      ? {
          sourceUrl: detail.capabilityProfile.sourceUrl,
          notes: detail.capabilityProfile.notes,
          lastVerifiedAt: detail.capabilityProfile.lastVerifiedAt,
        }
      : undefined,
    suitability: detail.suitabilityProfile
      ? {
          notes: detail.suitabilityProfile.notes,
          lastReviewedAt: detail.suitabilityProfile.lastReviewedAt,
        }
      : undefined,
    routes: detail.routes.map((route) => ({
      id: route.id,
      label: route.label,
      sourceUrl: route.sourceUrl,
      notes: route.notes,
      lastVerifiedAt: route.lastVerifiedAt,
      pricing: detail.pricingRecords
        .filter((pricing) => pricing.modelRouteId === route.id)
        .map((pricing) => ({
          id: pricing.id,
          billingUnit: pricing.billingUnit,
          sourceUrl: pricing.sourceUrl,
          notes: pricing.notes,
          lastVerifiedAt: pricing.lastVerifiedAt,
        })),
      integrations: detail.integrationMetadata
        .filter((integration) => integration.modelRouteId === route.id)
        .map((integration) => ({
          id: integration.id,
          integrationTarget: integration.integrationTarget,
          notes: integration.notes,
        })),
    })),
  };
}
