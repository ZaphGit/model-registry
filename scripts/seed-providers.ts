import { getDb } from '../lib/registry/db';

const db = getDb();

const today = new Date().toISOString().slice(0, 10);

const providers = [
  { id: 'amazon-bedrock', name: 'Amazon Bedrock',      type: 'proxy',       websiteUrl: 'https://aws.amazon.com/bedrock/',          docsUrl: 'https://docs.aws.amazon.com/bedrock/' },
  { id: 'azure',          name: 'Azure OpenAI',         type: 'proxy',       websiteUrl: 'https://azure.microsoft.com/',             docsUrl: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/' },
  { id: 'cerebras',       name: 'Cerebras',             type: 'cloud',       websiteUrl: 'https://www.cerebras.ai/',                 docsUrl: 'https://inference-docs.cerebras.ai/' },
  { id: 'github',         name: 'GitHub Copilot',       type: 'proxy',       websiteUrl: 'https://github.com/features/copilot',      docsUrl: 'https://docs.github.com/en/copilot' },
  { id: 'huggingface',    name: 'Hugging Face',         type: 'aggregator',  websiteUrl: 'https://huggingface.co/',                  docsUrl: 'https://huggingface.co/docs' },
  { id: 'minimax',        name: 'MiniMax',              type: 'cloud',       websiteUrl: 'https://www.minimax.io/',                  docsUrl: 'https://platform.minimaxi.com/document/introduction' },
  { id: 'mistral',        name: 'Mistral AI',           type: 'cloud',       websiteUrl: 'https://mistral.ai/',                      docsUrl: 'https://docs.mistral.ai/' },
  { id: 'moonshot',       name: 'Moonshot AI',          type: 'cloud',       websiteUrl: 'https://www.moonshot.cn/',                 docsUrl: 'https://platform.moonshot.cn/docs' },
  { id: 'vercel',         name: 'Vercel AI Gateway',    type: 'proxy',       websiteUrl: 'https://vercel.com/',                      docsUrl: 'https://sdk.vercel.ai/docs' },
  { id: 'xai',            name: 'xAI',                  type: 'cloud',       websiteUrl: 'https://x.ai/',                            docsUrl: 'https://docs.x.ai/' },
  { id: 'zai',            name: 'Z.ai',                 type: 'cloud',       websiteUrl: 'https://www.z.ai/',                        docsUrl: 'https://docs.z.ai/' },
];

const insert = db.prepare('INSERT OR IGNORE INTO providers (id, payload) VALUES (?, ?)');

const tx = db.transaction(() => {
  for (const p of providers) {
    const payload = {
      id: p.id,
      name: p.name,
      type: p.type,
      websiteUrl: p.websiteUrl,
      docsUrl: p.docsUrl,
      status: 'active',
      recordStatus: 'draft',
      lastVerifiedAt: today,
      sourceUrls: [p.docsUrl],
      notes: 'Seeded to unblock Deep Thought model bundle imports.',
    };
    const result = insert.run(p.id, JSON.stringify(payload));
    console.log(result.changes > 0 ? `Inserted: ${p.id}` : `Already exists: ${p.id}`);
  }
});

tx();

const count = (db.prepare('SELECT COUNT(*) as c FROM providers').get() as { c: number }).c;
console.log(`\nTotal providers now: ${count}`);
