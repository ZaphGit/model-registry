'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  createIntegrationAction,
  createModelAction,
  createPricingAction,
  createRouteAction,
  saveCapabilityAction,
  saveIntegrationAction,
  saveModelAction,
  savePricingAction,
  saveRouteAction,
  saveSuitabilityAction,
} from './actions';
import { importModelBundleAction } from './import-actions';
import type { ImportModelBundleResult } from './import-actions';
import type { ModelDetailRecord, ModelListRow } from '@/lib/registry/queries';

interface Props {
  rows: ModelListRow[];
  details: ModelDetailRecord[];
  providerOptions: { id: string; name: string }[];
}

const pricingUnits = ['per_1m_tokens', 'per_1k_tokens', 'per_image', 'per_second', 'custom'] as const;
const routeTypes = ['direct', 'proxy', 'aggregator', 'internal'] as const;
const integrationTargets = ['openclaw', 'nemoclaw', 'nanoclaw', 'other'] as const;

const inputStyle = { padding: 10, borderRadius: 10, border: '1px solid var(--line)' } as const;
const sectionStyle = { display: 'grid', gap: 12, border: '1px solid var(--line)', borderRadius: 14, padding: 16 } as const;
const nestedCardStyle = { display: 'grid', gap: 12, border: '1px solid #e6ebf5', borderRadius: 12, padding: 12, background: '#fafcff' } as const;
const routeStackStyle = { display: 'grid', gap: 16, border: '1px solid #d9e4f2', borderRadius: 16, padding: 16, background: '#fcfdff' } as const;

const sampleImportPayload = `{
  "model": {
    "providerId": "openai",
    "apiModelId": "gpt-5.4",
    "displayName": "GPT 5.4",
    "family": "gpt-5",
    "tier": "frontier",
    "status": "active",
    "sourceUrl": "https://platform.openai.com/docs/models"
  },
  "capability": {
    "contextWindow": 200000,
    "maxOutputTokens": 32000,
    "toolCalling": true,
    "structuredOutput": true,
    "streaming": true,
    "reasoningMode": true,
    "qualityClass": "frontier",
    "costClass": "high",
    "latencyClass": "medium",
    "sourceUrl": "https://platform.openai.com/docs/models"
  },
  "suitability": {
    "recommendedFor": ["coding", "agent orchestration"],
    "skillScores": { "coding": 0.96, "analysis": 0.92 }
  },
  "routes": [
    {
      "label": "OpenAI direct",
      "routeType": "direct",
      "supportsTools": true,
      "supportsStreaming": true,
      "supportsStructuredOutput": true,
      "supportsReasoningMode": true,
      "sourceUrl": "https://platform.openai.com/docs/api-reference",
      "pricing": [
        {
          "billingUnit": "per_1m_tokens",
          "currency": "USD",
          "inputPrice": 10,
          "outputPrice": 30,
          "sourceUrl": "https://openai.com/api/pricing"
        }
      ],
      "integrations": [
        {
          "integrationTarget": "openclaw",
          "suggestedAlias": "GPT",
          "providerModelString": "openai/gpt-5.4",
          "requiredFields": ["apiKey"],
          "supportsFallbackRole": true
        }
      ]
    }
  ]
}`;

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ background: 'var(--accent)', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function BooleanSelect({ name, defaultValue }: { name: string; defaultValue: boolean | string }) {
  return (
    <select name={name} defaultValue={String(defaultValue)} style={inputStyle}>
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...(props.style ?? {}) }} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, ...(props.style ?? {}) }} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, ...(props.style ?? {}) }} />;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {subtitle ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>{subtitle}</div> : null}
    </div>
  );
}

function money(value: number | null) {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}

function scoreMapToText(map?: Record<string, number>) {
  return Object.entries(map ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
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

function sortLabel(isSorted: false | 'asc' | 'desc') {
  if (isSorted === 'asc') return ' ↑';
  if (isSorted === 'desc') return ' ↓';
  return '';
}

function RouteCard({ route, index, pricingRecords, integrationMetadata }: { route: ModelDetailRecord['routes'][number]; index: number; pricingRecords: ModelDetailRecord['pricingRecords']; integrationMetadata: ModelDetailRecord['integrationMetadata'] }) {
  const routeBooleanFields = [
    { name: 'supportsTools', value: Boolean(route.supportsTools) },
    { name: 'supportsStreaming', value: Boolean(route.supportsStreaming) },
    { name: 'supportsStructuredOutput', value: Boolean(route.supportsStructuredOutput) },
    { name: 'supportsReasoningMode', value: Boolean(route.supportsReasoningMode) },
  ];
  const routePricing = pricingRecords.filter((pricing) => pricing.modelRouteId === route.id);
  const routeIntegrations = integrationMetadata.filter((metadata) => metadata.modelRouteId === route.id);
  const usedTargets = new Set(routeIntegrations.map((metadata) => metadata.integrationTarget));
  const availableTargets = integrationTargets.filter((target) => !usedTargets.has(target));

  return (
    <div style={routeStackStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>Route {index + 1}</div>
          <h3 style={{ margin: '4px 0 6px 0' }}>{route.label}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
            <span>{route.routeType}</span>
            <span>•</span>
            <span>{route.baseUrl ?? 'No base URL'}</span>
            <span>•</span>
            <span>{routePricing.length} pricing record{routePricing.length === 1 ? '' : 's'}</span>
            <span>•</span>
            <span>{routeIntegrations.length} integration{routeIntegrations.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16, alignItems: 'start' }}>
        <form action={saveRouteAction} style={sectionStyle}>
          <input type="hidden" name="id" value={route.id} />
          <SectionTitle title="Route settings" subtitle="Edit the transport-level behavior and declared capabilities for this route." />
          <Field label="Label"><TextInput name="label" defaultValue={route.label} /></Field>
          <Field label="Base URL"><TextInput name="baseUrl" defaultValue={route.baseUrl ?? ''} /></Field>
          <Field label="Route type"><Select name="routeType" defaultValue={route.routeType}>{routeTypes.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>{routeBooleanFields.map((field) => <Field key={field.name} label={field.name}><BooleanSelect name={field.name} defaultValue={field.value} /></Field>)}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Save route" /></div>
        </form>

        <div style={{ display: 'grid', gap: 16 }}>
          <section style={sectionStyle}>
            <SectionTitle title="Pricing" subtitle="Costs are attached to the route rather than the model overall." />
            {routePricing.map((pricing) => (
              <form key={pricing.id} action={savePricingAction} style={nestedCardStyle}>
                <input type="hidden" name="id" value={pricing.id} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Field label="Billing unit"><Select name="billingUnit" defaultValue={pricing.billingUnit}>{pricingUnits.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                  <Field label="Currency"><TextInput name="currency" defaultValue={pricing.currency} /></Field>
                  <Field label="Input price"><TextInput name="inputPrice" defaultValue={pricing.inputPrice} /></Field>
                  <Field label="Output price"><TextInput name="outputPrice" defaultValue={pricing.outputPrice} /></Field>
                  <Field label="Cached input price"><TextInput name="cachedInputPrice" defaultValue={pricing.cachedInputPrice ?? ''} /></Field>
                </div>
                <Field label="Notes"><TextArea name="notes" defaultValue={pricing.notes ?? ''} rows={2} /></Field>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div style={{ fontSize: 12, color: 'var(--muted)' }}>{money(pricing.inputPrice)} in / {money(pricing.outputPrice)} out</div><SaveButton label="Save pricing" /></div>
              </form>
            ))}
            <form action={createPricingAction} style={{ display: 'grid', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <input type="hidden" name="modelRouteId" value={route.id} />
              <div style={{ fontWeight: 600 }}>Add pricing record</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <Field label="Billing unit"><Select name="billingUnit" defaultValue="per_1m_tokens">{pricingUnits.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                <Field label="Currency"><TextInput name="currency" defaultValue="USD" /></Field>
                <Field label="Input price"><TextInput name="inputPrice" /></Field>
                <Field label="Output price"><TextInput name="outputPrice" /></Field>
                <Field label="Cached input price"><TextInput name="cachedInputPrice" /></Field>
              </div>
              <Field label="Notes"><TextArea name="notes" rows={2} /></Field>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Add pricing" /></div>
            </form>
          </section>

          <section style={sectionStyle}>
            <SectionTitle title="Integrations" subtitle="Mapping metadata for consumers like OpenClaw, NemoClaw, or NanoClaw." />
            {routeIntegrations.map((metadata) => (
              <form key={metadata.id} action={saveIntegrationAction} style={nestedCardStyle}>
                <input type="hidden" name="id" value={metadata.id} />
                <div style={{ fontWeight: 600 }}>{metadata.integrationTarget}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                  <Field label="Suggested alias"><TextInput name="suggestedAlias" defaultValue={metadata.suggestedAlias ?? ''} /></Field>
                  <Field label="Provider model string"><TextInput name="providerModelString" defaultValue={metadata.providerModelString ?? ''} /></Field>
                  <Field label="Required fields (comma-separated)"><TextInput name="requiredFields" defaultValue={metadata.requiredFields?.join(', ') ?? ''} /></Field>
                  <Field label="Supports fallback role"><BooleanSelect name="supportsFallbackRole" defaultValue={Boolean(metadata.supportsFallbackRole)} /></Field>
                </div>
                <Field label="Compatibility notes"><TextArea name="compatibilityNotes" defaultValue={metadata.compatibilityNotes ?? ''} rows={3} /></Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label={`Save ${metadata.integrationTarget}`} /></div>
              </form>
            ))}
            {availableTargets.length ? (
              <form action={createIntegrationAction} style={{ display: 'grid', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <input type="hidden" name="modelRouteId" value={route.id} />
                <div style={{ fontWeight: 600 }}>Add integration</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Field label="Target"><Select name="integrationTarget" defaultValue={availableTargets[0]}>{availableTargets.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                  <Field label="Suggested alias"><TextInput name="suggestedAlias" /></Field>
                  <Field label="Provider model string"><TextInput name="providerModelString" /></Field>
                  <Field label="Required fields (comma-separated)"><TextInput name="requiredFields" defaultValue="apiKey" /></Field>
                  <Field label="Supports fallback role"><BooleanSelect name="supportsFallbackRole" defaultValue="true" /></Field>
                </div>
                <Field label="Compatibility notes"><TextArea name="compatibilityNotes" rows={2} /></Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Add integration" /></div>
              </form>
            ) : (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, fontSize: 13, color: 'var(--muted)' }}>All integration targets already exist for this route.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

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
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sorting, setSorting] = useState([{ id: 'displayName', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importState, importAction] = useActionState<ImportModelBundleResult | null, FormData>(importModelBundleAction, null);

  const detailMap = useMemo(() => new Map(details.map((detail) => [detail.model.id, detail])), [details]);
  const selected = selectedModelId ? detailMap.get(selectedModelId) ?? null : null;
  const integrationOptions = useMemo(() => ['all', ...new Set(rows.flatMap((row) => row.integrationTargets))], [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
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
        if (search.trim()) {
          const needle = search.trim().toLowerCase();
          const haystack = [
            row.displayName,
            row.modelId,
            row.apiModelId,
            row.providerName,
            row.providerId,
            row.family,
            row.tier,
            row.status,
            row.routeLabel ?? '',
            row.routeType ?? '',
            ...row.routeBaseUrls,
            ...row.routeProviderModelStrings,
            ...row.integrationTargets,
            ...row.suitabilityKeywords,
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      }),
    [rows, providerFilter, integrationFilter, toolsOnly, qualityFilter, contextFilter, costFilter, skillFilter, search],
  );

  const columns = useMemo<ColumnDef<ModelListRow>[]>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Model',
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 600 }}>{row.original.displayName}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.original.apiModelId}</div>
          </div>
        ),
      },
      { accessorKey: 'providerName', header: 'Provider' },
      { accessorKey: 'family', header: 'Family' },
      { accessorKey: 'tier', header: 'Tier' },
      {
        accessorKey: 'routeLabel',
        header: 'Route',
        cell: ({ row }) => (
          <div>
            <div>{row.original.routeLabel ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{row.original.routeProviderModelStrings[0] ?? row.original.routeType ?? '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'inputPrice',
        header: 'Input',
        cell: ({ row }) => money(row.original.inputPrice),
      },
      {
        accessorKey: 'outputPrice',
        header: 'Output',
        cell: ({ row }) => money(row.original.outputPrice),
      },
      {
        accessorKey: 'contextWindow',
        header: 'Context',
        cell: ({ row }) => row.original.contextWindow?.toLocaleString() ?? '—',
      },
      {
        accessorKey: 'supportsTools',
        header: 'Tools',
        cell: ({ row }) => (row.original.supportsTools == null ? '—' : row.original.supportsTools ? 'Yes' : 'No'),
      },
      {
        accessorKey: 'qualityClass',
        header: 'Quality',
        cell: ({ row }) => row.original.qualityClass ?? '—',
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Main workbench: search, filter, paginate, inspect, edit, import, and create model records from one screen.</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setIsImportOpen(true)} style={{ background: 'white', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>Import bundle</button>
          <button onClick={() => setIsCreateOpen(true)} style={{ background: 'var(--accent)', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>Add model</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, marginBottom: 16, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', minWidth: 280 }}>
            <Field label="Search models">
              <TextInput
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                placeholder="Search name, model ID, provider, family, route label, provider model string…"
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', minWidth: 160 }}
          >
            {filtersOpen ? 'Hide advanced filters' : 'Show advanced filters'}
          </button>
        </div>

        {filtersOpen ? (
          <div style={{ display: 'grid', gap: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
              <Field label="Provider"><Select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}><option value="all">all</option>{providerOptions.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}</Select></Field>
              <Field label="Integration target"><Select value={integrationFilter} onChange={(event) => setIntegrationFilter(event.target.value)}>{integrationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
              <Field label="Skill / suitability keyword"><TextInput value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} placeholder="coding, multimodal, orchestrator…" /></Field>
              <Field label="Tools support"><Select value={toolsOnly ? 'yes' : 'all'} onChange={(event) => setToolsOnly(event.target.value === 'yes')}><option value="all">all</option><option value="yes">tools only</option></Select></Field>
              <Field label="Quality class"><Select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)}><option value="all">all</option>{['low', 'medium', 'high', 'frontier', 'unknown'].map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
              <Field label="Context size"><Select value={contextFilter} onChange={(event) => setContextFilter(event.target.value)}><option value="all">all</option>{['small', 'medium', 'large', 'xl', 'unknown'].map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
              <Field label="Cost band"><Select value={costFilter} onChange={(event) => setCostFilter(event.target.value)}><option value="all">all</option>{['low', 'medium', 'high', 'unknown'].map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
              <Field label="Rows per page">
                <Select
                  value={String(pagination.pageSize)}
                  onChange={(event) => setPagination((current) => ({ pageIndex: 0, pageSize: Number(event.target.value) }))}
                >
                  {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        ) : null}

        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {filteredRows.length} model rows match current search/filter state. Showing {table.getRowModel().rows.length} on this page.
        </div>
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f0f4fb', textAlign: 'left' }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th key={header.id} style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            style={{ background: 'transparent', border: 0, padding: 0, font: 'inherit', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sortLabel(sorted)}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} onClick={() => { setSelectedModelId(row.original.modelId); setIsOpen(true); }} style={{ cursor: 'pointer' }}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                    No models match the current search/filter state.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 16, borderTop: '1px solid var(--line)', background: '#fbfcff', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>First</button>
            <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Previous</button>
            <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Next</button>
            <button type="button" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Last</button>
          </div>
        </div>
      </div>

      {isImportOpen ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 16, 30, 0.48)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }} onClick={() => setIsImportOpen(false)}>
          <div style={{ width: 'min(860px, 100%)', background: 'white', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ margin: 0 }}>Import model bundle</h2><button onClick={() => setIsImportOpen(false)} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Close</button></div>
            <form action={importAction} style={{ display: 'grid', gap: 16 }}>
              <SectionTitle title="JSON bundle import" subtitle="Paste a canonical model bundle to create or update the model, routes, pricing, capability, suitability, and integrations deterministically." />
              <Field label="Payload"><TextArea name="payload" defaultValue={sampleImportPayload} rows={24} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', fontSize: 13 }} /></Field>
              {importState ? (
                <div style={{ borderRadius: 12, padding: 12, background: importState.ok ? '#eefaf2' : '#fff1f1', border: `1px solid ${importState.ok ? '#b7e4c7' : '#f2b8b5'}`, color: importState.ok ? '#215c34' : '#8a1f17' }}>
                  {importState.ok ? (
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong>Import complete</strong>
                      <div>Model: {importState.summary?.providerId}/{importState.summary?.apiModelId}</div>
                      <div>Routes: {importState.summary?.routeCount} · Pricing: {importState.summary?.pricingCount} · Integrations: {importState.summary?.integrationCount}</div>
                      <div>Registry id: {importState.modelId}</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong>Import failed</strong>
                      <div>{importState.error}</div>
                    </div>
                  )}
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Validation now rejects duplicate route labels, duplicate pricing billing units per route, duplicate integration targets per route, invalid enums, and negative pricing.</div>
                <SaveButton label="Import bundle" />
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 16, 30, 0.48)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }} onClick={() => setIsCreateOpen(false)}>
          <div style={{ width: 'min(720px, 100%)', background: 'white', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ margin: 0 }}>Add model</h2><button onClick={() => setIsCreateOpen(false)} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Close</button></div>
            <form action={createModelAction} style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                <Field label="Provider"><Select name="providerId" defaultValue={providerOptions[0]?.id}>{providerOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select></Field>
                <Field label="Integration target"><Select name="integrationTarget" defaultValue="openclaw">{integrationTargets.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                <Field label="Display name"><TextInput name="displayName" /></Field>
                <Field label="API model id"><TextInput name="apiModelId" /></Field>
                <Field label="Family"><TextInput name="family" /></Field>
                <Field label="Tier"><TextInput name="tier" defaultValue="standard" /></Field>
                <Field label="Status"><Select name="status" defaultValue="active">{['active', 'preview', 'deprecated', 'experimental', 'disabled'].map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Create model" /></div>
            </form>
          </div>
        </div>
      ) : null}

      {isOpen && selected ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 16, 30, 0.48)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }} onClick={() => setIsOpen(false)}>
          <div style={{ width: 'min(1160px, 100%)', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', marginBottom: 20 }}>
              <div><h2 style={{ margin: '0 0 8px 0' }}>{selected.model.displayName}</h2><div style={{ color: 'var(--muted)', fontSize: 14 }}>{selected.provider?.name ?? 'Unknown provider'} · {selected.model.apiModelId}</div></div>
              <button onClick={() => setIsOpen(false)} style={{ border: '1px solid var(--line)', background: 'white', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>Close</button>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <form action={saveModelAction} style={{ display: 'grid', gap: 18, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                <input type="hidden" name="id" value={selected.model.id} />
                <SectionTitle title="Model" subtitle="Core identity and lifecycle metadata for this model." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                  <Field label="Display name"><TextInput name="displayName" defaultValue={selected.model.displayName} /></Field>
                  <Field label="Family"><TextInput name="family" defaultValue={selected.model.family} /></Field>
                  <Field label="Tier"><TextInput name="tier" defaultValue={selected.model.tier} /></Field>
                  <Field label="Status"><Select name="status" defaultValue={selected.model.status}>{['active', 'preview', 'deprecated', 'experimental', 'disabled'].map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                </div>
                <Field label="Description"><TextArea name="description" defaultValue={selected.model.description ?? ''} rows={3} /></Field>
                <Field label="Notes"><TextArea name="notes" defaultValue={selected.model.notes ?? ''} rows={3} /></Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Save model" /></div>
              </form>

              <section style={sectionStyle}>
                <SectionTitle title="Add route" subtitle="Create an additional route before attaching pricing or integration metadata to it." />
                <form action={createRouteAction} style={{ display: 'grid', gap: 12 }}>
                  <input type="hidden" name="modelId" value={selected.model.id} />
                  <input type="hidden" name="providerId" value={selected.model.providerId} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    <Field label="Label"><TextInput name="label" /></Field>
                    <Field label="Base URL"><TextInput name="baseUrl" /></Field>
                    <Field label="Route type"><Select name="routeType" defaultValue="direct">{routeTypes.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>{['supportsTools', 'supportsStreaming', 'supportsStructuredOutput', 'supportsReasoningMode'].map((name) => <Field key={name} label={name}><BooleanSelect name={name} defaultValue="true" /></Field>)}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Add route" /></div>
                </form>
              </section>

              <section style={{ display: 'grid', gap: 16 }}>
                <SectionTitle title="Routes" subtitle={`${selected.routes.length} route${selected.routes.length === 1 ? '' : 's'} attached to this model. Each route owns its own pricing and integration metadata.`} />
                {selected.routes.map((route, index) => (
                  <RouteCard key={route.id} route={route} index={index} pricingRecords={selected.pricingRecords} integrationMetadata={selected.integrationMetadata} />
                ))}
              </section>

              <form action={saveCapabilityAction} style={{ display: 'grid', gap: 16, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                <input type="hidden" name="modelId" value={selected.model.id} />
                <SectionTitle title="Capabilities" subtitle="Context limits, quality bands, and behavior flags that apply at the model level." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                  <Field label="Context window"><TextInput name="contextWindow" defaultValue={selected.capabilityProfile?.limits?.contextWindow ?? ''} /></Field>
                  <Field label="Max output tokens"><TextInput name="maxOutputTokens" defaultValue={selected.capabilityProfile?.limits?.maxOutputTokens ?? ''} /></Field>
                  <Field label="Quality class"><Select name="qualityClass" defaultValue={selected.capabilityProfile?.operationalClasses?.qualityClass ?? ''}><option value="">—</option>{['low', 'medium', 'high', 'frontier'].map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                  <Field label="Cost class"><Select name="costClass" defaultValue={selected.capabilityProfile?.operationalClasses?.costClass ?? ''}><option value="">—</option>{['low', 'medium', 'high'].map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                  <Field label="Latency class"><Select name="latencyClass" defaultValue={selected.capabilityProfile?.operationalClasses?.latencyClass ?? ''}><option value="">—</option>{['low', 'medium', 'high'].map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>{[{ name: 'toolCalling', value: Boolean(selected.capabilityProfile?.features?.toolCalling) }, { name: 'structuredOutput', value: Boolean(selected.capabilityProfile?.features?.structuredOutput) }, { name: 'streaming', value: Boolean(selected.capabilityProfile?.features?.streaming) }, { name: 'reasoningMode', value: Boolean(selected.capabilityProfile?.features?.reasoningMode) }].map((field) => <Field key={field.name} label={field.name}><BooleanSelect name={field.name} defaultValue={field.value} /></Field>)}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Save capability" /></div>
              </form>

              <form action={saveSuitabilityAction} style={{ display: 'grid', gap: 16, border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                <input type="hidden" name="modelId" value={selected.model.id} />
                <SectionTitle title="Suitability / specialisation" subtitle="Where this model is strong, where it is weak, and how it should be selected." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                  <Field label="Strength notes"><TextArea name="strengthNotes" defaultValue={selected.suitabilityProfile?.strengthNotes ?? ''} rows={3} /></Field>
                  <Field label="Weakness notes"><TextArea name="weaknessNotes" defaultValue={selected.suitabilityProfile?.weaknessNotes ?? ''} rows={3} /></Field>
                  <Field label="Recommended for (comma-separated)"><TextInput name="recommendedFor" defaultValue={selected.suitabilityProfile?.recommendedFor?.join(', ') ?? ''} /></Field>
                  <Field label="Avoid for (comma-separated)"><TextInput name="avoidFor" defaultValue={selected.suitabilityProfile?.avoidFor?.join(', ') ?? ''} /></Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                  <Field label="Skill scores (`key=value` per line)"><TextArea name="skillScores" defaultValue={scoreMapToText(selected.suitabilityProfile?.skillScores)} rows={8} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} /></Field>
                  <Field label="Task scores (`key=value` per line)"><TextArea name="taskScores" defaultValue={scoreMapToText(selected.suitabilityProfile?.taskScores)} rows={8} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} /></Field>
                  <Field label="Agent type scores (`key=value` per line)"><TextArea name="agentTypeScores" defaultValue={scoreMapToText(selected.suitabilityProfile?.agentTypeScores)} rows={8} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }} /></Field>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveButton label="Save suitability" /></div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
