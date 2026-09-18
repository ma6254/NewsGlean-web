import { useEffect, useState } from 'react'
import { api } from '../api'
import EntryRow from './EntryRow'
import { Button } from './ui/button'

const PAGE_SIZE = 20

// StateList 是按阅读状态筛选的列表页（收藏 / 归档 / 稍后再阅）。
// loadKind 决定取数方式：'read-later' 走专用端点，其余走 listEntries 的状态过滤。
// removeField 决定某条目状态变更后是否从当前列表移除（对应字段为 false 时移除）。
export default function StateList({ title, emptyTitle, emptyHint, loadKind, removeField }) {
  const [entries, setEntries] = useState([])
  const [sources, setSources] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
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
    const fetcher =
      loadKind === 'read-later'
        ? (params) => api.listReadLater(params)
        : (params) => api.listEntries({ ...params, [loadKind]: true })
    fetcher({ page, pageSize: PAGE_SIZE })
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
  }, [page, loadKind])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 取消当前页面对应状态后立即从列表移除
  function onEntryChanged(updated) {
    if (!updated[removeField]) {
      setEntries((list) => list.filter((x) => x.id !== updated.id))
      setTotal((t) => Math.max(0, t - 1))
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <span className="text-sm text-muted-foreground">共 {total} 条</span>
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
          <p className="text-lg">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground/70">{emptyHint}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              sources={sources}
              onChanged={onEntryChanged}
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
            onClick={() => setPage(page - 1)}
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
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
