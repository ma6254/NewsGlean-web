import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

// 当前阶段只有 feed 渠道；后续渠道类型接入后在此扩展字段映射。
const TYPES = [{ value: 'feed', label: 'RSS / Atom / JSON Feed' }]
const TYPE_ITEMS = Object.fromEntries(TYPES.map((t) => [t.value, t.label]))

// validateFeedUrl 校验订阅地址合法性：非空、可解析、且协议为 http/https。
// 返回错误信息；合法时返回空字符串。
function validateFeedUrl(value) {
  const v = (value || '').trim()
  if (!v) return '请输入订阅地址'
  let u
  try {
    u = new URL(v)
  } catch {
    return '订阅地址格式不正确，请输入完整 URL'
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return '订阅地址必须以 http:// 或 https:// 开头'
  }
  if (!u.hostname) return '订阅地址缺少主机名'
  return ''
}

// SourceForm 是渠道的新增/编辑表单（无外层卡片，标题由 Dialog 提供），由父组件决定 create 或 update。
// onDirtyChange 在表单是否被编辑过（dirty）变化时回调，供父组件在关闭前做二次确认。
export default function SourceForm({ initial, busy, onSubmit, onCancel, onDirtyChange }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || 'feed',
    url: initial?.config?.url || '',
    interval: initial?.interval || 1800,
    enabled: initial ? initial.enabled : true,
  })
  const [dirty, setDirty] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [urlValid, setUrlValid] = useState(false)
  const [probing, setProbing] = useState(false)
  const [probeError, setProbeError] = useState('')
  const urlDebounceRef = useRef(null)

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  // 组件卸载时清理未触发的懒校验定时器，避免对已卸载组件 setState
  useEffect(() => {
    return () => clearTimeout(urlDebounceRef.current)
  }, [])

  function set(key, value) {
    setDirty(true)
    setForm((f) => ({ ...f, [key]: value }))
  }

  // applyUrlValidation 同步 urlError 与 urlValid：地址非空且校验通过才算合法。
  function applyUrlValidation(value) {
    const err = validateFeedUrl(value)
    setUrlError(err)
    setUrlValid(value.trim() !== '' && err === '')
  }

  function handleUrlChange(value) {
    set('url', value)
    setProbeError('')
    // 懒校验：停止输入 500ms 后再校验，避免每敲一个字就打扰
    clearTimeout(urlDebounceRef.current)
    urlDebounceRef.current = setTimeout(() => {
      applyUrlValidation(value)
    }, 500)
  }

  function handleUrlBlur() {
    clearTimeout(urlDebounceRef.current)
    applyUrlValidation(form.url)
  }

  // handleAutoFetch 从订阅地址探测 feed 标题并回填显示名。
  async function handleAutoFetch() {
    setProbing(true)
    setProbeError('')
    try {
      const info = await api.probeSource({
        type: form.type,
        config: { url: form.url.trim() },
      })
      if (info && info.title) {
        set('name', info.title)
      } else {
        setProbeError('未获取到标题')
      }
    } catch (e) {
      setProbeError(e.message)
    } finally {
      setProbing(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    clearTimeout(urlDebounceRef.current)
    const err = validateFeedUrl(form.url)
    setUrlError(err)
    if (err) return
    onSubmit({
      name: form.name.trim(),
      type: form.type,
      config: { url: form.url.trim() },
      interval: Number(form.interval) || 1800,
      enabled: form.enabled,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="source-name">显示名</Label>
          <div className="flex items-center gap-2">
            <Input
              id="source-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="例如：阮一峰的网络日志"
              className="flex-1"
            />
            {!initial && urlValid && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoFetch}
                disabled={probing}
              >
                {probing ? '获取中…' : '自动获取'}
              </Button>
            )}
          </div>
          {probeError && (
            <span className="text-xs text-destructive">{probeError}</span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label>类型</Label>
          <Select value={form.type} onValueChange={(v) => set('type', v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v) => TYPE_ITEMS[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.type === 'feed' && (
          <div className="grid gap-1.5">
            <Label htmlFor="source-url">订阅地址（feed URL）</Label>
            <Input
              id="source-url"
              type="text"
              inputMode="url"
              value={form.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://example.com/feed.xml"
              aria-invalid={Boolean(urlError)}
            />
            {urlError && <span className="text-xs text-destructive">{urlError}</span>}
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="source-interval">刷新间隔（秒）</Label>
          <Input
            id="source-interval"
            type="number"
            min="60"
            value={form.interval}
            onChange={(e) => set('interval', e.target.value)}
          />
        </div>

        <Label className="flex items-center gap-2">
          <Checkbox
            checked={form.enabled}
            onCheckedChange={(checked) => set('enabled', checked)}
          />
          启用
        </Label>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? '提交中…' : initial ? '保存' : '添加'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
        </div>
      </div>
    </form>
  )
}
