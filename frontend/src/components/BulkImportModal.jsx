import { useState, useRef } from 'react'

function splitLine(line, sep) {
  if (sep === '\t') return line.split('\t').map(c => c.trim())
  const cells = []
  let curr = '', inQ = false
  for (const c of line) {
    if (c === '"') { inQ = !inQ; continue }
    if (c === sep && !inQ) { cells.push(curr.trim()); curr = ''; continue }
    curr += c
  }
  cells.push(curr.trim())
  return cells
}

function parseText(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return null
  const sep = lines[0].includes('\t') ? '\t' : ','
  const headers = splitLine(lines[0], sep)
  const rows = lines.slice(1).map(line => {
    const cells = splitLine(line, sep)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] ?? '' })
    return obj
  }).filter(row => Object.values(row).some(v => v.trim()))
  return rows.length ? { headers, rows } : null
}

const emptyRow = (cols) => Object.fromEntries(cols.map(c => [c.key, '']))

export default function BulkImportModal({ title, columns, templateName, onImport, onClose }) {
  const [tab, setTab] = useState('upload')
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState(null)
  const [formRows, setFormRows] = useState(() => Array.from({ length: 3 }, () => emptyRow(columns)))
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const doParse = (text) => {
    setError('')
    const result = parseText(text)
    if (!result) { setError('Không tìm thấy dữ liệu hợp lệ. Đảm bảo có header row.'); return }
    setPreview(result)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => doParse(ev.target.result)
    reader.readAsText(file, 'UTF-8')
  }

  const removePreviewRow = (i) => setPreview(p => ({ ...p, rows: p.rows.filter((_, j) => j !== i) }))
  const addFormRow = () => setFormRows(p => [...p, emptyRow(columns)])
  const removeFormRow = (i) => setFormRows(p => p.filter((_, j) => j !== i))
  const updateCell = (i, key, val) => setFormRows(p => p.map((r, j) => j === i ? { ...r, [key]: val } : r))

  const toItem = (rawRow, fromPreview) => {
    const item = {}
    columns.forEach(col => {
      const val = fromPreview
        ? (rawRow[col.key] ?? rawRow[col.label] ?? '')
        : (rawRow[col.key] ?? '')
      item[col.key] = col.type === 'number' ? (val ? Number(val) : null) : (val || null)
    })
    return item
  }

  const requiredKey = columns.find(c => c.required)?.key
  const formValidRows = formRows.filter(r => !requiredKey || r[requiredKey]?.trim())
  const itemCount = tab === 'form' ? formValidRows.length : (preview?.rows.length ?? 0)

  const handleImport = async () => {
    setError('')
    let items
    if (tab === 'form') {
      if (!formValidRows.length) { setError('Chưa có dòng nào hợp lệ.'); return }
      items = formValidRows.map(r => toItem(r, false))
    } else {
      if (!preview?.rows.length) { setError('Chưa có dữ liệu để import.'); return }
      items = preview.rows.map(r => toItem(r, true))
    }
    setImporting(true)
    try {
      await onImport(items)
      onClose()
    } catch (err) {
      setError('Lỗi import: ' + err.message)
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const header = columns.map(c => c.key).join(',')
    const example = columns.map(c => c.example ?? '').join(',')
    const blob = new Blob(['﻿' + header + '\n' + example], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = templateName || 'template.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const TABS = [['upload', '📂 Upload CSV'], ['paste', '📋 Paste từ Sheets'], ['form', '✏️ Nhập từng hàng']]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 860, maxWidth: '96vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={downloadTemplate} style={{ padding: '5px 12px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
              ↓ Tải template
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9ca3af', lineHeight: 1 }}>×</button>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 20px', flexShrink: 0 }}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); setError('') }} style={{
              padding: '9px 14px', border: 'none', cursor: 'pointer', fontSize: 13, background: 'none',
              fontWeight: tab === k ? 600 : 400, color: tab === k ? '#4f46e5' : '#6b7280',
              borderBottom: tab === k ? '2px solid #4f46e5' : '2px solid transparent', marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tab === 'upload' && !preview && (
            <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #d1d5db', borderRadius: 10, padding: '48px 0', textAlign: 'center', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 500, color: '#374151' }}>Click để chọn file .csv</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>UTF-8 encoding • Hàng đầu tiên là header (tên field)</div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
            </div>
          )}

          {tab === 'paste' && !preview && (
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                Trong Google Sheets: chọn toàn bộ ô (kể cả hàng header) → Ctrl+C → paste vào đây:
              </div>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={columns.map(c => c.key).join('\t') + '\n' + columns.map(c => c.example || '').join('\t')}
                style={{ width: '100%', height: 160, fontFamily: 'monospace', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, padding: 8, resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: '#374151' }}
              />
              <button
                onClick={() => doParse(pasteText)}
                disabled={!pasteText.trim()}
                style={{ marginTop: 8, padding: '7px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: pasteText.trim() ? 'pointer' : 'default', opacity: pasteText.trim() ? 1 : 0.5 }}
              >Phân tích →</button>
            </div>
          )}

          {(tab === 'upload' || tab === 'paste') && preview && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Preview — <strong>{preview.rows.length}</strong> dòng</span>
                <button onClick={() => { setPreview(null); setPasteText(''); if (fileRef.current) fileRef.current.value = '' }} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>← Nhập lại</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', color: '#9ca3af', fontWeight: 400, width: 28 }}>#</th>
                      {preview.headers.map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                      <th style={{ width: 28, borderBottom: '1px solid #e5e7eb' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '5px 8px', color: '#9ca3af', textAlign: 'center' }}>{i + 1}</td>
                        {preview.headers.map(h => (
                          <td key={h} style={{ padding: '5px 8px', color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row[h] || <span style={{ color: '#d1d5db' }}>—</span>}
                          </td>
                        ))}
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          <button onClick={() => removePreviewRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'form' && (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', color: '#9ca3af', fontWeight: 400, width: 28 }}>#</th>
                      {columns.map(col => (
                        <th key={col.key} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', minWidth: col.type === 'number' ? 80 : 100 }}>
                          {col.label}{col.required && <span style={{ color: '#ef4444' }}>*</span>}
                        </th>
                      ))}
                      <th style={{ width: 28, borderBottom: '1px solid #e5e7eb' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {formRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '4px 8px', color: '#9ca3af', textAlign: 'center' }}>{i + 1}</td>
                        {columns.map(col => (
                          <td key={col.key} style={{ padding: '3px 4px' }}>
                            <input
                              type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                              value={row[col.key]}
                              onChange={e => updateCell(i, col.key, e.target.value)}
                              placeholder={col.example || ''}
                              min={col.type === 'number' ? 0 : undefined}
                              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 4, padding: '4px 6px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                          <button onClick={() => removeFormRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, lineHeight: 1 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addFormRow} style={{ marginTop: 10, padding: '5px 14px', background: 'none', border: '1px dashed #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
                + Thêm hàng
              </button>
            </div>
          )}

          {error && (
            <div style={{ color: '#ef4444', fontSize: 13, marginTop: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: '#6b7280', marginRight: 'auto' }}>
            {itemCount > 0 ? `${itemCount} dòng sẽ được tạo` : ''}
          </span>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={importing || itemCount === 0}
            style={{ padding: '7px 18px', borderRadius: 6, border: 'none', background: (importing || !itemCount) ? '#a5b4fc' : '#4f46e5', color: '#fff', fontSize: 13, cursor: (importing || !itemCount) ? 'default' : 'pointer', fontWeight: 500 }}
          >
            {importing ? 'Đang import...' : `Import${itemCount ? ` ${itemCount} dòng` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
