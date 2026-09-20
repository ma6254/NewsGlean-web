import { useEffect, useState } from 'react'
import { api } from '../../services'
import EntryRow from '../../components/EntryRow'
import { Button } from '../../components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import type { Entry, Source } from '../../types'
import { PAGE_SIZE, REFRESH_EVENT } from '../../constants'
import './index.css'

// EntryList 是阅读页（收件箱）：未归档条目，支持按渠道与已读状态过滤、分页。
export default function EntryList() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sourceId, setSourceId] = useState('')
  const [readState, setReadState] = useState<'all' | 'unread' | 'read'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [highlightIds, setHighlightIds] = useState<Set<number>>(new Set())
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    api
      .listSources()
      .then((r) => setSources(r.items || []))
      .catch(() => {})
  }, [])

  // 监听全局刷新事件：有新增时回到第一页、重新拉取并高亮新条目。
  useEffect(() => {
    function onRefreshed(e: Event) {
      const detail = (e as CustomEvent<{ insertedIds?: number[] }>).detail
      const ids = detail?.insertedIds || []
      if (ids.length === 0) return
      setHighlightIds(new Set(ids))
      setPage(1)
      setRefreshTick((t) => t + 1)
    }
    window.addEventListener(REFRESH_EVENT, onRefreshed)
    return () => window.removeEventListener(REFRESH_EVENT, onRefreshed)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const params: {
      page: number
      pageSize: number
      sourceId?: string
      archive: boolean
      read?: boolean
    } = {
      page,
      pageSize: PAGE_SIZE,
      sourceId: sourceId || undefined,
      archive: false, // 收件箱：排除已归档
    }
    if (readState === 'unread') params.read = false
    else if (readState === 'read') params.read = true
    api
      .listEntries(params)
      .then((r) => {
        if (cancelled) return
        setEntries(r.items || [])
        setTotal(r.total || 0)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, sourceId, readState, refreshTick])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 供 SelectValue 展示已选渠道名（值 → 显示名）
  const sourceItems: Record<string, string> = { all: '全部渠道' }
  for (const s of sources) sourceItems[String(s.id)] = s.name
  const readItems: Record<string, string> = { all: '全部', unread: '未读', read: '已读' }

  // 条目状态变化后：归档从收件箱移除；未读/已读筛选下，不再匹配的条目也移除。
  function onEntryChanged(updated: Entry) {
    let remove = Boolean(updated.archive)
    if (!remove) {
      if (readState === 'unread') remove = Boolean(updated.read)
      else if (readState === 'read') remove = !updated.read
    }
    if (remove) {
      setEntries((list) => list.filter((x) => x.id !== updated.id))
      setTotal((t) => Math.max(0, t - 1))
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">阅读</h1>
        <div className="flex items-center gap-3 text-sm">
          <Select
            value={readState}
            onValueChange={(v) => {
              if (v == null) return
              setReadState(v)
              setPage(1)
              setHighlightIds(new Set<number>())
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="全部">
                {(v) => (v ? readItems[v] ?? v : '全部')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="unread">未读</SelectItem>
              <SelectItem value="read">已读</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sourceId || 'all'}
            onValueChange={(v) => {
              if (v == null) return
              setSourceId(v === 'all' ? '' : v)
              setPage(1)
              setHighlightIds(new Set<number>())
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="全部渠道">
                {(v) => (v ? sourceItems[v] ?? v : '全部渠道')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部渠道</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">共 {total} 条</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">加载中…</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg">还没有内容</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            去「渠道」页添加一个 feed 源，然后点「立即刷新」。
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              sources={sources}
              onChanged={onEntryChanged}
              highlighted={highlightIds.has(e.id)}
            />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              setPage(page - 1)
              setHighlightIds(new Set<number>())
            }}
          >
            上一页
          </Button>
          <span className="text-muted-foreground">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => {
              setPage(page + 1)
              setHighlightIds(new Set<number>())
            }}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
