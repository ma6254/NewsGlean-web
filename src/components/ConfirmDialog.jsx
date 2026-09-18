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

const ConfirmContext = createContext(null)

const DEFAULT_OPTS = {
  title: '确认操作',
  description: '',
  confirmText: '确定',
  cancelText: '取消',
  destructive: false,
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolverRef = useRef(null)

  // confirm 返回 Promise<boolean>：点「确定」resolve(true)，点「取消」/Esc/遮罩 resolve(false)。
  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({ ...DEFAULT_OPTS, ...opts })
    })
  }, [])

  function settle(result) {
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

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm 必须在 ConfirmProvider 内使用')
  }
  return ctx
}
