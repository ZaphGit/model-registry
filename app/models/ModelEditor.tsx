'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveModelAction } from './actions';
import type { ModelDetailRecord, ModelListRow } from '@/lib/registry/queries';

interface Props {
  rows: ModelListRow[];
  details: ModelDetailRecord[];
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{ background: 'var(--accent)', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}
    >
      {pending ? 'Saving…' : 'Save model'}
    </button>
  );
}

function money(value: number | null) {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}

export function ModelEditor({ rows, details }: Props) {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(rows[0]?.modelId ?? null);
  const [isOpen, setIsOpen] = useState(false);

  const detailMap = useMemo(() => new Map(details.map((detail) => [detail.model.id, detail])), [details]);
  const selected = selectedModelId ? detailMap.get(selectedModelId) ?? null : null;

  return (
    <>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f0f4fb', textAlign: 'left' }}>
            <tr>
              {['Model', 'Provider', 'Family', 'Tier', 'Route', 'Input', 'Output', 'Context', 'Tools', 'Quality'].map((label) => (
                <th key={label} style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--line)' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.modelId}
                onClick={() => {
                  setSelectedModelId(row.modelId);
                  setIsOpen(true);
                }}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 600 }}>{row.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.status}</div>
                </td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.providerName}</td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.family}</td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.tier}</td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div>{row.routeLabel ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.routeType ?? '—'}</div>
                </td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{money(row.inputPrice)}</td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{money(row.outputPrice)}</td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.contextWindow?.toLocaleString() ?? '—'}</td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.supportsTools == null ? '—' : row.supportsTools ? 'Yes' : 'No'}</td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>{row.qualityClass ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOpen && selected ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 16, 30, 0.48)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              width: 'min(960px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              background: 'white',
              borderRadius: 18,
              padding: 24,
              boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0' }}>{selected.model.displayName}</h2>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                  {selected.provider?.name ?? 'Unknown provider'} · {selected.model.apiModelId}
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
                Close
              </button>
            </div>

            <form action={saveModelAction} style={{ display: 'grid', gap: 18 }}>
              <input type="hidden" name="id" value={selected.model.id} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>Display name</span>
                  <input name="displayName" defaultValue={selected.model.displayName} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>Family</span>
                  <input name="family" defaultValue={selected.model.family} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>Tier</span>
                  <input name="tier" defaultValue={selected.model.tier} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>Status</span>
                  <select name="status" defaultValue={selected.model.status} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>
                    {['active', 'preview', 'deprecated', 'experimental', 'disabled'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Description</span>
                <textarea name="description" defaultValue={selected.model.description ?? ''} rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Notes</span>
                <textarea name="notes" defaultValue={selected.model.notes ?? ''} rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                <section style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                  <h3 style={{ marginTop: 0 }}>Routes</h3>
                  {selected.routes.map((route) => (
                    <div key={route.id} style={{ marginBottom: 12 }}>
                      <strong>{route.label}</strong>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{route.routeType} · {route.baseUrl}</div>
                    </div>
                  ))}
                </section>
                <section style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                  <h3 style={{ marginTop: 0 }}>Pricing</h3>
                  {selected.pricingRecords.map((pricing) => (
                    <div key={pricing.id} style={{ marginBottom: 12 }}>
                      <strong>{money(pricing.inputPrice)} in / {money(pricing.outputPrice)} out</strong>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{pricing.billingUnit}</div>
                    </div>
                  ))}
                </section>
                <section style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                  <h3 style={{ marginTop: 0 }}>Capabilities</h3>
                  <div style={{ fontSize: 14 }}>
                    Context: {selected.capabilityProfile?.limits?.contextWindow?.toLocaleString() ?? '—'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    Tools: {selected.capabilityProfile?.features?.toolCalling ? 'Yes' : 'No'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    Reasoning: {selected.capabilityProfile?.features?.reasoningMode ? 'Yes' : 'No'}
                  </div>
                </section>
                <section style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                  <h3 style={{ marginTop: 0 }}>Suitability</h3>
                  <div style={{ fontSize: 14 }}>{selected.suitabilityProfile?.strengthNotes ?? '—'}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
                    Recommended: {selected.suitabilityProfile?.recommendedFor?.join(', ') ?? '—'}
                  </div>
                </section>
              </div>

              <section style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                <h3 style={{ marginTop: 0 }}>Integration metadata</h3>
                {selected.integrationMetadata.map((metadata) => (
                  <div key={metadata.id} style={{ marginBottom: 12 }}>
                    <strong>{metadata.integrationTarget}</strong>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{metadata.providerModelString ?? '—'}</div>
                  </div>
                ))}
              </section>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <SaveButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
