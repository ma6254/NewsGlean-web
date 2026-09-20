// 全局共享常量。

/** 列表每页条数（阅读流 / 收藏 / 归档 / 稍后再阅）。 */
export const PAGE_SIZE = 20

/** 系统信息页自动刷新间隔（秒）。 */
export const AUTO_REFRESH_SECONDS = 10

/** 渠道默认刷新间隔（秒），新增渠道时的初始值。 */
export const DEFAULT_SOURCE_INTERVAL = 1800

/** 「刷新完成」自定义事件名：Layout 派发，阅读页监听后高亮新条目。 */
export const REFRESH_EVENT = 'newsglean:refreshed'
