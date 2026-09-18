import { useEffect, useState } from 'react'
import { api } from '../api'
import EntryRow from './EntryRow'
import { Button } from './ui/button'

const PAGE_SIZE = 20

// ReadLater 是「稍后再阅」页：展示标记为稍后再阅的条目，可一键移除。
export default function ReadLater() {
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
    api
      .listReadLater({ page, pageSize: PAGE_SIZE })
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
  }, [page])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 取消稍后再阅后立即从当前列表移除
  function onEntryChanged(updated) {
    if (!updated.read_later) {
      setEntries((list) => list.filter((x) => x.id !== updated.id))
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">稍后再阅</h1>
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
          <p className="text-lg">暂无稍后再阅</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            在阅读列表或详情页点击「稍后再阅」收藏条目。
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
