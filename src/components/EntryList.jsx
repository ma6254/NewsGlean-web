import { useEffect, useState } from 'react'
import { api } from '../api'
import EntryRow from './EntryRow'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

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
  const [highlightIds, setHighlightIds] = useState(new Set())
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    api
      .listSources()
      .then((r) => setSources(r.items || []))
      .catch(() => {})
  }, [])

  // 监听全局刷新事件：有新增时回到第一页、重新拉取并高亮新条目。
  useEffect(() => {
    function onRefreshed(e) {
      const ids = e.detail?.insertedIds || []
      if (ids.length === 0) return
      setHighlightIds(new Set(ids))
      setPage(1)
      setRefreshTick((t) => t + 1)
    }
    window.addEventListener('newsglean:refreshed', onRefreshed)
    return () => window.removeEventListener('newsglean:refreshed', onRefreshed)
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
  }, [page, sourceId, refreshTick])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 供 SelectValue 展示已选渠道名（值 → 显示名）
  const sourceItems = {
    all: '全部渠道',
    ...Object.fromEntries(sources.map((s) => [String(s.id), s.name])),
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">阅读</h1>
        <div className="flex items-center gap-3 text-sm">
          <Select
            value={sourceId || 'all'}
            onValueChange={(v) => {
              setSourceId(v === 'all' ? '' : v)
              setPage(1)
              setHighlightIds(new Set())
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
              setHighlightIds(new Set())
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
              setHighlightIds(new Set())
            }}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
