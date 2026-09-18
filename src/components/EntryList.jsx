import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmtTime, stripHtml } from '../util'

const PAGE_SIZE = 20

// EntryList 是阅读页：条目列表，支持按渠道过滤与分页。
export default function EntryList() {
  const [entries, setEntries] = useState([])
  const [sources, setSources] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sourceId, setSourceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listSources()
      .then((r) => setSources(r.items || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .listEntries({ page, pageSize: PAGE_SIZE, sourceId: sourceId || undefined })
      .then((r) => {
        if (cancelled) return
        setEntries(r.items || [])
        setTotal(r.total || 0)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, sourceId])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">阅读</h1>
        <div className="flex items-center gap-3 text-sm">
          <select
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value)
              setPage(1)
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5"
          >
            <option value="">全部渠道</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-slate-500">共 {total} 条</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400">加载中…</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <p className="text-lg">还没有内容</p>
          <p className="mt-1 text-sm text-slate-400">
            去「渠道」页添加一个 feed 源，然后点「立即刷新」。
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <a
                href={`#/entries/${e.id}`}
                className="text-base font-semibold text-slate-900 hover:text-blue-600"
              >
                {e.title || '(无标题)'}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {sourceName(sources, e.source_id) && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                    {sourceName(sources, e.source_id)}
                  </span>
                )}
                {e.author && <span>{e.author}</span>}
                <time>{fmtTime(e.published_at)}</time>
              </div>
              {e.summary && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {stripHtml(e.summary)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-slate-500">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

function sourceName(sources, id) {
  const s = sources.find((x) => x.id === id)
  return s ? s.name : ''
}
