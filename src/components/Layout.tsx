import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { api, subscribeRefresh } from '../services'
import { REFRESH_EVENT } from '../constants'
import { Button } from './ui/button'

interface InflightSource {
  id: number
  name: string
}

interface Notice {
  kind: 'ok' | 'err'
  text: string
}

// 导出格式选项（对应 GET /api/export/download?format=...）
const EXPORT_FORMATS = [
  { value: 'markdown', label: 'Markdown（.zip）' },
  { value: 'json', label: 'JSON' },
  { value: 'epub', label: 'EPUB' },
]

// Layout 是全局框架：顶栏导航 + 全局刷新 + 实时进度条；子路由经 <Outlet /> 渲染。
export default function Layout() {
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [inflight, setInflight] = useState<InflightSource[]>([])
  // 同步记录「手动刷新中」，供 SSE 回调判断（避免闭包读到过期的 refreshing）
  const refreshingRef = useRef(false)
  // 导出下拉：展开状态、导出中标记、下拉容器引用（点击外部收起）
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // 订阅采集进度 SSE：实时显示正在刷新的渠道；后台（定时）刷新有新内容时也通知阅读页高亮。
  useEffect(() => {
    const es = subscribeRefresh((ev: any) => {
      if (ev.type === 'source_started') {
        setInflight((prev) =>
          prev.some((s) => s.id === ev.source_id)
            ? prev
            : [
                ...prev,
                { id: ev.source_id, name: ev.source_name || `渠道 ${ev.source_id}` },
              ]
        )
      } else if (ev.type === 'source_done' || ev.type === 'source_failed') {
        setInflight((prev) => prev.filter((s) => s.id !== ev.source_id))
        // 后台刷新带来的新内容也高亮；手动刷新的高亮由 onRefresh 的响应统一驱动，避免重复。
        if (
          ev.type === 'source_done' &&
          ev.inserted_ids &&
          ev.inserted_ids.length > 0 &&
          !refreshingRef.current
        ) {
          window.dispatchEvent(
            new CustomEvent(REFRESH_EVENT, {
              detail: { insertedIds: ev.inserted_ids },
            })
          )
        }
      }
    })
    return () => es.close()
  }, [])

  async function onRefresh() {
    refreshingRef.current = true
    setRefreshing(true)
    try {
      const r = await api.refresh()
      setNotice({
        kind: 'ok',
        text: `刷新完成：新增 ${r.inserted}，跳过 ${r.skipped}`,
      })
      // 手动刷新：有新增时通知阅读页自动刷新并高亮新条目
      if (r.inserted > 0) {
        window.dispatchEvent(
          new CustomEvent(REFRESH_EVENT, {
            detail: { insertedIds: r.inserted_ids || [] },
          })
        )
      }
    } catch (e) {
      setNotice({ kind: 'err', text: (e as Error).message })
    } finally {
      refreshingRef.current = false
      setRefreshing(false)
    }
  }

  // 点击导出下拉外部时收起
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // onExport 触发后端导出并下载返回的文件流（方案 B：浏览器直接拿到文件）。
  async function onExport(format: string) {
    setExportOpen(false)
    setExporting(true)
    try {
      const res = await fetch(`/api/export/download?format=${format}`)
      if (!res.ok) {
        let message = `导出失败（HTTP ${res.status}）`
        try {
          const data = await res.json()
          if (data && data.error) message = data.error
        } catch {
          // 非 JSON 错误响应，保留默认信息
        }
        throw new Error(message)
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') || ''
      const m = cd.match(/filename="?([^";]+)"?/)
      const filename = m ? m[1] : `news-glean-${format}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setNotice({ kind: 'ok', text: `已导出 ${filename}` })
    } catch (e) {
      setNotice({ kind: 'err', text: (e as Error).message })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-bold tracking-tight">
            📰 NewsGlean
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/entries"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              阅读
            </Link>
            <Link
              to="/search"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              搜索
            </Link>
            <Link
              to="/read-later"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              稍后再阅
            </Link>
            <Link
              to="/favorites"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              收藏
            </Link>
            <Link
              to="/archive"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              归档
            </Link>
            <Link
              to="/sources"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              渠道
            </Link>
            <Link
              to="/system-info"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              系统信息
            </Link>
            <div className="relative" ref={exportRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen((v) => !v)}
                disabled={exporting}
                aria-expanded={exportOpen}
              >
                {exporting ? '导出中…' : '导出'}
              </Button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border bg-popover p-1 shadow-md">
                  {EXPORT_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => onExport(f.value)}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={onRefresh} disabled={refreshing} size="sm">
              {refreshing ? '刷新中…' : '立即刷新'}
            </Button>
          </nav>
        </div>
      </header>

      {inflight.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 pt-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
            ⟳ 正在刷新：{inflight.map((s) => s.name).join('、')}
          </div>
        </div>
      )}

      {notice && (
        <div className="mx-auto max-w-4xl px-4 pt-3">
          <div
            className={
              'rounded-lg border px-4 py-2 text-sm ' +
              (notice.kind === 'ok'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-destructive/20 bg-destructive/10 text-destructive')
            }
          >
            {notice.text}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
