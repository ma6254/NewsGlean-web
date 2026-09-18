import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { api } from '../api'
import { Button } from './ui/button'

// Layout 是全局框架：顶栏导航 + 全局刷新 + 提示条；子路由经 <Outlet /> 渲染。
export default function Layout() {
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState(null)

  async function onRefresh() {
    setRefreshing(true)
    try {
      const r = await api.refresh()
      setNotice({
        kind: 'ok',
        text: `刷新完成：新增 ${r.inserted}，跳过 ${r.skipped}`,
      })
      // 有新增时通知阅读页自动刷新并高亮新条目
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
