import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { fmtTime, stripHtml } from '../util'

// EntryDetail 是单条阅读页：正文按 content_type 决定渲染方式。
export default function EntryDetail() {
  const { id } = useParams()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .getEntry(id)
      .then((e) => {
        if (!cancelled) setEntry(e)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <div className="py-16 text-center text-slate-400">加载中…</div>
  }
  if (error) {
    return (
      <div className="py-16 text-center text-red-600">
        <p>{error}</p>
        <Link to="/entries" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          ← 返回列表
        </Link>
      </div>
    )
  }
  if (!entry) return null

  const isHtml = entry.content_type === 'text/html'

  return (
    <article>
      <Link to="/entries" className="text-sm text-slate-500 hover:text-slate-900">
        ← 返回列表
      </Link>
      <h1 className="mt-2 text-2xl font-bold leading-snug">
        {entry.title || '(无标题)'}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {entry.author && <span>{entry.author}</span>}
        <time>{fmtTime(entry.published_at)}</time>
        {(entry.tags || []).map((t) => (
          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5">
            {t}
          </span>
        ))}
      </div>

      {entry.url && (
        <p className="mt-3">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            查看原文 ↗
          </a>
        </p>
      )}

      {entry.summary && (
        <blockquote className="mt-4 border-l-4 border-slate-200 pl-4 text-sm text-slate-600">
          {stripHtml(entry.summary)}
        </blockquote>
      )}

      <div className="mt-6">
        {entry.content ? (
          isHtml ? (
            <div
              className="entry-content"
              dangerouslySetInnerHTML={{ __html: entry.content }}
            />
          ) : (
            <pre className="entry-content whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm">
              {entry.content}
            </pre>
          )
        ) : (
          <p className="text-slate-400">（无正文）</p>
        )}
      </div>
    </article>
  )
}
