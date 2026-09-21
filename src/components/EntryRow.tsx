import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services'
import { fmtTime, stripHtml } from '../utils'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import Highlight from './Highlight'
import type { Entry, Source } from '../types'

interface EntryRowProps {
  entry: Entry
  sources: Source[]
  onChanged?: (updated: Entry) => void
  highlighted?: boolean
  keyword?: string
}

// EntryRow 是单条条目的列表行：标题、来源、摘要 + 四个阅读状态切换按钮（已读/收藏/归档/稍后再阅）。
// onChanged 在任一状态变化后回调（传入更新后的条目），供列表同步/移除。
// highlighted 为 true 时给新入库条目一个高亮底色（刷新后自动标记）。
// keyword 非空时，标题/作者/摘要中命中关键词的片段用 <mark> 高亮（搜索结果用）。
export default function EntryRow({ entry, sources, onChanged, highlighted, keyword }: EntryRowProps) {
  const [read, setRead] = useState(Boolean(entry.read))
  const [favorite, setFavorite] = useState(Boolean(entry.favorite))
  const [archive, setArchive] = useState(Boolean(entry.archive))
  const [readLater, setReadLater] = useState(Boolean(entry.read_later))
  const [busy, setBusy] = useState(false)

  // toggle 封装一次状态切换：调用 API、更新本地状态并回调父组件。
  // fieldKey 是更新后 DTO 上对应状态的字段名（read / favorite / archive / read_later）。
  async function toggle(
    apiCall: (id: number, value: boolean) => Promise<any>,
    setter: (value: boolean) => void,
    fieldKey: 'read' | 'favorite' | 'archive' | 'read_later',
    next: boolean,
  ) {
    if (busy) return
    setBusy(true)
    try {
      const updated = await apiCall(entry.id, next)
      setter(Boolean(updated[fieldKey]))
      if (onChanged) onChanged(updated)
    } catch (e) {
      console.error('toggle state failed:', e)
    } finally {
      setBusy(false)
    }
  }

  const name = sourceName(sources, entry.source_id)
  const cover = entry.extra?.cover

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
        <div className="flex gap-3">
          {cover && (
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-16 w-28 shrink-0 rounded-md border border-border object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <Link
              to={`/entries/${entry.id}`}
              className={
                (read
                  ? 'text-base font-medium text-muted-foreground'
                  : 'text-base font-semibold text-foreground') +
                ' hover:text-primary'
              }
            >
              <Highlight text={entry.title || '(无标题)'} keyword={keyword} />
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {highlighted && <Badge variant="secondary">新增</Badge>}
              {name && <Badge variant="outline">{name}</Badge>}
              {entry.author && (
                <span>
                  <Highlight text={entry.author} keyword={keyword} />
                </span>
              )}
              <time>{fmtTime(entry.published_at)}</time>
            </div>
            {entry.summary && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                <Highlight text={stripHtml(entry.summary)} keyword={keyword} />
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex flex-wrap justify-end gap-1">
          <Button
            variant={read ? 'secondary' : 'outline'}
            size="xs"
            onClick={() => toggle(api.setRead, setRead, 'read', !read)}
            disabled={busy}
            title={read ? '标记为未读' : '标记为已读'}
          >
            {read ? '已读' : '未读'}
          </Button>
          <Button
            variant={favorite ? 'secondary' : 'outline'}
            size="xs"
            onClick={() => toggle(api.setFavorite, setFavorite, 'favorite', !favorite)}
            disabled={busy}
            title={favorite ? '取消收藏' : '收藏'}
          >
            {favorite ? '已收藏' : '收藏'}
          </Button>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <Button
            variant={archive ? 'secondary' : 'outline'}
            size="xs"
            onClick={() => toggle(api.setArchive, setArchive, 'archive', !archive)}
            disabled={busy}
            title={archive ? '取消归档' : '归档'}
          >
            {archive ? '已归档' : '归档'}
          </Button>
          <Button
            variant={readLater ? 'secondary' : 'outline'}
            size="xs"
            onClick={() => toggle(api.setReadLater, setReadLater, 'read_later', !readLater)}
            disabled={busy}
            title={readLater ? '取消稍后再阅' : '加入稍后再阅'}
          >
            {readLater ? '已收稍后' : '稍后再阅'}
          </Button>
        </div>
      </div>
    </li>
  )
}

function sourceName(sources: Source[], id: number): string {
  const s = sources.find((x) => x.id === id)
  return s ? s.name : ''
}
