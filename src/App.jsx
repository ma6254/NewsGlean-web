import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import EntryList from './components/EntryList'
import EntryDetail from './components/EntryDetail'
import SourceList from './components/SourceList'

// 极简 hash 路由：不引入 react-router，路由表足够小。
//   #/            → 条目列表
//   #/entries     → 条目列表
//   #/entries/:id → 条目详情
//   #/sources     → 渠道管理
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return raw.split('/').filter(Boolean)
}

export default function App() {
  const [parts, setParts] = useState(parseHash())

  useEffect(() => {
    const onHash = () => setParts(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const [section, id] = parts

  let page
  if (!section || section === 'entries') {
    page = id ? <EntryDetail key={id} id={id} /> : <EntryList />
  } else if (section === 'sources') {
    page = <SourceList />
  } else {
    page = (
      <div className="py-16 text-center text-slate-500">
        <p className="text-lg">页面不存在</p>
        <a href="#/entries" className="text-sm text-blue-600 hover:underline">
          回到阅读
        </a>
      </div>
    )
  }

  return <Layout>{page}</Layout>
}
