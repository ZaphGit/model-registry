export interface ModelBundleImportApiSuccess {
  ok: true;
  modelId: string;
  summary: {
    providerId: string;
    apiModelId: string;
    routeCount: number;
    pricingCount: number;
    integrationCount: number;
  };
}

export interface ModelBundleImportApiError {
  ok: false;
  error: string;
}

export type ModelBundleImportApiResponse = ModelBundleImportApiSuccess | ModelBundleImportApiError;
