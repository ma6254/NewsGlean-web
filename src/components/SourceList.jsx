import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmtRelativeTime, fmtTime } from '../util'
import SourceForm from './SourceForm'

// SourceList 是渠道管理页：列表 + 新增/编辑表单 + 启停/删除。
export default function SourceList() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await api.listSources()
      setSources(r.items || [])
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(payload) {
    setBusy(true)
    try {
      await api.createSource(payload)
      setNotice('渠道已添加')
      setAdding(false)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdate(id, payload) {
    setBusy(true)
    try {
      await api.updateSource(id, payload)
      setNotice('渠道已更新')
      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleToggle(s) {
    try {
      await api.updateSource(s.id, {
        name: s.name,
        type: s.type,
        config: s.config,
        interval: s.interval,
        enabled: !s.enabled,
      })
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(s) {
    if (!window.confirm(`确定删除渠道「${s.name}」？`)) return
    try {
      await api.deleteSource(s.id)
      setNotice('渠道已删除')
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  const btnCls =
    'rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">渠道</h1>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true)
              setEditing(null)
            }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 添加渠道
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {notice}
        </div>
      )}

      {(adding || editing) && (
        <div className="mb-6">
          <SourceForm
            initial={editing}
            busy={busy}
            onSubmit={(payload) =>
              editing ? handleUpdate(editing.id, payload) : handleCreate(payload)
            }
            onCancel={() => {
              setAdding(false)
              setEditing(null)
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400">加载中…</div>
      ) : sources.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          还没有渠道，点「+ 添加渠道」开始。
        </div>
      ) : (
        <ul className="space-y-3">
          {sources.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{s.name}</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {s.type}
                </span>
                {!s.enabled && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    已停用
                  </span>
                )}
                {s.fail_count > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                    失败 {s.fail_count}
                  </span>
                )}
              </div>

              {s.config?.url && (
                <div className="mt-1 break-all text-xs text-slate-500">
                  {s.config.url}
                </div>
              )}
              <div className="mt-1 text-xs text-slate-400">
                每 {s.interval}s 刷新 · 创建于 {fmtTime(s.created_at)}
                {s.last_entry_at
                  ? ` · 最后更新 ${fmtRelativeTime(s.last_entry_at)}`
                  : ' · 暂无内容'}
              </div>
              {s.last_error && (
                <div className="mt-1 text-xs text-red-600">
                  最近错误：{s.last_error}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setEditing(s)
                    setAdding(false)
                  }}
                  className={btnCls}
                >
                  编辑
                </button>
                <button onClick={() => handleToggle(s)} className={btnCls}>
                  {s.enabled ? '停用' : '启用'}
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
