import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { fmtTime, stripHtml } from '../util'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { PicViewerDialog } from './PicViewer'
import { PicViewerMobileDialog } from './PicViewerMobile'
import { isMobileDevice } from '../lib/device'

// EntryDetail 是单条阅读页：正文按 content_type 决定渲染方式。
export default function EntryDetail() {
  const { id } = useParams()
  const [entry, setEntry] = useState(null)
  const [readLater, setReadLater] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const contentRef = useRef(null)
  const [viewer, setViewer] = useState(null) // { index, images: [{ src, alt }] }
  const isMobile = useMemo(() => isMobileDevice(), [])

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

  // 点击正文中的图片时打开图片查看器（收集正文全部图片，支持前后切换）。
  function handleContentClick(e) {
    const container = contentRef.current
    if (!container) return
    const img = e.target instanceof Element ? e.target.closest('img') : null
    if (!img || !container.contains(img)) return

    const images = Array.from(container.querySelectorAll('img'))
      .map((el) => ({ src: el.currentSrc || el.src || '', alt: el.alt || '' }))
      .filter((item) => item.src)

    if (images.length === 0) return

    const src = img.currentSrc || img.src || ''
    let index = images.findIndex((item) => item.src === src)
    if (index < 0) index = 0

    e.preventDefault()
    setViewer({ index, images })
  }

  const currentImage = viewer ? viewer.images[viewer.index] : null

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
              ref={contentRef}
              className="entry-content"
              onClick={handleContentClick}
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

      {viewer && currentImage ? (
        isMobile ? (
          <PicViewerMobileDialog
            open
            onOpenChange={(open) => {
              if (!open) setViewer(null)
            }}
            src={currentImage.src}
            alt={currentImage.alt}
            filePath={currentImage.src}
            hasPrev={viewer.index > 0}
            hasNext={viewer.index < viewer.images.length - 1}
            onPrev={() => setViewer((v) => (v ? { ...v, index: v.index - 1 } : v))}
            onNext={() => setViewer((v) => (v ? { ...v, index: v.index + 1 } : v))}
          />
        ) : (
          <PicViewerDialog
            open
            onOpenChange={(open) => {
              if (!open) setViewer(null)
            }}
            src={currentImage.src}
            alt={currentImage.alt}
            filePath={currentImage.src}
            hasPrev={viewer.index > 0}
            hasNext={viewer.index < viewer.images.length - 1}
            onPrev={() => setViewer((v) => (v ? { ...v, index: v.index - 1 } : v))}
            onNext={() => setViewer((v) => (v ? { ...v, index: v.index + 1 } : v))}
          />
        )
      ) : null}
    </article>
  )
}
