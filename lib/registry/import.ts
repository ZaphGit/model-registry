import type {
  CapabilityProfile,
  IntegrationMetadata,
  Model,
  ModelRoute,
  PricingRecord,
  SuitabilityProfile,
} from './types';

export interface ModelBundleImport {
  model: {
    providerId: string;
    apiModelId: string;
    displayName: string;
    family: string;
    tier: string;
    status: Model['status'];
    description?: string;
    notes?: string;
  };
  capability?: {
    contextWindow?: number;
    maxOutputTokens?: number;
    toolCalling?: boolean;
    structuredOutput?: boolean;
    streaming?: boolean;
    reasoningMode?: boolean;
    qualityClass?: NonNullable<CapabilityProfile['operationalClasses']>['qualityClass'];
    costClass?: NonNullable<CapabilityProfile['operationalClasses']>['costClass'];
    latencyClass?: NonNullable<CapabilityProfile['operationalClasses']>['latencyClass'];
    notes?: string;
  };
  suitability?: {
    strengthNotes?: string;
    weaknessNotes?: string;
    recommendedFor?: string[];
    avoidFor?: string[];
    skillScores?: Record<string, number>;
    taskScores?: Record<string, number>;
    agentTypeScores?: Record<string, number>;
  };
  routes: Array<{
    label: string;
    routeType: ModelRoute['routeType'];
    baseUrl?: string;
    supportsTools?: boolean;
    supportsStreaming?: boolean;
    supportsStructuredOutput?: boolean;
    supportsReasoningMode?: boolean;
    pricing?: Array<{
      billingUnit: PricingRecord['billingUnit'];
      currency: string;
      inputPrice: number;
      outputPrice: number;
      cachedInputPrice?: number;
      notes?: string;
    }>;
    integrations?: Array<{
      integrationTarget: IntegrationMetadata['integrationTarget'];
      suggestedAlias?: string;
      providerModelString?: string;
      compatibilityNotes?: string;
      requiredFields?: string[];
      supportsFallbackRole?: boolean;
    }>;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value) || !value.every(isString)) throw new Error('Expected string array.');
  return value;
}

function asScoreMap(value: unknown): Record<string, number> | undefined {
  if (value == null) return undefined;
  if (!isRecord(value)) throw new Error('Expected score map object.');
  const entries = Object.entries(value);
  for (const [, score] of entries) {
    if (!isNumber(score)) throw new Error('Expected numeric score values.');
  }
  return Object.fromEntries(entries) as Record<string, number>;
}

export function parseModelBundleImport(input: string): ModelBundleImport {
  const parsed = JSON.parse(input) as unknown;
  if (!isRecord(parsed)) throw new Error('Import payload must be an object.');
  if (!isRecord(parsed.model)) throw new Error('Import payload must include a model object.');
  if (!Array.isArray(parsed.routes)) throw new Error('Import payload must include a routes array.');

  const model = parsed.model;
  const routes = parsed.routes;

  const bundle: ModelBundleImport = {
    model: {
      providerId: String(model.providerId ?? ''),
      apiModelId: String(model.apiModelId ?? ''),
      displayName: String(model.displayName ?? ''),
      family: String(model.family ?? ''),
      tier: String(model.tier ?? ''),
      status: (model.status as Model['status']) ?? 'active',
      description: isString(model.description) ? model.description : undefined,
      notes: isString(model.notes) ? model.notes : undefined,
    },
    capability: isRecord(parsed.capability)
      ? {
          contextWindow: isNumber(parsed.capability.contextWindow) ? parsed.capability.contextWindow : undefined,
          maxOutputTokens: isNumber(parsed.capability.maxOutputTokens) ? parsed.capability.maxOutputTokens : undefined,
          toolCalling: isBoolean(parsed.capability.toolCalling) ? parsed.capability.toolCalling : undefined,
          structuredOutput: isBoolean(parsed.capability.structuredOutput) ? parsed.capability.structuredOutput : undefined,
          streaming: isBoolean(parsed.capability.streaming) ? parsed.capability.streaming : undefined,
          reasoningMode: isBoolean(parsed.capability.reasoningMode) ? parsed.capability.reasoningMode : undefined,
          qualityClass: parsed.capability.qualityClass as NonNullable<CapabilityProfile['operationalClasses']>['qualityClass'],
          costClass: parsed.capability.costClass as NonNullable<CapabilityProfile['operationalClasses']>['costClass'],
          latencyClass: parsed.capability.latencyClass as NonNullable<CapabilityProfile['operationalClasses']>['latencyClass'],
          notes: isString(parsed.capability.notes) ? parsed.capability.notes : undefined,
        }
      : undefined,
    suitability: isRecord(parsed.suitability)
      ? {
          strengthNotes: isString(parsed.suitability.strengthNotes) ? parsed.suitability.strengthNotes : undefined,
          weaknessNotes: isString(parsed.suitability.weaknessNotes) ? parsed.suitability.weaknessNotes : undefined,
          recommendedFor: asStringArray(parsed.suitability.recommendedFor),
          avoidFor: asStringArray(parsed.suitability.avoidFor),
          skillScores: asScoreMap(parsed.suitability.skillScores),
          taskScores: asScoreMap(parsed.suitability.taskScores),
          agentTypeScores: asScoreMap(parsed.suitability.agentTypeScores),
        }
      : undefined,
    routes: routes.map((route, index) => {
      if (!isRecord(route)) throw new Error(`Route at index ${index} must be an object.`);
      return {
        label: String(route.label ?? ''),
        routeType: (route.routeType as ModelRoute['routeType']) ?? 'direct',
        baseUrl: isString(route.baseUrl) ? route.baseUrl : undefined,
        supportsTools: isBoolean(route.supportsTools) ? route.supportsTools : undefined,
        supportsStreaming: isBoolean(route.supportsStreaming) ? route.supportsStreaming : undefined,
        supportsStructuredOutput: isBoolean(route.supportsStructuredOutput) ? route.supportsStructuredOutput : undefined,
        supportsReasoningMode: isBoolean(route.supportsReasoningMode) ? route.supportsReasoningMode : undefined,
        pricing: Array.isArray(route.pricing)
          ? route.pricing.map((pricing, pricingIndex) => {
              if (!isRecord(pricing)) throw new Error(`Pricing record at route ${index}, pricing ${pricingIndex} must be an object.`);
              return {
                billingUnit: (pricing.billingUnit as PricingRecord['billingUnit']) ?? 'per_1m_tokens',
                currency: String(pricing.currency ?? 'USD'),
                inputPrice: Number(pricing.inputPrice ?? 0),
                outputPrice: Number(pricing.outputPrice ?? 0),
                cachedInputPrice: isNumber(pricing.cachedInputPrice) ? pricing.cachedInputPrice : undefined,
                notes: isString(pricing.notes) ? pricing.notes : undefined,
              };
            })
          : undefined,
        integrations: Array.isArray(route.integrations)
          ? route.integrations.map((integration, integrationIndex) => {
              if (!isRecord(integration)) throw new Error(`Integration record at route ${index}, integration ${integrationIndex} must be an object.`);
              return {
                integrationTarget: (integration.integrationTarget as IntegrationMetadata['integrationTarget']) ?? 'openclaw',
                suggestedAlias: isString(integration.suggestedAlias) ? integration.suggestedAlias : undefined,
                providerModelString: isString(integration.providerModelString) ? integration.providerModelString : undefined,
                compatibilityNotes: isString(integration.compatibilityNotes) ? integration.compatibilityNotes : undefined,
                requiredFields: asStringArray(integration.requiredFields),
                supportsFallbackRole: isBoolean(integration.supportsFallbackRole) ? integration.supportsFallbackRole : undefined,
              };
            })
          : undefined,
      };
    }),
  };

  if (!bundle.model.providerId || !bundle.model.apiModelId || !bundle.model.displayName || !bundle.model.family || !bundle.model.tier) {
    throw new Error('Model import requires providerId, apiModelId, displayName, family, and tier.');
  }
  if (!bundle.routes.length) throw new Error('Model import requires at least one route.');
  if (bundle.routes.some((route) => !route.label)) throw new Error('Each route requires a label.');

  return bundle;
}
