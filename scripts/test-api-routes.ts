import { POST as importModelBundlePost } from '../app/api/model-bundles/route';
import { GET as getModels } from '../app/api/models/route';
import { GET as getModelDetail } from '../app/api/models/[modelId]/route';
import { SqliteRegistryStore } from '../lib/registry/sqlite-store';

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
      apiModelId: 'gpt-5.4-api-test',
      displayName: 'GPT 5.4 API Test',
      family: 'gpt-5',
      tier: 'frontier',
      status: 'active',
      sourceUrl: 'https://example.com/model',
    },
    routes: [
      {
        label: 'OpenAI direct API test',
        routeType: 'direct',
        supportsTools: true,
        supportsStreaming: true,
        supportsStructuredOutput: true,
        supportsReasoningMode: true,
        sourceUrl: 'https://example.com/route',
        pricing: [
          {
            billingUnit: 'per_1m_tokens',
            currency: 'USD',
            inputPrice: 10,
            outputPrice: 30,
            sourceUrl: 'https://example.com/pricing',
          },
        ],
        integrations: [
          {
            integrationTarget: 'openclaw',
            suggestedAlias: 'GPTAPI',
            providerModelString: 'openai/gpt-5.4-api-test',
            requiredFields: ['apiKey'],
            supportsFallbackRole: true,
            notes: 'Integration note',
          },
        ],
      },
    ],
    capability: {
      contextWindow: 200000,
      maxOutputTokens: 32000,
      toolCalling: true,
      structuredOutput: true,
      streaming: true,
      reasoningMode: true,
      qualityClass: 'frontier',
      costClass: 'high',
      latencyClass: 'medium',
      sourceUrl: 'https://example.com/capability',
    },
  };
}

async function testImportRoute() {
  await resetDb();

  const request = new Request('http://localhost/api/model-bundles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(sampleBundle()),
  });

  const response = await importModelBundlePost(request);
  const json = await response.json();

  assert(response.status === 200, 'Expected model bundle POST to return 200.');
  assert(json.ok === true, 'Expected model bundle POST to return ok=true.');
  assert(json.summary.routeCount === 1, 'Expected import summary route count to equal 1.');
}

async function testListRoute() {
  const response = await getModels();
  const json = await response.json();

  assert(response.status === 200, 'Expected model list route to return 200.');
  assert(json.ok === true, 'Expected model list route to return ok=true.');
  assert(Array.isArray(json.rows), 'Expected model list route to return rows array.');
  assert(json.rows.some((row: { modelId: string }) => row.modelId === 'openai-gpt-5-4-api-test'), 'Expected imported model to appear in list route output.');
}

async function testDetailRoute() {
  const response = await getModelDetail(new Request('http://localhost/api/models/openai-gpt-5-4-api-test'), {
    params: Promise.resolve({ modelId: 'openai-gpt-5-4-api-test' }),
  });
  const json = await response.json();

  assert(response.status === 200, 'Expected model detail route to return 200.');
  assert(json.ok === true, 'Expected model detail route to return ok=true.');
  assert(json.detail.model.id === 'openai-gpt-5-4-api-test', 'Expected model detail route to return requested model.');
}

async function testProvenanceDetailRoute() {
  const response = await getModelDetail(new Request('http://localhost/api/models/openai-gpt-5-4-api-test?include=provenance'), {
    params: Promise.resolve({ modelId: 'openai-gpt-5-4-api-test' }),
  });
  const json = await response.json();

  assert(response.status === 200, 'Expected provenance detail route to return 200.');
  assert(json.ok === true, 'Expected provenance detail route to return ok=true.');
  assert(json.provenance.model.sourceUrls.includes('https://example.com/model'), 'Expected provenance route to include model source URL.');
  assert(json.provenance.routes[0].pricing[0].sourceUrl === 'https://example.com/pricing', 'Expected provenance route to include pricing source URL.');
}

const tests = [
  ['import route', testImportRoute],
  ['list route', testListRoute],
  ['detail route', testDetailRoute],
  ['provenance detail route', testProvenanceDetailRoute],
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
