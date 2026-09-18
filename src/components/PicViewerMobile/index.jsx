import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { ChevronLeft, ChevronRight, Download, Info, X } from 'lucide-react'
import { cn } from 'cn'

const MIN_FIT_RATIO = 0.5
const MAX_FIT_RATIO = 6
const TAP_MOVE_THRESHOLD = 8
const DOUBLE_TAP_MS = 300

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return ''
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** 依据文件名后缀或 MIME 推断展示用类型。 */
function detectFileType(name, mime) {
  if (mime) return mime
  const ext = (name || '').split('.').pop()?.toLowerCase() || ''
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    ogv: 'video/ogg',
  }
  return map[ext] || '未知'
}

/**
 * 移动端图片查看器（全屏预览弹窗）。
 * 支持：单指拖拽平移、双指捏合缩放、双击放大/复原、单击切换控制栏、下载、前后切换。
 */
function PicViewerMobileDialog({
  open,
  onOpenChange,
  src,
  alt,
  title,
  filePath,
  size,
  blobType,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}) {
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [infoOpen, setInfoOpen] = useState(false)
  const [naturalSize, setNaturalSize] = useState(null)

  const containerRef = useRef(null)
  const imageRef = useRef(null)
  const pointersRef = useRef(new Map())
  const panStartRef = useRef(null)
  const pinchStartRef = useRef(null)
  const tapStartRef = useRef(null)
  const movedRef = useRef(false)
  const tapTimerRef = useRef(null)
  const fitScaleRef = useRef(1)

  const imageUrl = src ?? null
  const displayTitle = title || filePath || alt || '图片'
  const effectiveSize = size
  const sizeText = formatSize(effectiveSize)
  const fileType = detectFileType(displayTitle, blobType)

  function clampScale(value) {
    const fit = fitScaleRef.current || 1
    return Math.min(Math.max(value, fit * MIN_FIT_RATIO), fit * MAX_FIT_RATIO)
  }

  function clampTranslate(tx, ty, s) {
    const container = containerRef.current
    const img = imageRef.current
    const iw = img?.naturalWidth || 0
    const ih = img?.naturalHeight || 0
    if (!container || iw <= 0 || ih <= 0) return { x: tx, y: ty }

    const cw = container.clientWidth
    const ch = container.clientHeight
    const maxX = Math.max(0, (iw * s - cw) / 2)
    const maxY = Math.max(0, (ih * s - ch) / 2)

    return {
      x: Math.min(Math.max(tx, -maxX), maxX),
      y: Math.min(Math.max(ty, -maxY), maxY),
    }
  }

  const resetToFit = useCallback(() => {
    const container = containerRef.current
    const img = imageRef.current
    const iw = img?.naturalWidth || 0
    const ih = img?.naturalHeight || 0
    if (!container || iw <= 0 || ih <= 0) return

    const fit = Math.min(container.clientWidth / iw, container.clientHeight / ih)
    fitScaleRef.current = fit
    setScale(fit)
    setTranslateX(0)
    setTranslateY(0)
  }, [])

  // 打开预览：重置变换与状态，随后适配屏幕。
  useEffect(() => {
    if (!open) return undefined

    setControlsVisible(true)
    setInfoOpen(false)
    setNaturalSize(null)
    setScale(1)
    setTranslateX(0)
    setTranslateY(0)
    fitScaleRef.current = 1

    const id = window.requestAnimationFrame(() => resetToFit())
    return () => {
      window.cancelAnimationFrame(id)
      if (tapTimerRef.current) {
        window.clearTimeout(tapTimerRef.current)
        tapTimerRef.current = null
      }
    }
  }, [open, resetToFit])

  // 卸载时清理双击计时器。
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current)
    }
  }, [])

  function handleDoubleTapZoom(clientX, clientY) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const offsetX = clientX - centerX
    const offsetY = clientY - centerY

    if (scale > fitScaleRef.current * 1.1) {
      resetToFit()
      return
    }

    const oldScale = scale
    const newScale = clampScale(fitScaleRef.current * 2.5)
    const ratio = newScale / oldScale
    const { x, y } = clampTranslate(
      offsetX - (offsetX - translateX) * ratio,
      offsetY - (offsetY - translateY) * ratio,
      newScale,
    )
    setScale(newScale)
    setTranslateX(x)
    setTranslateY(y)
  }

  function handleTap(clientX, clientY) {
    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      handleDoubleTapZoom(clientX, clientY)
    } else {
      tapTimerRef.current = window.setTimeout(() => {
        tapTimerRef.current = null
        setControlsVisible((v) => !v)
      }, DOUBLE_TAP_MS)
    }
  }

  function handlePointerDown(e) {
    const pointers = pointersRef.current
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)

    if (pointers.size === 1) {
      panStartRef.current = { x: e.clientX, y: e.clientY, translateX, translateY }
      tapStartRef.current = { x: e.clientX, y: e.clientY }
      movedRef.current = false
    } else if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()]
      const rect = containerRef.current?.getBoundingClientRect()
      const centerX = rect ? rect.left + rect.width / 2 : 0
      const centerY = rect ? rect.top + rect.height / 2 : 0
      pinchStartRef.current = {
        distance: distance(p1, p2),
        scale,
        translateX,
        translateY,
        offsetX: (p1.x + p2.x) / 2 - centerX,
        offsetY: (p1.y + p2.y) / 2 - centerY,
      }
      tapStartRef.current = null
    }
  }

  function handlePointerMove(e) {
    const pointers = pointersRef.current
    if (!pointers.has(e.pointerId)) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.size === 1 && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD) movedRef.current = true
      if (movedRef.current) {
        const { x, y } = clampTranslate(
          panStartRef.current.translateX + dx,
          panStartRef.current.translateY + dy,
          scale,
        )
        setTranslateX(x)
        setTranslateY(y)
      }
    } else if (pointers.size === 2 && pinchStartRef.current) {
      const [p1, p2] = [...pointers.values()]
      const d = distance(p1, p2)
      if (pinchStartRef.current.distance <= 0) return
      const newScale = clampScale(pinchStartRef.current.scale * (d / pinchStartRef.current.distance))
      const ratio = newScale / pinchStartRef.current.scale
      const { x, y } = clampTranslate(
        pinchStartRef.current.offsetX - (pinchStartRef.current.offsetX - pinchStartRef.current.translateX) * ratio,
        pinchStartRef.current.offsetY - (pinchStartRef.current.offsetY - pinchStartRef.current.translateY) * ratio,
        newScale,
      )
      setScale(newScale)
      setTranslateX(x)
      setTranslateY(y)
    }
  }

  function handlePointerUp(e) {
    const pointers = pointersRef.current
    const wasLast = pointers.size === 1
    pointers.delete(e.pointerId)

    if (pointers.size < 2) pinchStartRef.current = null
    if (pointers.size === 0) {
      if (wasLast && tapStartRef.current && !movedRef.current) {
        handleTap(e.clientX, e.clientY)
      }
      panStartRef.current = null
      tapStartRef.current = null
      movedRef.current = false
    }
  }

  function handleDownload() {
    if (!imageUrl) return
    const anchor = document.createElement('a')
    anchor.href = imageUrl
    anchor.download = displayTitle || 'image'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  if (!imageUrl) {
    return null
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col bg-black text-white outline-none">
          <DialogPrimitive.Title className="sr-only">图片查看器</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">移动端图片预览</DialogPrimitive.Description>

          {/* 手势层 */}
          <div
            ref={containerRef}
            className="relative flex flex-1 items-center justify-center overflow-hidden"
            style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={alt ?? displayTitle}
              draggable={false}
              onLoad={(e) => {
                setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
                resetToFit()
              }}
              style={{
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                maxWidth: 'none',
                maxHeight: 'none',
                flexShrink: 0,
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* 顶部栏 */}
          <div
            className={cn(
              'absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 transition-opacity duration-200',
              controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))', paddingBottom: '1.5rem' }}
          >
            <div className="min-w-0">
              <div className="truncate text-base font-medium">{displayTitle}</div>
              {sizeText ? <div className="text-xs text-white/60">{sizeText}</div> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"
                aria-label="文件信息"
              >
                <Info className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"
                aria-label="关闭"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* 底部栏 */}
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-4 transition-opacity duration-200',
              controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            style={{ paddingTop: '1.5rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            {hasPrev ? (
              <button
                type="button"
                onClick={onPrev}
                className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"
                aria-label="上一张"
              >
                <ChevronLeft className="size-6" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDownload}
              className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"
              aria-label="下载"
            >
              <Download className="size-5" />
            </button>
            {hasNext ? (
              <button
                type="button"
                onClick={onNext}
                className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"
                aria-label="下一张"
              >
                <ChevronRight className="size-6" />
              </button>
            ) : null}
          </div>

          {/* 文件信息面板 */}
          {infoOpen ? (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-6"
              onClick={() => setInfoOpen(false)}
            >
              <div
                className="w-full max-w-xs rounded-xl bg-neutral-900/95 p-4 text-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">文件信息</span>
                  <button
                    type="button"
                    onClick={() => setInfoOpen(false)}
                    className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
                    aria-label="关闭信息"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-14 shrink-0 text-white/50">文件名</dt>
                    <dd className="min-w-0 flex-1 break-all">{displayTitle}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-14 shrink-0 text-white/50">尺寸</dt>
                    <dd className="flex-1">
                      {naturalSize ? `${naturalSize.width} × ${naturalSize.height} px` : '—'}
                    </dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-14 shrink-0 text-white/50">大小</dt>
                    <dd className="flex-1">{sizeText || '—'}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-14 shrink-0 text-white/50">类型</dt>
                    <dd className="min-w-0 flex-1 break-all">{fileType}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * 移动端缩略图查看器：缩略图 + 全屏预览对话框。
 * 支持 fetcher（Blob → 对象 URL）与 src（直接使用地址）两种取图方式。
 */
function PicViewerMobile({
  src,
  alt,
  title,
  filePath,
  size,
  fetcher,
  loadingFallback,
  refreshKey = 0,
  width = 80,
  height = 80,
  className,
  thumbStyle,
  fit = 'contain',
  fallback,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}) {
  const [open, setOpen] = useState(false)

  // fetcher 懒加载（对齐桌面端 PicViewer）：Blob → 对象 URL。
  const [fetchedImageUrl, setFetchedImageUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [blobSize, setBlobSize] = useState(0)
  const [blobType, setBlobType] = useState('')
  const fetcherRef = useRef(fetcher)
  const objectUrlRef = useRef(null)

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  useEffect(() => {
    if (!fetcherRef.current) return undefined

    let cancelled = false
    let createdUrl = null
    setLoading(true)
    setError(false)
    setFetchedImageUrl(null)

    fetcherRef.current()
      .then((blob) => {
        if (cancelled) return
        if (!blob || blob.size === 0) {
          setError(true)
          return
        }
        createdUrl = URL.createObjectURL(blob)
        objectUrlRef.current = createdUrl
        setFetchedImageUrl(createdUrl)
        setBlobSize(blob.size || 0)
        setBlobType(blob.type || '')
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
        if (objectUrlRef.current === createdUrl) objectUrlRef.current = null
      }
    }
  }, [refreshKey])

  const imageUrl = fetcher ? fetchedImageUrl : (src ?? null)
  const effectiveSize = size || blobSize

  if (fetcher && error) {
    return fallback ?? null
  }

  if (fetcher && loading) {
    return loadingFallback ?? null
  }

  if (!imageUrl) {
    return fallback ?? null
  }

  return (
    <>
      <img
        src={imageUrl}
        alt={alt ?? filePath ?? title ?? '图片'}
        width={width}
        height={height}
        className={className}
        style={{ objectFit: fit, cursor: 'pointer', ...(thumbStyle || {}) }}
        onClick={() => setOpen(true)}
      />

      <PicViewerMobileDialog
        open={open}
        onOpenChange={setOpen}
        src={imageUrl}
        alt={alt}
        title={title}
        filePath={filePath}
        size={effectiveSize}
        blobType={blobType}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </>
  )
}

export { PicViewerMobileDialog }
export default PicViewerMobile
