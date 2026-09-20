/** 判断当前设备是否为移动端（手机 / 平板）。 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  // iPadOS 13+ 会伪装成 Macintosh，但支持多点触控。
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1

  return uaMobile || touchMac
}
