import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services'
import type { EnvCheck } from '../types'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'

const INSTALL_CMDS = [
  'uv tool install bilibili-cli',
  '# 备选：pipx install bilibili-cli  /  pip install bilibili-cli',
]

// BiliEnvPanel 检测 bilibili-cli 环境并渲染三态：
// 未装 → 安装教程；已装未登录 → 扫码引导 + 手动输入表单；已登录 → 用户信息。
// biliPath 为可选的手动覆盖路径；仅在 mount 与「重新检测」时读取最新值，避免逐键重查。
export default function BiliEnvPanel({ biliPath }: { biliPath?: string }) {
  const biliPathRef = useRef(biliPath)
  biliPathRef.current = biliPath

  const [check, setCheck] = useState<EnvCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [login, setLogin] = useState({ sessdata: '', bili_jct: '', buvid3: '' })
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCheck(await api.checkEnv('bilibili', biliPathRef.current))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.bilibiliLogin(login)
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !check) {
    return <p className="text-sm text-muted-foreground">检测 bilibili-cli 环境中…</p>
  }

  if (!check) {
    return (
      <div className="space-y-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" variant="outline" onClick={refresh}>
          重新检测
        </Button>
      </div>
    )
  }

  // 未安装
  if (!check.ready) {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center gap-2">
          <Badge variant="destructive">未安装</Badge>
          <span className="text-sm font-medium">未检测到 bilibili-cli</span>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {(check.missing || []).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <div className="space-y-1">
          <Label className="text-xs">安装命令</Label>
          <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
            {INSTALL_CMDS.join('\n')}
          </pre>
          <p className="text-xs text-muted-foreground">
            装完确保 ~/.local/bin 在 PATH，或在此渠道配置里填 bili_path。
          </p>
        </div>
        <Button type="button" variant="outline" onClick={refresh}>
          重新检测
        </Button>
      </div>
    )
  }

  // 已安装
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">已安装</Badge>
        {check.version && (
          <span className="text-xs text-muted-foreground">v{check.version}</span>
        )}
        {check.path && (
          <span className="truncate text-xs text-muted-foreground">{check.path}</span>
        )}
      </div>

      {check.authed && check.user ? (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {(check.user.name || 'B').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {check.user.name}（UID {check.user.id}）
            </p>
            <p className="truncate text-xs text-muted-foreground">
              LV{check.user.level} · 粉丝 {check.user.follower} · 关注 {check.user.following}
              {check.user.sign ? ` · ${check.user.sign}` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="ml-auto shrink-0"
            onClick={refresh}
          >
            重新检测
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">未登录，以下两种方式任选其一：</p>
          <p className="text-xs text-muted-foreground">
            ① 扫码：在终端运行 <code className="rounded bg-muted px-1">bili login</code>
            ，扫码后点「重新检测」。
          </p>
          <form onSubmit={submitLogin} className="space-y-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bili-sessdata">SESSDATA</Label>
              <Input
                id="bili-sessdata"
                type="password"
                value={login.sessdata}
                onChange={(e) => setLogin({ ...login, sessdata: e.target.value })}
                placeholder="② 或手动粘贴 SESSDATA"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bili-jct">bili_jct</Label>
              <Input
                id="bili-jct"
                type="password"
                value={login.bili_jct}
                onChange={(e) => setLogin({ ...login, bili_jct: e.target.value })}
                placeholder="粘贴 bili_jct"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bili-buvid3">buvid3（可选，防 412）</Label>
              <Input
                id="bili-buvid3"
                type="text"
                value={login.buvid3}
                onChange={(e) => setLogin({ ...login, buvid3: e.target.value })}
                placeholder="可选"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={submitting || !login.sessdata || !login.bili_jct}
              >
                {submitting ? '登录中…' : '手动登录'}
              </Button>
              <Button type="button" variant="outline" onClick={refresh}>
                重新检测
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
