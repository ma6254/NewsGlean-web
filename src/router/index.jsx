import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import EntryList from '@/components/EntryList'
import EntryDetail from '@/components/EntryDetail'
import SourceList from '@/components/SourceList'

function NotFound() {
  return (
    <div className="py-16 text-center text-slate-500">
      <p className="text-lg">页面不存在</p>
      <Link to="/" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
        回到阅读
      </Link>
    </div>
  )
}

// Router 是应用路由：history 模式（BrowserRouter），路径不带 #。
// 后端对非 API 请求做了 SPA fallback，直接访问 /sources 这类路径也能正常加载。
export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<EntryList />} />
          <Route path="/entries" element={<EntryList />} />
          <Route path="/entries/:id" element={<EntryDetail />} />
          <Route path="/sources" element={<SourceList />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
