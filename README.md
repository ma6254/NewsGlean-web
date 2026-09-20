# NewsGlean Web

> NewsGlean 的浏览器端界面：把 RSS、网页、聊天机器人里的信息统一成同一个阅读流，在浏览器里读、筛、存。

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](https://github.com/ma6254/news-glean)

---

## 这是什么

这是 NewsGlean 的前端仓库（SPA）。它本身不存任何数据、不采集任何内容 —— 所有数据都来自后端的 REST API，前端只负责「读」的体验：阅读流、条目详情、稍后再阅、收藏、归档、渠道管理，以及系统信息面板。

设计上沿用 NewsGlean 的核心思路：**「内容怎么来」和「内容怎么读」彻底分开**。所以这个前端只认统一的条目结构，不关心条目来自 RSS、网页还是聊天机器人。

---

## 功能

### 页面

| 路由            | 页面         | 说明                                                       |
| --------------- | ------------ | ---------------------------------------------------------- |
| `/`、`/entries` | 阅读流       | 全部条目，支持已读/未读、渠道筛选与分页                     |
| `/entries/:id`  | 条目详情     | 正文 + 元数据，已读 / 收藏 / 归档 / 稍后再阅操作            |
| `/read-later`   | 稍后再阅     | 标记为稍后再阅的条目                                       |
| `/favorites`    | 收藏         | 收藏的条目                                                 |
| `/archive`      | 归档         | 已归档的条目                                               |
| `/sources`      | 渠道管理     | 渠道的增删改查、连通性探测（probe）、采集日志               |
| `/system-info`  | 系统信息     | 操作系统信息 + 后台系统信息，双栏展示，每 10 秒自动刷新      |
| `*`             | 404          | 未匹配路径回退                                             |

### 全局体验

- **顶栏导航 + 立即刷新**：手动触发采集，完成后弹出「新增 / 跳过」结果提示。
- **实时采集进度**：通过 SSE（`/api/refresh/stream`）订阅采集进度，顶栏实时显示正在刷新的渠道。
- **新内容高亮**：后台定时刷新带来新条目时，阅读页自动刷新并高亮新条目。
- **响应式 + 移动端图片查看**：适配手机 / 平板（`isMobileDevice` 区分设备，`PicViewer` / `PicViewerMobile` 分别处理桌面与移动端图片查看）。

---

## 技术栈

| 类别     | 选型                                                              |
| -------- | ----------------------------------------------------------------- |
| 框架     | React 19 + React Router 7（history 模式，路径不带 `#`）            |
| 语言     | TypeScript（strict 模式，`tsc --noEmit` 类型检查）                  |
| 构建     | Vite 8 + `@vitejs/plugin-react`                                   |
| 样式     | Tailwind CSS 4（`@tailwindcss/vite`）+ CSS 变量                     |
| 组件     | shadcn 风格组件（`base-nova` 样式，`lucide-react` 图标，`class-variance-authority`） |
| 字体     | Geist Variable（`@fontsource-variable/geist`）                    |

---

## 目录结构

```
src/
  main.tsx            应用入口
  App.tsx             根组件（ConfirmProvider + Router）
  router/index.tsx    路由表
  services/           /api 的轻量封装 + SSE 采集进度订阅（index.ts）
  types.ts            与后端 DTO 对齐的前端类型定义
  constants/          全局共享常量（index.ts）
  utils/              通用工具（时间格式化、HTML 转纯文本等）
  index.css           Tailwind 入口样式
  lib/device.ts       设备判断（移动端 / 桌面端）
  pages/
    EntryList/        阅读流（index.tsx + index.css）
    EntryDetail/      条目详情
    ReadLater/        稍后再阅
    Favorites/        收藏
    Archive/          归档
    SourceList/       渠道管理
    SystemInfo/       系统信息
  components/
    Layout.tsx        全局框架（顶栏导航 + 刷新 + 进度条）
    EntryRow.tsx      单条条目
    StateList.tsx     通用状态列表
    SourceForm.tsx    渠道表单（新增 / 编辑）
    ConfirmDialog.tsx 确认对话框（ConfirmProvider）
    PicViewer/        桌面端图片查看器
    PicViewerMobile/  移动端图片查看器
    ui/               shadcn 基础组件（button / card / dialog / input 等）
```

---

## 快速开始

需要 Node.js **20** 或更高版本（Vite 8 运行要求）。

```bash
npm install
npm run dev
```

开发服务器默认监听 `http://localhost:38080`，并把 `/api`、`/swagger` 代理到本地后端 `http://127.0.0.1:28080`（见 `vite.config.ts`），避免跨域。因此开发时请先启动 NewsGlean 服务端。

代码规范：`npm run lint`（ESLint）· 类型检查：`npm run typecheck`（`tsc --noEmit`）。

---

## 构建与部署

```bash
npm run build   # 产物输出到 dist/
npm run preview # 本地预览构建产物
```

前端是纯静态 SPA，生产环境由 Go 后端**同源托管**：把 `dist/` 交给服务端作为静态资源目录即可，后端对非 API 请求做 SPA fallback（直接访问 `/sources` 这类路径也能正常加载）。部署细节见服务端仓库的 `DEPLOY.md`。

---

## 与后端的关系

- **数据全走后端**：前端不落任何状态，一切读写都经 `/api`（见 `src/api.js` 的封装）。
- **采集进度走 SSE**：`GET /api/refresh/stream`，`EventSource` 断线自动重连。
- **接口契约**：条目结构、渠道模型、系统信息等契约以后端为准，设计规格见 [PLAN.md](https://github.com/ma6254/NewsGlean-doc/blob/main/PLAN.md)。

---

## 文档

| 文档                                                                                                   | 内容                                         |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **README.md**                                                                                          | 前端简介（本文件）                           |
| [PLAN.md](https://github.com/ma6254/NewsGlean-doc/blob/main/PLAN.md)                                   | 设计方案与实现规格（采集抽象、数据模型、命令、路线图） |
| [服务端 README](https://github.com/ma6254/news-glean)                                                  | 后端仓库：API、渠道、去重、部署等            |
| [DEPLOY.md](https://github.com/ma6254/news-glean/blob/main/DEPLOY.md)                                  | 公网部署指南（反代 + HTTPS + 认证）          |

---

## 贡献

1. 开工前先在 Issue 里对齐范围，避免大改动返工。
2. 设计层面的讨论（尤其是与后端接口契约相关的部分）请在动手前提出，先对齐再实现。
3. Fork → 分支 → 提交 → PR，描述写清动机与验证方式。

---

## License

[MIT](https://github.com/ma6254/news-glean) © 2026 ma6254
