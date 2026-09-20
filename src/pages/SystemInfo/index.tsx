import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../services'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { AUTO_REFRESH_SECONDS } from '../../constants'
import './index.css'

// fmtDateTime 把 RFC3339 时间格式化为本地可读时间；无效时原样返回。
function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('zh-CN', { hour12: false })
}

// disp 统一处理空值展示，可选追加单位后缀。
function disp(value: any, suffix = ''): string {
  if (value === null || value === undefined || value === '') return '-'
  return `${value}${suffix}`
}

// Row 是「标签 + 值」的键值行。
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-foreground/5 py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{children}</span>
    </div>
  )
}

// StatCard 是顶部概览指标卡。
function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

// SystemInfo 是系统信息页：区分展示操作系统信息与后台系统信息，
// 分别按基本信息、运行状态归类；每 10 秒自动刷新，支持手动刷新。
export default function SystemInfo() {
  const [sysInfo, setSysInfo] = useState<any>(null)
  const [sysState, setSysState] = useState<any>(null)
  const [osInfo, setOsInfo] = useState<any>(null)
  const [osState, setOsState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState('')
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS)
  const fetching = useRef(false)

  const fetchAll = useCallback(async () => {
    if (fetching.current) return
    fetching.current = true
    setLoading(true)
    setError('')
    try {
      const [sys, state, os, osst] = await Promise.all([
        api.getSysInfo(),
        api.getSysState(),
        api.getOsInfo(),
        api.getOsState(),
      ])
      setSysInfo(sys)
      setSysState(state)
      setOsInfo(os)
      setOsState(osst)
      setLastRefresh(new Date().toLocaleString('zh-CN', { hour12: false }))
      setCountdown(AUTO_REFRESH_SECONDS)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
      fetching.current = false
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const fetchTimer = window.setInterval(fetchAll, AUTO_REFRESH_SECONDS * 1000)
    const countTimer = window.setInterval(() => {
      setCountdown((c) => (c <= 1 ? AUTO_REFRESH_SECONDS : c - 1))
    }, 1000)
    return () => {
      window.clearInterval(fetchTimer)
      window.clearInterval(countTimer)
    }
  }, [fetchAll])

  const memPercent =
    osInfo?.total_mem_mb && osState?.free_mem_mb !== undefined
      ? Number(
          (((osInfo.total_mem_mb - osState.free_mem_mb) / osInfo.total_mem_mb) * 100).toFixed(1)
        )
      : undefined
  const cpuPercent = osState?.cpu_percent === undefined ? '-' : `${osState.cpu_percent}%`
  const memPercentText = memPercent === undefined ? '-' : `${memPercent}%`

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">系统信息</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            区分展示操作系统信息与后台系统信息，并分别按基本信息、运行状态归类。
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={fetchAll} disabled={loading} size="sm">
            {loading ? '刷新中…' : '刷新数据'}
          </Button>
          <span className="text-xs text-muted-foreground">
            {countdown} 秒后自动刷新
          </span>
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">上次刷新：{lastRefresh}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="后台运行时长" value={disp(sysState?.uptime)} />
        <StatCard label="操作系统运行时长" value={disp(osState?.uptime)} />
        <StatCard label="CPU 使用率" value={cpuPercent} />
        <StatCard label="内存使用率" value={memPercentText} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>操作系统信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section>
              <h2 className="mb-1 text-sm font-medium">基本信息</h2>
              <Row label="主机名">{disp(osInfo?.hostname)}</Row>
              <Row label="操作系统">{disp(osInfo?.os_name)}</Row>
              <Row label="系统平台">{disp(osInfo?.platform)}</Row>
              <Row label="系统架构">{disp(osInfo?.arch)}</Row>
              <Row label="CPU 型号">{disp(osInfo?.cpu_model)}</Row>
              <Row label="CPU 核心数">{disp(osInfo?.cpu_count)}</Row>
              <Row label="总内存">{disp(osInfo?.total_mem_mb, ' MB')}</Row>
            </section>
            <section>
              <h2 className="mb-1 text-sm font-medium">运行状态</h2>
              <Row label="CPU 使用率">{cpuPercent}</Row>
              <Row label="内存使用率">{memPercentText}</Row>
              <Row label="CPU 频率">{disp(osState?.cpu_freq)}</Row>
              <Row label="空闲内存">{disp(osState?.free_mem_mb, ' MB')}</Row>
              <Row label="运行时长">{disp(osState?.uptime)}</Row>
              <Row label="启动时间">{fmtDateTime(osInfo?.start_time)}</Row>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>后台系统信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section>
              <h2 className="mb-1 text-sm font-medium">基本信息</h2>
              <Row label="系统名称">NewsGlean</Row>
              <Row label="编译版本">{disp(sysInfo?.build_version)}</Row>
              <Row label="Go 版本">{disp(sysInfo?.go_version)}</Row>
              <Row label="编译时间">{fmtDateTime(sysInfo?.build_time)}</Row>
            </section>
            <section>
              <h2 className="mb-1 text-sm font-medium">运行状态</h2>
              <Row label="启动时间">{fmtDateTime(sysInfo?.start_time)}</Row>
              <Row label="运行时长">{disp(sysState?.uptime)}</Row>
              <Row label="堆内存使用量">{disp(sysState?.heap_used_mb, ' MB')}</Row>
              <Row label="GC 总次数">{disp(sysState?.gc_total_count)}</Row>
              <Row label="运行状态">
                {sysInfo ? <Badge variant="secondary">运行中</Badge> : '-'}
              </Row>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
