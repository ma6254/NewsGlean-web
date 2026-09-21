import { useEffect, useRef, useState } from 'react'
import { api } from '../services'
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
import type { Source, SourcePayload } from '../types'
import { DEFAULT_SOURCE_INTERVAL } from '../constants'
import BiliEnvPanel from './BiliEnvPanel'

// 渠道类型与显示名映射。新增渠道类型时在此扩展。
const TYPES = [
  { value: 'feed', label: 'RSS / Atom / JSON Feed' },
  { value: 'webpage', label: '网页列表页（CSS 选择器）' },
  { value: 'bilibili', label: 'B 站个人数据（历史 / 收藏夹）' },
]
const TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label] as [string, string]),
)

// bilibili 渠道的采集模式。
const BILI_MODES = [
  { value: 'history', label: '观看历史' },
  { value: 'favorites', label: '收藏夹' },
]
const BILI_MODE_ITEMS: Record<string, string> = Object.fromEntries(
  BILI_MODES.map((m) => [m.value, m.label] as [string, string]),
)

// validateURL 校验地址合法性：非空、可解析、且协议为 http/https。
// 返回错误信息；合法时返回空字符串。
function validateURL(value: string): string {
  const v = (value || '').trim()
  if (!v) return '请输入地址'
  let u: URL
  try {
    u = new URL(v)
  } catch {
    return '地址格式不正确，请输入完整 URL'
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return '地址必须以 http:// 或 https:// 开头'
  }
  if (!u.hostname) return '地址缺少主机名'
  return ''
}

// validateSelector 校验 CSS 选择器非空；语法合法性由后端 Validate 兜底。
function validateSelector(value: string): string {
  if (!(value || '').trim()) return '请输入条目选择器'
  return ''
}

interface SourceFormProps {
  initial: Source | null
  busy: boolean
  onSubmit: (payload: SourcePayload) => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}

interface FormState {
  name: string
  type: string
  url: string
  selector: string
  fullText: boolean
  mode: string
  favId: string
  biliPath: string
  fetchDetail: boolean
  interval: string | number
  enabled: boolean
}

// SourceForm 是渠道的新增/编辑表单（无外层卡片，标题由 Dialog 提供），由父组件决定 create 或 update。
// onDirtyChange 在表单是否被编辑过（dirty）变化时回调，供父组件在关闭前做二次确认。
export default function SourceForm({
  initial,
  busy,
  onSubmit,
  onCancel,
  onDirtyChange,
}: SourceFormProps) {
  const [form, setForm] = useState<FormState>({
    name: initial?.name || '',
    type: initial?.type || 'feed',
    url: initial?.config?.url || '',
    selector: initial?.config?.selector || '',
    fullText: initial?.config?.full_text || false,
    mode: initial?.config?.mode || 'history',
    favId: initial?.config?.fav_id || '',
    biliPath: initial?.config?.bili_path || '',
    fetchDetail: initial ? (initial.config?.fetch_detail ?? false) : true,
    interval: initial?.interval || DEFAULT_SOURCE_INTERVAL,
    enabled: initial ? initial.enabled : true,
  })
  const [dirty, setDirty] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [urlValid, setUrlValid] = useState(false)
  const [selectorError, setSelectorError] = useState('')
  const [favIdError, setFavIdError] = useState('')
  const [favFolders, setFavFolders] = useState<
    { id: number; title: string; media_count: number }[]
  >([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [foldersError, setFoldersError] = useState('')
  const [probing, setProbing] = useState(false)
  const [probeError, setProbeError] = useState('')
  const urlDebounceRef = useRef<number | null>(null)

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  // 组件卸载时清理未触发的懒校验定时器，避免对已卸载组件 setState
  useEffect(() => {
    return () => window.clearTimeout(urlDebounceRef.current as number)
  }, [])

  function set(patch: Partial<FormState>) {
    setDirty(true)
    setForm((f) => ({ ...f, ...patch }))
  }

  // applyUrlValidation 同步 urlError 与 urlValid：地址非空且校验通过才算合法。
  function applyUrlValidation(value: string) {
    const err = validateURL(value)
    setUrlError(err)
    setUrlValid(value.trim() !== '' && err === '')
  }

  function handleUrlChange(value: string) {
    set({ url: value })
    setProbeError('')
    // 懒校验：停止输入 500ms 后再校验，避免每敲一个字就打扰
    window.clearTimeout(urlDebounceRef.current as number)
    urlDebounceRef.current = window.setTimeout(() => {
      applyUrlValidation(value)
    }, 500)
  }

  function handleUrlBlur() {
    window.clearTimeout(urlDebounceRef.current as number)
    applyUrlValidation(form.url)
  }

  // buildConfig 按渠道类型组装配置：feed 只有 url；webpage 带 selector/full_text；bilibili 带 mode/fav_id。
  function buildConfig() {
    if (form.type === 'webpage') {
      return {
        url: form.url.trim(),
        selector: form.selector.trim(),
        full_text: form.fullText,
      }
    }
    if (form.type === 'bilibili') {
      return {
        mode: form.mode,
        fav_id: form.favId.trim(),
        bili_path: form.biliPath.trim(),
        fetch_detail: form.fetchDetail,
      }
    }
    return { url: form.url.trim() }
  }

  // handleAutoFetch 探测渠道标题并回填显示名（feed 取 feed 标题，webpage 取页面 <title>）。
  async function handleAutoFetch() {
    setProbing(true)
    setProbeError('')
    try {
      const info = await api.probeSource({
        type: form.type,
        config: buildConfig(),
      })
      if (info && info.title) {
        set({ name: info.title })
      } else {
        setProbeError('未获取到标题')
      }
    } catch (e) {
      setProbeError((e as Error).message)
    } finally {
      setProbing(false)
    }
  }

  // loadFavFolders 拉取收藏夹列表填充下拉。
  async function loadFavFolders() {
    setLoadingFolders(true)
    setFoldersError('')
    try {
      const res = await api.listBiliFavorites(form.biliPath)
      const items = res.items || []
      setFavFolders(items)
      if (!items.length) setFoldersError('未获取到收藏夹（请确认已登录）')
    } catch (e) {
      setFoldersError((e as Error).message)
    } finally {
      setLoadingFolders(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    window.clearTimeout(urlDebounceRef.current as number)
    if (form.type !== 'bilibili') {
      const err = validateURL(form.url)
      setUrlError(err)
      if (err) return
    }
    if (form.type === 'webpage') {
      const selErr = validateSelector(form.selector)
      setSelectorError(selErr)
      if (selErr) return
    }
    if (form.type === 'bilibili' && form.mode === 'favorites' && !form.favId.trim()) {
      setFavIdError('请输入收藏夹 ID')
      return
    }
    onSubmit({
      name: form.name.trim(),
      type: form.type,
      config: buildConfig(),
      interval: Number(form.interval) || DEFAULT_SOURCE_INTERVAL,
      enabled: form.enabled,
    })
  }

  const folderLabel = (v?: string) => {
    if (!v) return '选择收藏夹'
    const f = favFolders.find((x) => String(x.id) === v)
    return f ? `${f.title}（${f.media_count} 个视频）` : `#${v}`
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
              onChange={(e) => set({ name: e.target.value })}
              placeholder="例如：阮一峰的网络日志"
              className="flex-1"
            />
            {!initial && (form.type === 'bilibili' || urlValid) && (
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
          <Select
            value={form.type}
            onValueChange={(v) => {
              if (v == null) return
              set({ type: v })
            }}
          >
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

        {form.type !== 'bilibili' && (
          <div className="grid gap-1.5">
            <Label htmlFor="source-url">
              {form.type === 'webpage' ? '列表页地址（URL）' : '订阅地址（feed URL）'}
            </Label>
            <Input
              id="source-url"
              type="text"
              inputMode="url"
              value={form.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder={
                form.type === 'webpage'
                  ? 'https://example.com/news'
                  : 'https://example.com/feed.xml'
              }
              aria-invalid={Boolean(urlError)}
            />
            {urlError && <span className="text-xs text-destructive">{urlError}</span>}
          </div>
        )}

        {form.type === 'webpage' && (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="source-selector">条目选择器（CSS）</Label>
              <Input
                id="source-selector"
                type="text"
                value={form.selector}
                onChange={(e) => {
                  set({ selector: e.target.value })
                  setSelectorError('')
                }}
                placeholder="div.article-list > a"
                aria-invalid={Boolean(selectorError)}
              />
              {selectorError && (
                <span className="text-xs text-destructive">{selectorError}</span>
              )}
            </div>
            <Label className="flex items-center gap-2">
              <Checkbox
                checked={form.fullText}
                onCheckedChange={(checked) => set({ fullText: checked })}
              />
              回源抓取正文（阶段 12 生效）
            </Label>
          </>
        )}

        {form.type === 'bilibili' && (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="source-bili-path">bilibili-cli 路径（可选）</Label>
              <Input
                id="source-bili-path"
                type="text"
                value={form.biliPath}
                onChange={(e) => set({ biliPath: e.target.value })}
                placeholder="留空自动探测，例如 ~/.local/bin/bili.exe"
              />
            </div>
            <BiliEnvPanel biliPath={form.biliPath} />
            <div className="grid gap-1.5">
              <Label>采集模式</Label>
              <Select
                value={form.mode}
                onValueChange={(v) => {
                  if (v == null) return
                  set({ mode: v, favId: '' })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(v) => BILI_MODE_ITEMS[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BILI_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Label className="flex items-center gap-2">
              <Checkbox
                checked={form.fetchDetail}
                onCheckedChange={(checked) => set({ fetchDetail: checked })}
              />
              回填视频详情（简介+封面，仅新条目，首次采集较慢）
            </Label>
            {form.mode === 'favorites' && (
              <>
                <div className="grid gap-1.5">
                  <Label>收藏夹</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={form.favId}
                      onValueChange={(v) => {
                        if (v == null) return
                        const f = favFolders.find((x) => String(x.id) === v)
                        set({ favId: v, name: form.name || f?.title || '' })
                        setFavIdError('')
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue>{(v) => folderLabel(v)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {favFolders.map((f) => (
                          <SelectItem key={String(f.id)} value={String(f.id)}>
                            {f.title}（{f.media_count} 个视频）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadFavFolders}
                      disabled={loadingFolders}
                    >
                      {loadingFolders ? '获取中…' : '获取列表'}
                    </Button>
                  </div>
                  {foldersError && (
                    <span className="text-xs text-destructive">{foldersError}</span>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="source-favid">收藏夹 ID（或手动输入）</Label>
                  <Input
                    id="source-favid"
                    type="text"
                    inputMode="numeric"
                    value={form.favId}
                    onChange={(e) => {
                      set({ favId: e.target.value })
                      setFavIdError('')
                    }}
                    placeholder="例如 72800232"
                    aria-invalid={Boolean(favIdError)}
                  />
                  {favIdError && (
                    <span className="text-xs text-destructive">{favIdError}</span>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="source-interval">刷新间隔（秒）</Label>
          <Input
            id="source-interval"
            type="number"
            min="60"
            value={form.interval}
            onChange={(e) => set({ interval: e.target.value })}
          />
        </div>

        <Label className="flex items-center gap-2">
          <Checkbox
            checked={form.enabled}
            onCheckedChange={(checked) => set({ enabled: checked })}
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
