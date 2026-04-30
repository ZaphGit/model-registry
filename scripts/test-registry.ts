import { parseModelBundleImport } from '../lib/registry/import';
import { extractProvenance } from '../lib/registry/provenance';
import { getModelDetailRecord } from '../lib/registry/queries';
import { SqliteRegistryStore } from '../lib/registry/sqlite-store';
import { upsertModelBundle } from '../lib/registry/update';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function resetDb() {
  await SqliteRegistryStore.seedFromJson();
}

function sampleBundle() {
  return {
    model: {
      providerId: 'openai',
      apiModelId: 'gpt-5.4-test',
      displayName: 'GPT 5.4 Test',
      family: 'gpt-5',
      tier: 'frontier',
      status: 'active' as const,
      notes: 'Imported by test',
      sourceUrl: 'https://example.com/model',
    },
    capability: {
      contextWindow: 200000,
      maxOutputTokens: 32000,
      toolCalling: true,
      structuredOutput: true,
      streaming: true,
      reasoningMode: true,
      qualityClass: 'frontier' as const,
      costClass: 'high' as const,
      latencyClass: 'medium' as const,
      notes: 'Capability note',
      sourceUrl: 'https://example.com/capability',
    },
    suitability: {
      recommendedFor: ['coding'],
      skillScores: { coding: 0.95 },
      notes: 'Suitability note',
      sourceNote: 'Suitability source note',
    },
    routes: [
      {
        label: 'OpenAI direct test',
        routeType: 'direct' as const,
        baseUrl: 'https://api.openai.com/v1',
        supportsTools: true,
        supportsStreaming: true,
        supportsStructuredOutput: true,
        supportsReasoningMode: true,
        sourceUrl: 'https://example.com/route',
        notes: 'Route note',
        pricing: [
          {
            billingUnit: 'per_1m_tokens' as const,
            currency: 'USD',
            inputPrice: 10,
            outputPrice: 30,
            notes: 'Pricing note',
            sourceUrl: 'https://example.com/pricing',
          },
        ],
        integrations: [
          {
            integrationTarget: 'openclaw' as const,
            suggestedAlias: 'GPTTEST',
            providerModelString: 'openai/gpt-5.4-test',
            requiredFields: ['apiKey'],
            supportsFallbackRole: true,
            notes: 'Integration note',
          },
        ],
      },
    ],
  };
}

async function testValidationRejectsDuplicatePricingUnit() {
  const payload = JSON.stringify({
    ...sampleBundle(),
    routes: [
      {
        ...sampleBundle().routes[0],
        pricing: [
          { billingUnit: 'per_1m_tokens', currency: 'USD', inputPrice: 1, outputPrice: 2 },
          { billingUnit: 'per_1m_tokens', currency: 'USD', inputPrice: 3, outputPrice: 4 },
        ],
      },
    ],
  });

  let threw = false;
  try {
    parseModelBundleImport(payload);
  } catch (error) {
    threw = error instanceof Error && error.message.includes('Duplicate pricing billing unit');
  }

  assert(threw, 'Expected duplicate pricing billing unit validation to throw.');
}

async function testDeterministicUpsert() {
  await resetDb();
  const bundle = sampleBundle();

  const first = upsertModelBundle(bundle);
  const second = upsertModelBundle({
    ...bundle,
    model: { ...bundle.model, description: 'Updated description' },
    routes: [
      {
        ...bundle.routes[0],
        pricing: [{ ...bundle.routes[0].pricing![0], outputPrice: 33 }],
      },
    ],
  });

  assert(first.modelId === second.modelId, 'Expected deterministic model id across upserts.');

  const detail = getModelDetailRecord(first.modelId);
  assert(detail, 'Expected imported model detail to exist.');
  assert(detail.routes.length === 1, 'Expected one deterministic route, not duplicates.');
  assert(detail.pricingRecords.length === 1, 'Expected one deterministic pricing record, not duplicates.');
  assert(detail.pricingRecords[0]?.outputPrice === 33, 'Expected pricing record to update in place.');
  assert(detail.model.description === 'Updated description', 'Expected model description to update in place.');
}

async function testProvenanceExtraction() {
  await resetDb();
  const bundle = sampleBundle();
  const result = upsertModelBundle(bundle);
  const detail = getModelDetailRecord(result.modelId);
  assert(detail, 'Expected imported model detail for provenance extraction.');

  const provenance = extractProvenance(detail);
  assert(provenance.model.sourceUrls.includes('https://example.com/model'), 'Expected model source URL in provenance.');
  assert(provenance.capability?.sourceUrl === 'https://example.com/capability', 'Expected capability source URL in provenance.');
  assert(provenance.routes[0]?.sourceUrl === 'https://example.com/route', 'Expected route source URL in provenance.');
  assert(provenance.routes[0]?.pricing[0]?.sourceUrl === 'https://example.com/pricing', 'Expected pricing source URL in provenance.');
  assert(provenance.routes[0]?.integrations[0]?.notes === 'Integration note', 'Expected integration note in provenance.');
}

const tests = [
  ['validation rejects duplicate pricing unit', testValidationRejectsDuplicatePricingUnit],
  ['deterministic upsert', testDeterministicUpsert],
  ['provenance extraction', testProvenanceExtraction],
] as const;

async function main() {
  for (const [name, test] of tests) {
    await test();
    console.log(`PASS ${name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
