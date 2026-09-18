import { useState } from 'react'
import { api } from '../api'

// Layout 是全局框架：顶栏导航 + 全局刷新 + 提示条。
export default function Layout({ children }) {
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
    } catch (e) {
      setNotice({ kind: 'err', text: e.message })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <a href="#/entries" className="text-lg font-bold tracking-tight">
            📰 NewsGlean
          </a>
          <nav className="flex items-center gap-3">
            <a
              href="#/entries"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              阅读
            </a>
            <a
              href="#/sources"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              渠道
            </a>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? '刷新中…' : '立即刷新'}
            </button>
          </nav>
        </div>
      </header>

      {notice && (
        <div className="mx-auto max-w-4xl px-4 pt-3">
          <div
            className={
              'rounded-md border px-4 py-2 text-sm ' +
              (notice.kind === 'ok'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700')
            }
          >
            {notice.text}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}
