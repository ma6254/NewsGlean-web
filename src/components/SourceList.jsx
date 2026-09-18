import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { fmtRelativeTime, fmtTime } from '../util'
import SourceForm from './SourceForm'
import { useConfirm } from './ConfirmDialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

// SourceList 是渠道管理页：列表 + 新增/编辑表单 + 启停/删除。
export default function SourceList() {
  const confirm = useConfirm()

  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const dirtyRef = useRef(false)

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
      closeDialog()
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
      closeDialog()
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
    const ok = await confirm({
      title: '删除渠道',
      description: `确定删除渠道「${s.name}」？此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.deleteSource(s.id)
      setNotice('渠道已删除')
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  function openAdd() {
    setEditing(null)
    dirtyRef.current = false
    setOpen(true)
  }

  function openEdit(s) {
    setEditing(s)
    dirtyRef.current = false
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setEditing(null)
    dirtyRef.current = false
  }

  // 关闭前若表单已填写内容则二次确认
  async function requestClose() {
    if (dirtyRef.current) {
      const ok = await confirm({
        title: '放弃修改？',
        description: '已填写内容，确定放弃并关闭？',
        confirmText: '放弃',
        cancelText: '继续编辑',
        destructive: true,
      })
      if (!ok) return
    }
    closeDialog()
  }

  function handleOpenChange(next) {
    if (next) {
      setOpen(true)
      return
    }
    requestClose()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">渠道</h1>
        <Button onClick={openAdd}>+ 添加渠道</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {notice}
        </div>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑渠道' : '添加渠道'}</DialogTitle>
          </DialogHeader>
          <SourceForm
            key={editing ? editing.id : 'new'}
            initial={editing}
            busy={busy}
            onSubmit={(payload) =>
              editing
                ? handleUpdate(editing.id, payload)
                : handleCreate(payload)
            }
            onCancel={requestClose}
            onDirtyChange={(d) => {
              dirtyRef.current = d
            }}
          />
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">加载中…</div>
      ) : sources.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          还没有渠道，点「+ 添加渠道」开始。
        </div>
      ) : (
        <ul className="space-y-3">
          {sources.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <Badge variant="outline">{s.type}</Badge>
                    {!s.enabled && (
                      <Badge variant="secondary">已停用</Badge>
                    )}
                    {s.fail_count > 0 && (
                      <Badge variant="destructive">失败 {s.fail_count}</Badge>
                    )}
                  </div>

                  {s.config?.url && (
                    <div className="mt-1 break-all text-xs text-muted-foreground">
                      {s.config.url}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    每 {s.interval}s 刷新 · 创建于 {fmtTime(s.created_at)}
                    {s.last_entry_at
                      ? ` · 最后更新 ${fmtRelativeTime(s.last_entry_at)}`
                      : ' · 暂无内容'}
                  </div>
                  {s.last_error && (
                    <div className="mt-1 text-xs text-destructive">
                      最近错误：{s.last_error}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(s)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(s)}
                    >
                      {s.enabled ? '停用' : '启用'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(s)}
                    >
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
