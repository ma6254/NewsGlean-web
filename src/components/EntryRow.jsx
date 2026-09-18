import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { fmtTime, stripHtml } from '../util'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

// EntryRow 是单条条目的列表行：标题、来源、摘要 + 「稍后再阅」切换按钮。
// onChanged 在标记状态变化后回调（传入更新后的条目），供列表同步/移除。
// highlighted 为 true 时给新入库条目一个高亮底色（刷新后自动标记）。
export default function EntryRow({ entry, sources, onChanged, highlighted }) {
  const [readLater, setReadLater] = useState(Boolean(entry.read_later))
  const [busy, setBusy] = useState(false)

  async function toggleReadLater() {
    if (busy) return
    setBusy(true)
    try {
      const updated = await api.setReadLater(entry.id, !readLater)
      setReadLater(Boolean(updated.read_later))
      if (onChanged) onChanged(updated)
    } catch (e) {
      console.error('toggle read later failed:', e)
    } finally {
      setBusy(false)
    }
  }

  const name = sourceName(sources, entry.source_id)

  return (
    <li
      className={
        'flex items-start justify-between gap-3 rounded-lg border p-4 transition ' +
        (highlighted
          ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
          : 'border-border bg-card hover:border-ring/40')
      }
    >
      <div className="min-w-0 flex-1">
        <Link
          to={`/entries/${entry.id}`}
          className="text-base font-semibold text-foreground hover:text-primary"
        >
          {entry.title || '(无标题)'}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {highlighted && <Badge variant="secondary">新增</Badge>}
          {name && <Badge variant="outline">{name}</Badge>}
          {entry.author && <span>{entry.author}</span>}
          <time>{fmtTime(entry.published_at)}</time>
        </div>
        {entry.summary && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {stripHtml(entry.summary)}
          </p>
        )}
      </div>
      <Button
        variant={readLater ? 'secondary' : 'outline'}
        size="sm"
        onClick={toggleReadLater}
        disabled={busy}
        title={readLater ? '取消稍后再阅' : '加入稍后再阅'}
      >
        {readLater ? '已收稍后' : '稍后再阅'}
      </Button>
    </li>
  )
}

function sourceName(sources, id) {
  const s = sources.find((x) => x.id === id)
  return s ? s.name : ''
}
