import { useState } from 'react'

// 当前阶段只有 feed 渠道；后续渠道类型接入后在此扩展字段映射。
const TYPES = [{ value: 'feed', label: 'RSS / Atom / JSON Feed' }]

// SourceForm 是渠道的新增/编辑表单，由父组件决定 create 或 update。
export default function SourceForm({ initial, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || 'feed',
    url: initial?.config?.url || '',
    interval: initial?.interval || 1800,
    enabled: initial ? initial.enabled : true,
  })

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      name: form.name.trim(),
      type: form.type,
      config: { url: form.url.trim() },
      interval: Number(form.interval) || 1800,
      enabled: form.enabled,
    })
  }

  const inputCls =
    'rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="mb-4 text-base font-semibold">
        {initial ? '编辑渠道' : '添加渠道'}
      </h2>

      <div className="grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="text-slate-600">显示名</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="例如：阮一峰的网络日志"
            className={inputCls}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-slate-600">类型</span>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            className={inputCls}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {form.type === 'feed' && (
          <label className="grid gap-1 text-sm">
            <span className="text-slate-600">订阅地址（feed URL）</span>
            <input
              type="url"
              required
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://example.com/feed.xml"
              className={inputCls}
            />
          </label>
        )}

        <label className="grid gap-1 text-sm">
          <span className="text-slate-600">刷新间隔（秒）</span>
          <input
            type="number"
            min="60"
            value={form.interval}
            onChange={(e) => set('interval', e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          启用
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? '提交中…' : initial ? '保存' : '添加'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </button>
        </div>
      </div>
    </form>
  )
}
