'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createModelAction, createPricingAction, saveCapabilityAction, saveIntegrationAction, saveModelAction, savePricingAction, saveRouteAction, saveSuitabilityAction } from './actions';
import type { ModelDetailRecord, ModelListRow } from '@/lib/registry/queries';

interface Props {
  rows: ModelListRow[];
  details: ModelDetailRecord[];
  providerOptions: { id: string; name: string }[];
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} style={{ background: 'var(--accent)', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>{pending ? 'Saving…' : label}</button>;
}

function money(value: number | null) {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}

function scoreMapToText(map?: Record<string, number>) {
  return Object.entries(map ?? {}).map(([key, value]) => `${key}=${value}`).join('\n');
}

function contextBucket(contextWindow: number | null) {
  if (!contextWindow) return 'unknown';
  if (contextWindow >= 500000) return 'xl';
  if (contextWindow >= 100000) return 'large';
  if (contextWindow >= 32000) return 'medium';
  return 'small';
}

function costBucket(inputPrice: number | null) {
  if (inputPrice == null) return 'unknown';
  if (inputPrice < 1) return 'low';
  if (inputPrice < 5) return 'medium';
  return 'high';
}

const pricingUnits = ['per_1m_tokens', 'per_1k_tokens', 'per_image', 'per_second', 'custom'] as const;

export function ModelEditor({ rows, details, providerOptions }: Props) {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(rows[0]?.modelId ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const [providerFilter, setProviderFilter] = useState('all');
  const [integrationFilter, setIntegrationFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [toolsOnly, setToolsOnly] = useState(false);
  const [qualityFilter, setQualityFilter] = useState('all');
  const [contextFilter, setContextFilter] = useState('all');
  const [costFilter, setCostFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const detailMap = useMemo(() => new Map(details.map((detail) => [detail.model.id, detail])), [details]);
  const selected = selectedModelId ? detailMap.get(selectedModelId) ?? null : null;
  const integrationOptions = useMemo(() => ['all', ...new Set(rows.flatMap((row) => row.integrationTargets))], [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (providerFilter !== 'all' && row.providerName !== providerFilter) return false;
    if (integrationFilter !== 'all' && !row.integrationTargets.includes(integrationFilter)) return false;
    if (toolsOnly && !row.supportsTools) return false;
    if (qualityFilter !== 'all' && (row.qualityClass ?? 'unknown') !== qualityFilter) return false;
    if (contextFilter !== 'all' && contextBucket(row.contextWindow) !== contextFilter) return false;
    if (costFilter !== 'all' && costBucket(row.inputPrice) !== costFilter) return false;
    if (skillFilter.trim()) {
      const needle = skillFilter.trim().toLowerCase();
      const haystack = [row.displayName, row.family, ...row.suitabilityKeywords].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [rows, providerFilter, integrationFilter, toolsOnly, qualityFilter, contextFilter, costFilter, skillFilter]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Main workbench: filter, inspect, edit, and now create model records from one screen.</div>
        <button onClick={() => setIsCreateOpen(true)} style={{ background: 'var(--accent)', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>Add model</button>
      </div>

      <div style={{ display: 'grid', gap: 16, marginBottom: 16, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}><span>Provider</span><select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="all">all</option>{providerOptions.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}</select></label>
          <label style={{ display: 'grid', gap: 6 }}><span>Integration target</span><select value={integrationFilter} onChange={(event) => setIntegrationFilter(event.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>{integrationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label style={{ display: 'grid', gap: 6 }}><span>Skill / suitability keyword</span><input value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} placeholder="coding, multimodal, orchestrator…" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label>
          <label style={{ display: 'grid', gap: 6 }}><span>Tools support</span><select value={toolsOnly ? 'yes' : 'all'} onChange={(event) => setToolsOnly(event.target.value === 'yes')} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="all">all</option><option value="yes">tools only</option></select></label>
          <label style={{ display: 'grid', gap: 6 }}><span>Quality class</span><select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="all">all</option>{['low', 'medium', 'high', 'frontier', 'unknown'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label style={{ display: 'grid', gap: 6 }}><span>Context size</span><select value={contextFilter} onChange={(event) => setContextFilter(event.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="all">all</option>{['small', 'medium', 'large', 'xl', 'unknown'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label style={{ display: 'grid', gap: 6 }}><span>Cost band</span><select value={costFilter} onChange={(event) => setCostFilter(event.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="all">all</option>{['low', 'medium', 'high', 'unknown'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{filteredRows.length} model rows match current filters.</div>
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f0f4fb', textAlign: 'left' }}><tr>{['Model', 'Provider', 'Family', 'Tier', 'Route', 'Input', 'Output', 'Context', 'Tools', 'Quality'].map((label) => <th key={label} style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--line)' }}>{label}</th>)}</tr></thead>
          <tbody>
            {filteredRows.map((row) => <tr key={row.modelId} onClick={() => { setSelectedModelId(row.modelId); setIsOpen(true); }} style={{ cursor: 'pointer' }}><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}><div style={{ fontWeight: 600 }}>{row.displayName}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.status}</div></td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.providerName}</td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.family}</td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.tier}</td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}><div>{row.routeLabel ?? '—'}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.routeType ?? '—'}</div></td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{money(row.inputPrice)}</td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{money(row.outputPrice)}</td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.contextWindow?.toLocaleString() ?? '—'}</td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.supportsTools == null ? '—' : row.supportsTools ? 'Yes' : 'No'}</td><td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.qualityClass ?? '—'}</td></tr>)}
          </tbody>
        </table>
      </div>

      {isCreateOpen ? <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 16, 30, 0.48)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }} onClick={() => setIsCreateOpen(false)}><div style={{ width: 'min(720px, 100%)', background: 'white', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }} onClick={(event) => event.stopPropagation()}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ margin: 0 }}>Add model</h2><button onClick={() => setIsCreateOpen(false)} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Close</button></div><form action={createModelAction} style={{ display: 'grid', gap: 16 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}><label style={{ display: 'grid', gap: 6 }}><span>Provider</span><select name="providerId" defaultValue={providerOptions[0]?.id} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>{providerOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label style={{ display: 'grid', gap: 6 }}><span>Integration target</span><select name="integrationTarget" defaultValue="openclaw" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>{['openclaw', 'nemoclaw', 'nanoclaw', 'other'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label style={{ display: 'grid', gap: 6 }}><span>Display name</span><input name="displayName" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>API model id</span><input name="apiModelId" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Family</span><input name="family" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Tier</span><input name="tier" defaultValue="standard" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Status</span><select name="status" defaultValue="active" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>{['active', 'preview', 'deprecated', 'experimental', 'disabled'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div><div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Create model" /></div></form></div></div> : null}

      {isOpen && selected ? <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 16, 30, 0.48)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }} onClick={() => setIsOpen(false)}><div style={{ width: 'min(1080px, 100%)', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }} onClick={(event) => event.stopPropagation()}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', marginBottom: 20 }}><div><h2 style={{ margin: '0 0 8px 0' }}>{selected.model.displayName}</h2><div style={{ color: 'var(--muted)', fontSize: 14 }}>{selected.provider?.name ?? 'Unknown provider'} · {selected.model.apiModelId}</div></div><button onClick={() => setIsOpen(false)} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Close</button></div><div style={{ display: 'grid', gap: 20 }}><form action={saveModelAction} style={{ display: 'grid', gap: 18, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}><input type="hidden" name="id" value={selected.model.id} /><h3 style={{ margin: 0 }}>Model</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}><label style={{ display: 'grid', gap: 6 }}><span>Display name</span><input name="displayName" defaultValue={selected.model.displayName} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Family</span><input name="family" defaultValue={selected.model.family} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Tier</span><input name="tier" defaultValue={selected.model.tier} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Status</span><select name="status" defaultValue={selected.model.status} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>{['active', 'preview', 'deprecated', 'experimental', 'disabled'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div><label style={{ display: 'grid', gap: 6 }}><span>Description</span><textarea name="description" defaultValue={selected.model.description ?? ''} rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Notes</span><textarea name="notes" defaultValue={selected.model.notes ?? ''} rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Save model" /></div></form>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                {selected.routes.map((route) => {
                  const routeBooleanFields = [
                    { name: 'supportsTools', value: Boolean(route.supportsTools) },
                    { name: 'supportsStreaming', value: Boolean(route.supportsStreaming) },
                    { name: 'supportsStructuredOutput', value: Boolean(route.supportsStructuredOutput) },
                    { name: 'supportsReasoningMode', value: Boolean(route.supportsReasoningMode) },
                  ];

                  const routePricing = selected.pricingRecords.filter((pricing) => pricing.modelRouteId === route.id);

                  return <div key={route.id} style={{ display: 'grid', gap: 16 }}>
                    <form action={saveRouteAction} style={{ display: 'grid', gap: 12, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                      <input type="hidden" name="id" value={route.id} />
                      <h3 style={{ marginTop: 0 }}>Route</h3>
                      <label style={{ display: 'grid', gap: 6 }}><span>Label</span><input name="label" defaultValue={route.label} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label>
                      <label style={{ display: 'grid', gap: 6 }}><span>Base URL</span><input name="baseUrl" defaultValue={route.baseUrl ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label>
                      <label style={{ display: 'grid', gap: 6 }}><span>Route type</span><select name="routeType" defaultValue={route.routeType} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>{['direct', 'proxy', 'aggregator', 'internal'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>{routeBooleanFields.map((field) => <label key={field.name} style={{ display: 'grid', gap: 6 }}><span>{field.name}</span><select name={field.name} defaultValue={String(field.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="true">true</option><option value="false">false</option></select></label>)}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Save route" /></div>
                    </form>

                    <section style={{ display: 'grid', gap: 12, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                      <h3 style={{ margin: 0 }}>Pricing</h3>
                      {routePricing.map((pricing) => <form key={pricing.id} action={savePricingAction} style={{ display: 'grid', gap: 12, border: '1px solid #e6ebf5', borderRadius: 12, padding: 12, background: '#fafcff' }}><input type="hidden" name="id" value={pricing.id} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}><label style={{ display: 'grid', gap: 6 }}><span>Billing unit</span><select name="billingUnit" defaultValue={pricing.billingUnit} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>{pricingUnits.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label style={{ display: 'grid', gap: 6 }}><span>Currency</span><input name="currency" defaultValue={pricing.currency} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Input price</span><input name="inputPrice" defaultValue={pricing.inputPrice} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Output price</span><input name="outputPrice" defaultValue={pricing.outputPrice} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Cached input price</span><input name="cachedInputPrice" defaultValue={pricing.cachedInputPrice ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label></div><label style={{ display: 'grid', gap: 6 }}><span>Notes</span><textarea name="notes" defaultValue={pricing.notes ?? ''} rows={2} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div style={{ fontSize: 12, color: 'var(--muted)' }}>{money(pricing.inputPrice)} in / {money(pricing.outputPrice)} out</div><SaveButton label="Save pricing" /></div></form>)}

                      <form action={createPricingAction} style={{ display: 'grid', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                        <input type="hidden" name="modelRouteId" value={route.id} />
                        <div style={{ fontWeight: 600 }}>Add pricing record</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}><label style={{ display: 'grid', gap: 6 }}><span>Billing unit</span><select name="billingUnit" defaultValue="per_1m_tokens" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>{pricingUnits.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label style={{ display: 'grid', gap: 6 }}><span>Currency</span><input name="currency" defaultValue="USD" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Input price</span><input name="inputPrice" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Output price</span><input name="outputPrice" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Cached input price</span><input name="cachedInputPrice" style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label></div><label style={{ display: 'grid', gap: 6 }}><span>Notes</span><textarea name="notes" rows={2} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Add pricing" /></div>
                      </form>
                    </section>
                  </div>;
                })}
              </div>

              <form action={saveCapabilityAction} style={{ display: 'grid', gap: 16, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}><input type="hidden" name="modelId" value={selected.model.id} /><h3 style={{ margin: 0 }}>Capabilities</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}><label style={{ display: 'grid', gap: 6 }}><span>Context window</span><input name="contextWindow" defaultValue={selected.capabilityProfile?.limits?.contextWindow ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Max output tokens</span><input name="maxOutputTokens" defaultValue={selected.capabilityProfile?.limits?.maxOutputTokens ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Quality class</span><select name="qualityClass" defaultValue={selected.capabilityProfile?.operationalClasses?.qualityClass ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="">—</option>{['low', 'medium', 'high', 'frontier'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label style={{ display: 'grid', gap: 6 }}><span>Cost class</span><select name="costClass" defaultValue={selected.capabilityProfile?.operationalClasses?.costClass ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="">—</option>{['low', 'medium', 'high'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label style={{ display: 'grid', gap: 6 }}><span>Latency class</span><select name="latencyClass" defaultValue={selected.capabilityProfile?.operationalClasses?.latencyClass ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="">—</option>{['low', 'medium', 'high'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>{[{ name: 'toolCalling', value: Boolean(selected.capabilityProfile?.features?.toolCalling) }, { name: 'structuredOutput', value: Boolean(selected.capabilityProfile?.features?.structuredOutput) }, { name: 'streaming', value: Boolean(selected.capabilityProfile?.features?.streaming) }, { name: 'reasoningMode', value: Boolean(selected.capabilityProfile?.features?.reasoningMode) }].map((field) => <label key={field.name} style={{ display: 'grid', gap: 6 }}><span>{field.name}</span><select name={field.name} defaultValue={String(field.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="true">true</option><option value="false">false</option></select></label>)}</div><div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Save capability" /></div></form>

              <form action={saveSuitabilityAction} style={{ display: 'grid', gap: 16, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}><input type="hidden" name="modelId" value={selected.model.id} /><h3 style={{ margin: 0 }}>Suitability / specialisation</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}><label style={{ display: 'grid', gap: 6 }}><span>Strength notes</span><textarea name="strengthNotes" defaultValue={selected.suitabilityProfile?.strengthNotes ?? ''} rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Weakness notes</span><textarea name="weaknessNotes" defaultValue={selected.suitabilityProfile?.weaknessNotes ?? ''} rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Recommended for (comma-separated)</span><input name="recommendedFor" defaultValue={selected.suitabilityProfile?.recommendedFor?.join(', ') ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Avoid for (comma-separated)</span><input name="avoidFor" defaultValue={selected.suitabilityProfile?.avoidFor?.join(', ') ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}><label style={{ display: 'grid', gap: 6 }}><span>Skill scores (`key=value` per line)</span><textarea name="skillScores" defaultValue={scoreMapToText(selected.suitabilityProfile?.skillScores)} rows={8} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)', fontFamily: 'ui-monospace, monospace' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Task scores (`key=value` per line)</span><textarea name="taskScores" defaultValue={scoreMapToText(selected.suitabilityProfile?.taskScores)} rows={8} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)', fontFamily: 'ui-monospace, monospace' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Agent type scores (`key=value` per line)</span><textarea name="agentTypeScores" defaultValue={scoreMapToText(selected.suitabilityProfile?.agentTypeScores)} rows={8} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)', fontFamily: 'ui-monospace, monospace' }} /></label></div><div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Save suitability" /></div></form>

              <div style={{ display: 'grid', gap: 16 }}>{selected.integrationMetadata.map((metadata) => <form key={metadata.id} action={saveIntegrationAction} style={{ display: 'grid', gap: 16, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}><input type="hidden" name="id" value={metadata.id} /><h3 style={{ margin: 0 }}>Integration: {metadata.integrationTarget}</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}><label style={{ display: 'grid', gap: 6 }}><span>Suggested alias</span><input name="suggestedAlias" defaultValue={metadata.suggestedAlias ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Provider model string</span><input name="providerModelString" defaultValue={metadata.providerModelString ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Required fields (comma-separated)</span><input name="requiredFields" defaultValue={metadata.requiredFields?.join(', ') ?? ''} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><label style={{ display: 'grid', gap: 6 }}><span>Supports fallback role</span><select name="supportsFallbackRole" defaultValue={String(Boolean(metadata.supportsFallbackRole))} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}><option value="true">true</option><option value="false">false</option></select></label></div><label style={{ display: 'grid', gap: 6 }}><span>Compatibility notes</span><textarea name="compatibilityNotes" defaultValue={metadata.compatibilityNotes ?? ''} rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} /></label><div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label={`Save ${metadata.integrationTarget}`} /></div></form>)}</div></div></div></div> : null}
    </>
  );
}
