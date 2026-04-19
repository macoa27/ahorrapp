'use client'

// =============================================================
// AHORRAPP — src/app/dashboard/importar/page.tsx
// Importación de gastos desde CSV.
// Detecta columnas automáticamente por nombre.
// =============================================================

import { useState, useRef } from 'react'
import { Card, Button } from '@/components/ui'

interface PreviewRow {
  fecha:    string
  monto:    string
  comercio: string
}

export default function ImportarPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [csvText, setCsvText]       = useState('')
  const [preview, setPreview]       = useState<PreviewRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<{ imported: number; errors: number } | null>(null)
  const [error, setError]           = useState('')

  function parsearPreview(text: string) {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return

    const sep     = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(sep).map(h => h.toLowerCase().trim().replace(/"/g, ''))

    const colFecha    = headers.findIndex(h => h.includes('fecha'))
    const colMonto    = headers.findIndex(h => ['monto','importe','débito','debito','importe'].some(k => h.includes(k)))
    const colComercio = headers.findIndex(h => ['comercio','descripcion','descripción','concepto'].some(k => h.includes(k)))

    const rows = lines.slice(1, 6).map(line => {
      const cols = line.split(sep).map(c => c.trim().replace(/"/g, ''))
      return {
        fecha:    colFecha    >= 0 ? cols[colFecha]    : '—',
        monto:    colMonto    >= 0 ? cols[colMonto]    : '—',
        comercio: colComercio >= 0 ? cols[colComercio] : '—',
      }
    })

    setPreview(rows)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setCsvText(text)
      parsearPreview(text)
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleTextChange(text: string) {
    setCsvText(text)
    if (text.trim()) parsearPreview(text)
    else setPreview([])
  }

  async function handleImport() {
    if (!csvText.trim()) { setError('Pegá o subí un archivo CSV'); return }
    setLoading(true)
    setError('')
    setResult(null)

    const res = await fetch('/api/transactions/import', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ csv: csvText }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error al importar')
      return
    }

    const data = await res.json()
    setResult(data)
    if (data.imported > 0) {
      setCsvText('')
      setPreview([])
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in max-w-2xl">

      <div>
        <h1 className="text-base font-semibold text-white">Importar CSV</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Importá gastos desde el resumen de tu tarjeta o banco.
        </p>
      </div>

      <Card>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">
          Subir archivo
        </p>

        <div
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-brand/30 transition-colors mb-3"
        >
          <p className="text-2xl mb-2">📤</p>
          <p className="text-sm text-zinc-400">Click para seleccionar un archivo CSV</p>
          <p className="text-xs text-zinc-600 mt-1">.csv · .txt</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
          O pegá el contenido aquí
        </p>
        <textarea
          value={csvText}
          onChange={e => handleTextChange(e.target.value)}
          rows={6}
          placeholder={`fecha,monto,comercio\n15/04/2025,1500,Carrefour\n16/04/2025,850,Uber`}
          className="w-full bg-base-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 font-mono focus:outline-none focus:border-brand/50 resize-none"
        />
      </Card>

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">
            Vista previa (primeras 5 filas)
          </p>
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {['Fecha', 'Monto', 'Comercio'].map(h => (
                  <th key={h} className="text-left pb-2 text-[9px] text-zinc-600 uppercase tracking-wider border-b border-white/[0.05] font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  <td className="py-2 text-[11px] text-zinc-400 border-b border-white/[0.03]">{row.fecha}</td>
                  <td className="py-2 text-[11px] text-white border-b border-white/[0.03]">{row.monto}</td>
                  <td className="py-2 text-[11px] text-zinc-400 border-b border-white/[0.03] truncate">{row.comercio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {result && (
        <div className="bg-base-700 border border-success/20 rounded-xl p-4">
          <p className="text-sm text-success font-medium">
            ✓ {result.imported} transacciones importadas
          </p>
          {result.errors > 0 && (
            <p className="text-xs text-zinc-500 mt-1">
              {result.errors} filas ignoradas por datos inválidos
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => { setCsvText(''); setPreview([]); setResult(null) }}
          className="flex-1"
        >
          Limpiar
        </Button>
        <Button onClick={handleImport} loading={loading} className="flex-1">
          Importar
        </Button>
      </div>

      {/* Instrucciones */}
      <Card>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">
          Formatos soportados
        </p>
        <div className="flex flex-col gap-3 text-xs text-zinc-400">
          <div>
            <p className="text-zinc-300 font-medium mb-1">Santander / Galicia</p>
            <code className="block bg-base-900 rounded-lg p-2 text-[10px] text-zinc-500 font-mono">
              Fecha;Descripción;Importe{'\n'}
              15/04/2025;CARREFOUR PALERMO;-3500,00
            </code>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-1">Mercado Pago</p>
            <code className="block bg-base-900 rounded-lg p-2 text-[10px] text-zinc-500 font-mono">
              Fecha,Descripción,Monto{'\n'}
              2025-04-15,Farmacity,-2300
            </code>
          </div>
          <div>
            <p className="text-zinc-300 font-medium mb-1">Formato genérico</p>
            <code className="block bg-base-900 rounded-lg p-2 text-[10px] text-zinc-500 font-mono">
              fecha,monto,comercio{'\n'}
              15/04/2025,1500,Carrefour
            </code>
          </div>
        </div>
      </Card>

    </div>
  )
}