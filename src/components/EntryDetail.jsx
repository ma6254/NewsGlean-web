import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { fmtTime, stripHtml } from '../util'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

// EntryDetail 是单条阅读页：正文按 content_type 决定渲染方式。
export default function EntryDetail() {
  const { id } = useParams()
  const [entry, setEntry] = useState(null)
  const [readLater, setReadLater] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .getEntry(id)
      .then((e) => {
        if (cancelled) return
        setEntry(e)
        setReadLater(Boolean(e.read_later))
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
    return <div className="py-16 text-center text-muted-foreground">加载中…</div>
  }
  if (error) {
    return (
      <div className="py-16 text-center text-destructive">
        <p>{error}</p>
        <Link
          to="/entries"
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          ← 返回列表
        </Link>
      </div>
    )
  }
  if (!entry) return null

  const isHtml = entry.content_type === 'text/html'

  async function toggleReadLater() {
    if (busy) return
    setBusy(true)
    try {
      const updated = await api.setReadLater(entry.id, !readLater)
      setReadLater(Boolean(updated.read_later))
    } catch (e) {
      console.error('toggle read later failed:', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article>
      <Link
        to="/entries"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← 返回列表
      </Link>
      <h1 className="mt-2 text-2xl font-bold leading-snug">
        {entry.title || '(无标题)'}
      </h1>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {entry.author && <span>{entry.author}</span>}
          <time>{fmtTime(entry.published_at)}</time>
          {(entry.tags || []).map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
        <Button
          variant={readLater ? 'secondary' : 'outline'}
          size="sm"
          onClick={toggleReadLater}
          disabled={busy}
        >
          {readLater ? '取消稍后再阅' : '稍后再阅'}
        </Button>
      </div>

      {entry.url && (
        <p className="mt-3">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            查看原文 ↗
          </a>
        </p>
      )}

      {entry.summary && (
        <blockquote className="mt-4 border-l-4 border-border pl-4 text-sm text-muted-foreground">
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
            <pre className="entry-content whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
              {entry.content}
            </pre>
          )
        ) : (
          <p className="text-muted-foreground">（无正文）</p>
        )}
      </div>
    </article>
  )
}
