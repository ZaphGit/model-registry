import type {
  CapabilityProfile,
  IntegrationMetadata,
  Model,
  ModelRoute,
  PricingRecord,
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
    sourceUrl?: string;
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
    sourceUrl?: string;
  };
  suitability?: {
    strengthNotes?: string;
    weaknessNotes?: string;
    recommendedFor?: string[];
    avoidFor?: string[];
    skillScores?: Record<string, number>;
    taskScores?: Record<string, number>;
    agentTypeScores?: Record<string, number>;
    notes?: string;
  };
  routes: Array<{
    label: string;
    routeType: ModelRoute['routeType'];
    baseUrl?: string;
    supportsTools?: boolean;
    supportsStreaming?: boolean;
    supportsStructuredOutput?: boolean;
    supportsReasoningMode?: boolean;
    sourceUrl?: string;
    pricing?: Array<{
      billingUnit: PricingRecord['billingUnit'];
      currency: string;
      inputPrice: number;
      outputPrice: number;
      cachedInputPrice?: number;
      notes?: string;
      sourceUrl?: string;
    }>;
    integrations?: Array<{
      integrationTarget: IntegrationMetadata['integrationTarget'];
      suggestedAlias?: string;
      providerModelString?: string;
      compatibilityNotes?: string;
      requiredFields?: string[];
      supportsFallbackRole?: boolean;
      notes?: string;
    }>;
  }>;
}

export interface ModelBundleImportSummary {
  providerId: string;
  apiModelId: string;
  routeCount: number;
  pricingCount: number;
  integrationCount: number;
}

const validModelStatuses = new Set<Model['status']>(['active', 'preview', 'deprecated', 'experimental', 'disabled']);
const validRouteTypes = new Set<ModelRoute['routeType']>(['direct', 'proxy', 'aggregator', 'internal']);
const validBillingUnits = new Set<PricingRecord['billingUnit']>(['per_1m_tokens', 'per_1k_tokens', 'per_image', 'per_second', 'custom']);
const validIntegrationTargets = new Set<IntegrationMetadata['integrationTarget']>(['openclaw', 'nemoclaw', 'nanoclaw', 'other']);
const validQualityClasses = new Set<NonNullable<CapabilityProfile['operationalClasses']>['qualityClass']>(['low', 'medium', 'high', 'frontier']);
const validOperationalClasses = new Set<'low' | 'medium' | 'high'>(['low', 'medium', 'high']);

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

function asOptionalString(value: unknown) {
  return isString(value) ? value : undefined;
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

function asModelStatus(value: unknown): Model['status'] {
  if (!isString(value) || !validModelStatuses.has(value as Model['status'])) throw new Error(`Invalid model status: ${String(value)}`);
  return value as Model['status'];
}

function asRouteType(value: unknown): ModelRoute['routeType'] {
  if (!isString(value) || !validRouteTypes.has(value as ModelRoute['routeType'])) throw new Error(`Invalid route type: ${String(value)}`);
  return value as ModelRoute['routeType'];
}

function asBillingUnit(value: unknown): PricingRecord['billingUnit'] {
  if (!isString(value) || !validBillingUnits.has(value as PricingRecord['billingUnit'])) throw new Error(`Invalid billing unit: ${String(value)}`);
  return value as PricingRecord['billingUnit'];
}

function asIntegrationTarget(value: unknown): IntegrationMetadata['integrationTarget'] {
  if (!isString(value) || !validIntegrationTargets.has(value as IntegrationMetadata['integrationTarget'])) throw new Error(`Invalid integration target: ${String(value)}`);
  return value as IntegrationMetadata['integrationTarget'];
}

function asOptionalQualityClass(value: unknown) {
  if (value == null) return undefined;
  if (!isString(value) || !validQualityClasses.has(value as NonNullable<CapabilityProfile['operationalClasses']>['qualityClass'])) throw new Error(`Invalid quality class: ${String(value)}`);
  return value as NonNullable<CapabilityProfile['operationalClasses']>['qualityClass'];
}

function asOptionalOperationalClass(value: unknown) {
  if (value == null) return undefined;
  if (!isString(value) || !validOperationalClasses.has(value as 'low' | 'medium' | 'high')) throw new Error(`Invalid operational class: ${String(value)}`);
  return value as 'low' | 'medium' | 'high';
}

function assertNonNegative(value: number, field: string) {
  if (value < 0) throw new Error(`${field} must be non-negative.`);
}

export function summariseModelBundleImport(bundle: ModelBundleImport): ModelBundleImportSummary {
  return {
    providerId: bundle.model.providerId,
    apiModelId: bundle.model.apiModelId,
    routeCount: bundle.routes.length,
    pricingCount: bundle.routes.reduce((sum, route) => sum + (route.pricing?.length ?? 0), 0),
    integrationCount: bundle.routes.reduce((sum, route) => sum + (route.integrations?.length ?? 0), 0),
  };
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
      providerId: String(model.providerId ?? '').trim(),
      apiModelId: String(model.apiModelId ?? '').trim(),
      displayName: String(model.displayName ?? '').trim(),
      family: String(model.family ?? '').trim(),
      tier: String(model.tier ?? '').trim(),
      status: asModelStatus(model.status ?? 'active'),
      description: asOptionalString(model.description),
      notes: asOptionalString(model.notes),
      sourceUrl: asOptionalString(model.sourceUrl),
    },
    capability: isRecord(parsed.capability)
      ? {
          contextWindow: isNumber(parsed.capability.contextWindow) ? parsed.capability.contextWindow : undefined,
          maxOutputTokens: isNumber(parsed.capability.maxOutputTokens) ? parsed.capability.maxOutputTokens : undefined,
          toolCalling: isBoolean(parsed.capability.toolCalling) ? parsed.capability.toolCalling : undefined,
          structuredOutput: isBoolean(parsed.capability.structuredOutput) ? parsed.capability.structuredOutput : undefined,
          streaming: isBoolean(parsed.capability.streaming) ? parsed.capability.streaming : undefined,
          reasoningMode: isBoolean(parsed.capability.reasoningMode) ? parsed.capability.reasoningMode : undefined,
          qualityClass: asOptionalQualityClass(parsed.capability.qualityClass),
          costClass: asOptionalOperationalClass(parsed.capability.costClass),
          latencyClass: asOptionalOperationalClass(parsed.capability.latencyClass),
          notes: asOptionalString(parsed.capability.notes),
          sourceUrl: asOptionalString(parsed.capability.sourceUrl),
        }
      : undefined,
    suitability: isRecord(parsed.suitability)
      ? {
          strengthNotes: asOptionalString(parsed.suitability.strengthNotes),
          weaknessNotes: asOptionalString(parsed.suitability.weaknessNotes),
          recommendedFor: asStringArray(parsed.suitability.recommendedFor),
          avoidFor: asStringArray(parsed.suitability.avoidFor),
          skillScores: asScoreMap(parsed.suitability.skillScores),
          taskScores: asScoreMap(parsed.suitability.taskScores),
          agentTypeScores: asScoreMap(parsed.suitability.agentTypeScores),
          notes: asOptionalString(parsed.suitability.notes),
        }
      : undefined,
    routes: routes.map((route, index) => {
      if (!isRecord(route)) throw new Error(`Route at index ${index} must be an object.`);
      return {
        label: String(route.label ?? '').trim(),
        routeType: asRouteType(route.routeType ?? 'direct'),
        baseUrl: asOptionalString(route.baseUrl),
        supportsTools: isBoolean(route.supportsTools) ? route.supportsTools : undefined,
        supportsStreaming: isBoolean(route.supportsStreaming) ? route.supportsStreaming : undefined,
        supportsStructuredOutput: isBoolean(route.supportsStructuredOutput) ? route.supportsStructuredOutput : undefined,
        supportsReasoningMode: isBoolean(route.supportsReasoningMode) ? route.supportsReasoningMode : undefined,
        sourceUrl: asOptionalString(route.sourceUrl),
        pricing: Array.isArray(route.pricing)
          ? route.pricing.map((pricing, pricingIndex) => {
              if (!isRecord(pricing)) throw new Error(`Pricing record at route ${index}, pricing ${pricingIndex} must be an object.`);
              const inputPrice = Number(pricing.inputPrice ?? 0);
              const outputPrice = Number(pricing.outputPrice ?? 0);
              if (!Number.isFinite(inputPrice) || !Number.isFinite(outputPrice)) throw new Error(`Pricing values at route ${index}, pricing ${pricingIndex} must be numeric.`);
              assertNonNegative(inputPrice, `Route ${index} pricing ${pricingIndex} inputPrice`);
              assertNonNegative(outputPrice, `Route ${index} pricing ${pricingIndex} outputPrice`);
              if (isNumber(pricing.cachedInputPrice)) assertNonNegative(pricing.cachedInputPrice, `Route ${index} pricing ${pricingIndex} cachedInputPrice`);
              return {
                billingUnit: asBillingUnit(pricing.billingUnit ?? 'per_1m_tokens'),
                currency: String(pricing.currency ?? 'USD').trim(),
                inputPrice,
                outputPrice,
                cachedInputPrice: isNumber(pricing.cachedInputPrice) ? pricing.cachedInputPrice : undefined,
                notes: asOptionalString(pricing.notes),
                sourceUrl: asOptionalString(pricing.sourceUrl),
              };
            })
          : undefined,
        integrations: Array.isArray(route.integrations)
          ? route.integrations.map((integration, integrationIndex) => {
              if (!isRecord(integration)) throw new Error(`Integration record at route ${index}, integration ${integrationIndex} must be an object.`);
              return {
                integrationTarget: asIntegrationTarget(integration.integrationTarget ?? 'openclaw'),
                suggestedAlias: asOptionalString(integration.suggestedAlias),
                providerModelString: asOptionalString(integration.providerModelString),
                compatibilityNotes: asOptionalString(integration.compatibilityNotes),
                requiredFields: asStringArray(integration.requiredFields),
                supportsFallbackRole: isBoolean(integration.supportsFallbackRole) ? integration.supportsFallbackRole : undefined,
                notes: asOptionalString(integration.notes),
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

  const routeLabels = new Set<string>();
  for (const route of bundle.routes) {
    if (routeLabels.has(route.label)) throw new Error(`Duplicate route label in bundle: ${route.label}`);
    routeLabels.add(route.label);

    const pricingUnitsSeen = new Set<string>();
    for (const pricing of route.pricing ?? []) {
      if (!pricing.currency) throw new Error(`Pricing currency is required for route: ${route.label}`);
      if (pricingUnitsSeen.has(pricing.billingUnit)) throw new Error(`Duplicate pricing billing unit for route ${route.label}: ${pricing.billingUnit}`);
      pricingUnitsSeen.add(pricing.billingUnit);
    }

    const integrationTargetsSeen = new Set<string>();
    for (const integration of route.integrations ?? []) {
      if (integrationTargetsSeen.has(integration.integrationTarget)) {
        throw new Error(`Duplicate integration target for route ${route.label}: ${integration.integrationTarget}`);
      }
      integrationTargetsSeen.add(integration.integrationTarget);
    }
  }

  return bundle;
}
