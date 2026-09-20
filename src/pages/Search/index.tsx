import { useEffect, useState } from 'react'
import { api } from '../../services'
import EntryRow from '../../components/EntryRow'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import type { Entry, Source } from '../../types'
import { PAGE_SIZE } from '../../constants'

// Search 是搜索页：输入关键词，全文检索 title/summary/content/author（见后端 GET /api/search）。
// 结果复用 EntryRow，命中关键词高亮；点击标题经 EntryRow 内置 Link 跳详情（阶段 7 验收点）。
export default function Search() {
  const [keyword, setKeyword] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sourceId, setSourceId] = useState('')
  const [readState, setReadState] = useState<'all' | 'unread' | 'read'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listSources()
      .then((r) => setSources(r.items || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!submitted) return
    let cancelled = false
    setLoading(true)
    setError('')
    const params: {
      q: string
      page: number
      pageSize: number
      sourceId?: string
      read?: boolean
    } = {
      q: submitted,
      page,
      pageSize: PAGE_SIZE,
      sourceId: sourceId || undefined,
    }
    if (readState === 'unread') params.read = false
    else if (readState === 'read') params.read = true
    api
      .search(params)
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
  }, [submitted, page, sourceId, readState])

  function submit() {
    const kw = keyword.trim()
    if (!kw) {
      setError('请输入关键词')
      return
    }
    setSubmitted(kw)
    setPage(1)
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const sourceItems: Record<string, string> = { all: '全部渠道' }
  for (const s of sources) sourceItems[String(s.id)] = s.name
  const readItems: Record<string, string> = { all: '全部', unread: '未读', read: '已读' }

  // 与阅读页一致：已读筛选下，状态变更后不再匹配的条目即时移除。
  function onEntryChanged(updated: Entry) {
    let remove = false
    if (readState === 'unread') remove = Boolean(updated.read)
    else if (readState === 'read') remove = !updated.read
    if (remove) {
      setEntries((list) => list.filter((x) => x.id !== updated.id))
      setTotal((t) => Math.max(0, t - 1))
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="mb-3 text-xl font-semibold">搜索</h1>
        <div className="flex items-center gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            placeholder="搜索标题 / 摘要 / 正文 / 作者"
            className="flex-1"
          />
          <Button onClick={submit}>搜索</Button>
        </div>
      </div>

      {submitted && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            「{submitted}」共 {total} 条
          </span>
          <div className="flex items-center gap-3 text-sm">
            <Select
              value={readState}
              onValueChange={(v) => {
                if (v == null) return
                setReadState(v)
                setPage(1)
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
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!submitted ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg">输入关键词开始搜索</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            可命中标题、摘要、正文与作者，多个词按「同时包含」匹配。
          </p>
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-muted-foreground">搜索中…</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg">没有匹配结果</p>
          <p className="mt-1 text-sm text-muted-foreground/70">换个关键词试试。</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              sources={sources}
              keyword={submitted}
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
