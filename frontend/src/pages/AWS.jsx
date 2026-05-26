import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const STATE_COLOR = {
  running: '#16a34a',
  stopped: '#dc2626',
  pending: '#d97706',
  terminated: '#9ca3af',
}

const Chevron = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 16 16" fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
  >
    <path d="M4 6l4 4 4-4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function Badge({ color = '#6b7280', label }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
      fontSize: 12, fontWeight: 500, color, background: color + '18',
    }}>
      {label}
    </span>
  )
}

function useFetch(path, getToken) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getToken()
      .then(token => fetch(path, { headers: { Authorization: `Bearer ${token}` } }))
      .then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j.detail || r.statusText)))
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [path])

  return { data, loading, error }
}

function S3BucketRow({ bucket, getToken }) {
  const [open, setOpen] = useState(false)
  const [objects, setObjects] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggle = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (objects !== null) return
    setLoading(true)
    try {
      const token = await getToken()
      const r = await fetch(`/api/aws/s3/${bucket.name}/objects`, { headers: { Authorization: `Bearer ${token}` } })
      const data = r.ok ? await r.json() : await r.json().then(j => Promise.reject(j.detail || r.statusText))
      setObjects(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: '#111827', fontFamily: 'monospace' }}>{bucket.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(bucket.created).toLocaleDateString('vi-VN')}</span>
          <Chevron open={open} />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '10px 16px' }}>
          {loading && <div style={{ fontSize: 13, color: '#9ca3af', padding: '6px 0' }}>Đang tải...</div>}
          {error && <div style={{ fontSize: 13, color: '#dc2626', padding: '6px 0' }}>{error}</div>}
          {objects && objects.length === 0 && (
            <div style={{ fontSize: 13, color: '#9ca3af', padding: '6px 0' }}>Bucket trống.</div>
          )}
          {objects && objects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ display: 'flex', gap: 12, padding: '4px 0', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                <span style={{ flex: 1 }}>Key</span>
                <span style={{ width: 70, textAlign: 'right' }}>Size</span>
                <span style={{ width: 110, textAlign: 'right' }}>Modified</span>
              </div>
              {objects.map(o => (
                <div key={o.key} style={{ display: 'flex', gap: 12, padding: '5px 0', fontSize: 13, borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                  <span style={{ flex: 1, color: '#374151', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.key}</span>
                  <span style={{ width: 70, textAlign: 'right', color: '#6b7280', flexShrink: 0 }}>{formatBytes(o.size)}</span>
                  <span style={{ width: 110, textAlign: 'right', color: '#9ca3af', flexShrink: 0, fontSize: 12 }}>
                    {new Date(o.modified).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EC2Row({ instance }) {
  const [open, setOpen] = useState(false)

  const details = [
    { label: 'Instance ID', value: instance.id },
    { label: 'Type', value: instance.type },
    { label: 'AZ', value: instance.az },
    { label: 'Public IP', value: instance.public_ip || '—' },
    { label: 'Private IP', value: instance.private_ip || '—' },
  ]

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{instance.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge color={STATE_COLOR[instance.state] || '#6b7280'} label={instance.state} />
          <Chevron open={open} />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '12px 16px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {details.map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#111827', fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LambdaRow({ fn }) {
  const [open, setOpen] = useState(false)

  const details = [
    { label: 'Handler', value: fn.handler },
    { label: 'Runtime', value: fn.runtime },
    { label: 'Memory', value: `${fn.memory} MB` },
    { label: 'Timeout', value: `${fn.timeout}s` },
    { label: 'Last Modified', value: new Date(fn.modified).toLocaleDateString('vi-VN') },
  ]

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>{fn.name}</div>
          {fn.description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{fn.description}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 12 }}>
          <Badge color="#7c3aed" label={fn.runtime} />
          <Chevron open={open} />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '12px 16px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {details.map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#111827', fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DynamoRow({ name, getToken }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggle = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (detail !== null) return
    setLoading(true)
    try {
      const token = await getToken()
      const r = await fetch(`/api/aws/dynamodb/tables/${name}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = r.ok ? await r.json() : await r.json().then(j => Promise.reject(j.detail || r.statusText))
      setDetail(data)
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
      <button onClick={toggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', fontFamily: 'monospace' }}>{name}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '10px 16px' }}>
          {loading && <span style={{ fontSize: 13, color: '#9ca3af' }}>Đang tải...</span>}
          {error && <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>}
          {detail && (
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[
                { label: 'Status', value: detail.status },
                { label: 'Items', value: detail.item_count.toLocaleString() },
                { label: 'Size', value: formatBytes(detail.size_bytes) },
                { label: 'Billing', value: detail.billing },
                { label: 'Keys', value: detail.keys.map(k => `${k.name} (${k.type})`).join(', ') },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#111827', fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function APIGatewayRow({ api }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{api.name}</div>
          {api.description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{api.description}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge color="#0891b2" label={api.endpoint[0] || 'REST'} />
          <Chevron open={open} />
        </div>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '12px 16px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'ID', value: api.id },
            { label: 'Created', value: new Date(api.created).toLocaleDateString('vi-VN') },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#111827', fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CloudFrontRow({ dist }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{dist.aliases[0] || dist.domain}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>{dist.domain}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 12 }}>
          <Badge color={dist.status === 'Deployed' ? '#16a34a' : '#d97706'} label={dist.status} />
          <Chevron open={open} />
        </div>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              { label: 'ID', value: dist.id },
              { label: 'Modified', value: new Date(dist.modified).toLocaleDateString('vi-VN') },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#111827', fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Origins</div>
            {dist.origins.map(o => (
              <div key={o} style={{ fontSize: 13, color: '#374151', fontFamily: 'monospace', marginBottom: 2 }}>{o}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BillingCard({ getToken }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (force = false) => {
    force ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const url = force ? '/api/aws/billing/summary?refresh=true' : '/api/aws/billing/summary'
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const json = r.ok ? await r.json() : await r.json().then(j => Promise.reject(j.detail || r.statusText))
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const up = data?.change_pct >= 0

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Dark summary card */}
      <div style={{
        background: '#111827', borderRadius: data?.services?.length ? '12px 12px 0 0' : 12,
        padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 32,
      }}>
        {loading && <span style={{ fontSize: 13, color: '#6b7280' }}>Đang tải billing...</span>}
        {error && <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>}
        {data && (
          <>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tháng này</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.5px' }}>
                ${data.this_month.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={{ fontSize: 13, fontWeight: 500, color: '#4b5563', marginLeft: 6 }}>{data.this_month.label}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: up ? '#f87171' : '#4ade80' }}>
                {up ? '▲' : '▼'} {Math.abs(data.change_pct)}% so với tháng trước
              </div>
            </div>
            <div style={{ width: 1, height: 48, background: '#1f2937', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tháng trước</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.5px' }}>
                ${data.prev_month.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={{ fontSize: 13, fontWeight: 500, color: '#4b5563', marginLeft: 6 }}>{data.prev_month.label}</span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                style={{
                  background: '#1f2937', border: 'none', color: refreshing ? '#374151' : '#6b7280',
                  borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: refreshing ? 'default' : 'pointer',
                }}
              >
                {refreshing ? '...' : '↻ Refresh'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Service breakdown table */}
      {data?.services?.length > 0 && (
        <div style={{ border: '1px solid #1f2937', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden', background: '#0f172a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                <th style={{ textAlign: 'left', padding: '8px 20px', fontSize: 11, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service</th>
                <th style={{ textAlign: 'right', padding: '8px 20px', fontSize: 11, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cost</th>
                <th style={{ textAlign: 'right', padding: '8px 20px', fontSize: 11, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', width: 80 }}>%</th>
                <th style={{ padding: '8px 20px 8px 8px', width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {data.services.map((svc, i) => {
                const pct = data.this_month.amount > 0 ? (svc.amount / data.this_month.amount) * 100 : 0
                return (
                  <tr key={svc.name} style={{ borderBottom: i < data.services.length - 1 ? '1px solid #1a2332' : 'none' }}>
                    <td style={{ padding: '8px 20px', color: '#d1d5db', fontWeight: 500 }}>{svc.name}</td>
                    <td style={{ padding: '8px 20px', color: '#f9fafb', fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>
                      ${svc.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px 20px', color: '#6b7280', textAlign: 'right', fontSize: 12 }}>
                      {pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: '8px 20px 8px 8px' }}>
                      <div style={{ height: 4, borderRadius: 2, background: '#1f2937', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#4f46e5', borderRadius: 2 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 12, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: open ? '#f9fafb' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <span style={{ fontSize: 12, color: '#9ca3af', transition: 'transform 0.15s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function AWS() {
  const { getToken } = useAuth()
  const buckets = useFetch('/api/aws/s3/buckets', getToken)
  const instances = useFetch('/api/aws/ec2/instances', getToken)
  const functions = useFetch('/api/aws/lambda/functions', getToken)
  const dynamo = useFetch('/api/aws/dynamodb/tables', getToken)
  const apis = useFetch('/api/aws/apigateway/apis', getToken)
  const distributions = useFetch('/api/aws/cloudfront/distributions', getToken)

  return (
    <div>
      <BillingCard getToken={getToken} />

      {/* DynamoDB */}
      <Section title={`DynamoDB Tables${dynamo.data ? ` (${dynamo.data.length})` : ''}`}>
        {dynamo.loading && <span style={{ fontSize: 14, color: '#9ca3af' }}>Đang tải...</span>}
        {dynamo.error && <span style={{ fontSize: 14, color: '#dc2626' }}>{dynamo.error}</span>}
        {dynamo.data && dynamo.data.length === 0 && <span style={{ fontSize: 14, color: '#9ca3af' }}>Không có table nào.</span>}
        {dynamo.data && dynamo.data.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {dynamo.data.map(name => <DynamoRow key={name} name={name} getToken={getToken} />)}
          </div>
        )}
      </Section>

      {/* API Gateway */}
      <Section title={`API Gateway${apis.data ? ` (${apis.data.length})` : ''}`}>
        {apis.loading && <span style={{ fontSize: 14, color: '#9ca3af' }}>Đang tải...</span>}
        {apis.error && <span style={{ fontSize: 14, color: '#dc2626' }}>{apis.error}</span>}
        {apis.data && apis.data.length === 0 && <span style={{ fontSize: 14, color: '#9ca3af' }}>Không có API nào.</span>}
        {apis.data && apis.data.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {apis.data.map(a => <APIGatewayRow key={a.id} api={a} />)}
          </div>
        )}
      </Section>

      {/* CloudFront */}
      <Section title={`CloudFront${distributions.data ? ` (${distributions.data.length})` : ''}`}>
        {distributions.loading && <span style={{ fontSize: 14, color: '#9ca3af' }}>Đang tải...</span>}
        {distributions.error && <span style={{ fontSize: 14, color: '#dc2626' }}>{distributions.error}</span>}
        {distributions.data && distributions.data.length === 0 && <span style={{ fontSize: 14, color: '#9ca3af' }}>Không có distribution nào.</span>}
        {distributions.data && distributions.data.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {distributions.data.map(d => <CloudFrontRow key={d.id} dist={d} />)}
          </div>
        )}
      </Section>

      {/* S3 */}
      <Section title={`S3 Buckets${buckets.data ? ` (${buckets.data.length})` : ''}`}>
        {buckets.loading && <span style={{ fontSize: 14, color: '#9ca3af' }}>Đang tải...</span>}
        {buckets.error && <span style={{ fontSize: 14, color: '#dc2626' }}>{buckets.error}</span>}
        {buckets.data && buckets.data.length === 0 && <span style={{ fontSize: 14, color: '#9ca3af' }}>Không có bucket nào.</span>}
        {buckets.data && buckets.data.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {buckets.data.map(b => <S3BucketRow key={b.name} bucket={b} getToken={getToken} />)}
          </div>
        )}
      </Section>

      {/* Lambda */}
      <Section title={`Lambda Functions${functions.data ? ` (${functions.data.length})` : ''}`}>
        {functions.loading && <span style={{ fontSize: 14, color: '#9ca3af' }}>Đang tải...</span>}
        {functions.error && <span style={{ fontSize: 14, color: '#dc2626' }}>{functions.error}</span>}
        {functions.data && functions.data.length === 0 && <span style={{ fontSize: 14, color: '#9ca3af' }}>Không có function nào.</span>}
        {functions.data && functions.data.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {functions.data.map(f => <LambdaRow key={f.name} fn={f} />)}
          </div>
        )}
      </Section>

      {/* EC2 */}
      <Section title={`EC2 Instances${instances.data ? ` (${instances.data.length})` : ''}`}>
        {instances.loading && <span style={{ fontSize: 14, color: '#9ca3af' }}>Đang tải...</span>}
        {instances.error && <span style={{ fontSize: 14, color: '#dc2626' }}>{instances.error}</span>}
        {instances.data && instances.data.length === 0 && <span style={{ fontSize: 14, color: '#9ca3af' }}>Không có instance nào.</span>}
        {instances.data && instances.data.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {instances.data.map(i => <EC2Row key={i.id} instance={i} />)}
          </div>
        )}
      </Section>
    </div>
  )
}
