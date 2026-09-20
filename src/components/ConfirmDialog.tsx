import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

// ConfirmDialog 是可复用的确认「消息框」：以 Promise 形式替代 window.confirm。
// 用法：const ok = await confirm({ title, description, confirmText, cancelText, destructive })
// 通过 ConfirmProvider 挂载全局唯一的对话框，任意组件经 useConfirm() 触发。

interface ConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

const DEFAULT_OPTS: Required<ConfirmOptions> = {
  title: '确认操作',
  description: '',
  confirmText: '确定',
  cancelText: '取消',
  destructive: false,
}

type ConfirmState = Required<ConfirmOptions>

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)
  const resolverRef = useRef<((result: boolean) => void) | null>(null)

  // confirm 返回 Promise<boolean>：点「确定」resolve(true)，点「取消」/Esc/遮罩 resolve(false)。
  const confirm = useCallback<ConfirmFn>((opts = {}) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({ ...DEFAULT_OPTS, ...opts })
    })
  }, [])

  function settle(result: boolean) {
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={state !== null}
        onOpenChange={(open) => {
          if (!open) settle(false)
        }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{state?.title}</DialogTitle>
            {state?.description && (
              <DialogDescription>{state.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => settle(false)}>
              {state?.cancelText}
            </Button>
            <Button
              variant={state?.destructive ? 'destructive' : 'default'}
              onClick={() => settle(true)}
            >
              {state?.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm 必须在 ConfirmProvider 内使用')
  }
  return ctx
}
