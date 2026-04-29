export type RecordStatus = 'draft' | 'reviewed' | 'verified' | 'stale' | 'deprecated';
export type ProviderStatus = 'active' | 'preview' | 'deprecated' | 'disabled';
export type ModelStatus = 'active' | 'preview' | 'deprecated' | 'experimental' | 'disabled';
export type ReleaseStage = 'preview' | 'active' | 'deprecated' | 'legacy' | 'experimental';

export interface Provider {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'proxy' | 'self-hosted';
  websiteUrl?: string;
  docsUrl?: string;
  status: ProviderStatus;
  recordStatus: RecordStatus;
  lastVerifiedAt?: string;
  sourceUrls?: string[];
  notes?: string;
}

export interface Model {
  id: string;
  providerId: string;
  displayName: string;
  apiModelId: string;
  family: string;
  tier: string;
  status: ModelStatus;
  releaseStage: ReleaseStage;
  recordStatus: RecordStatus;
  description?: string;
  notes?: string;
  releasedAt?: string;
  deprecatedAt?: string;
  lastVerifiedAt?: string;
  sourceUrls?: string[];
  aliases?: string[];
}

export interface ModelRoute {
  id: string;
  modelId: string;
  providerId: string;
  routeType: 'direct' | 'proxy' | 'aggregator' | 'internal';
  label: string;
  baseUrl?: string;
  authMethod?: 'api-key' | 'oauth' | 'service-account' | 'none' | 'custom';
  requiredSecrets?: string[];
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  supportsStructuredOutput?: boolean;
  supportsReasoningMode?: boolean;
  status: ProviderStatus;
  recordStatus: RecordStatus;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  notes?: string;
}

export interface PricingRecord {
  id: string;
  modelRouteId: string;
  currency: string;
  billingUnit: 'per_1m_tokens' | 'per_1k_tokens' | 'per_image' | 'per_second' | 'custom';
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice?: number;
  imagePrice?: number;
  audioPrice?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  recordStatus: RecordStatus;
  sourceUrl: string;
  lastVerifiedAt: string;
  notes?: string;
}

export interface CapabilityProfile {
  id: string;
  modelId: string;
  recordStatus: RecordStatus;
  modalities?: {
    textIn?: boolean;
    textOut?: boolean;
    imageIn?: boolean;
    imageOut?: boolean;
    audioIn?: boolean;
    audioOut?: boolean;
    videoIn?: boolean;
  };
  features?: {
    toolCalling?: boolean;
    structuredOutput?: boolean;
    streaming?: boolean;
    systemPrompt?: boolean;
    reasoningMode?: boolean;
    longContext?: boolean;
  };
  limits?: {
    contextWindow?: number;
    maxOutputTokens?: number;
  };
  operationalClasses?: {
    latencyClass?: 'low' | 'medium' | 'high';
    costClass?: 'low' | 'medium' | 'high';
    qualityClass?: 'low' | 'medium' | 'high' | 'frontier';
  };
  sourceUrl: string;
  lastVerifiedAt: string;
  notes?: string;
}

export interface SuitabilityProfile {
  id: string;
  modelId: string;
  recordStatus: RecordStatus;
  skillScores?: Record<string, number>;
  taskScores?: Record<string, number>;
  agentTypeScores?: Record<string, number>;
  recommendedFor?: string[];
  avoidFor?: string[];
  strengthNotes?: string;
  weaknessNotes?: string;
  confidence: number;
  lastReviewedAt: string;
  notes?: string;
}

export interface IntegrationMetadata {
  id: string;
  modelRouteId: string;
  integrationTarget: 'openclaw' | 'nemoclaw' | 'nanoclaw' | 'other';
  providerModelString?: string;
  suggestedAlias?: string;
  configHints?: Record<string, unknown>;
  compatibilityNotes?: string;
  requiredFields?: string[];
  supportsFallbackRole?: boolean;
  recordStatus: RecordStatus;
  notes?: string;
}

export interface RegistrySnapshot {
  providers: Provider[];
  models: Model[];
  modelRoutes: ModelRoute[];
  pricingRecords: PricingRecord[];
  capabilityProfiles: CapabilityProfile[];
  suitabilityProfiles: SuitabilityProfile[];
  integrationMetadata: IntegrationMetadata[];
}

export type RegistryCollection = keyof RegistrySnapshot;
