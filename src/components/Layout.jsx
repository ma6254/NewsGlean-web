import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { api, subscribeRefresh } from '../api'
import { Button } from './ui/button'

// Layout 是全局框架：顶栏导航 + 全局刷新 + 实时进度条；子路由经 <Outlet /> 渲染。
export default function Layout() {
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState(null)
  const [inflight, setInflight] = useState([])
  // 同步记录「手动刷新中」，供 SSE 回调判断（避免闭包读到过期的 refreshing）
  const refreshingRef = useRef(false)

  // 订阅采集进度 SSE：实时显示正在刷新的渠道；后台（定时）刷新有新内容时也通知阅读页高亮。
  useEffect(() => {
    const es = subscribeRefresh((ev) => {
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
            new CustomEvent('newsglean:refreshed', {
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
          new CustomEvent('newsglean:refreshed', {
            detail: { insertedIds: r.inserted_ids || [] },
          })
        )
      }
    } catch (e) {
      setNotice({ kind: 'err', text: e.message })
    } finally {
      refreshingRef.current = false
      setRefreshing(false)
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
              to="/read-later"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              稍后再阅
            </Link>
            <Link
              to="/sources"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              渠道
            </Link>
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
