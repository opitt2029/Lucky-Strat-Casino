import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import DecorativeAsset from '../components/DecorativeAsset'
import { gameCatalog, getBackgroundStyle } from '../theme/backgroundTheme'

const sections = [
  { id: 'intro', label: '介紹' },
  { id: 'games', label: '遊戲' },
  { id: 'member', label: '會員' },
  { id: 'shop', label: '商城' },
]

function HomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-zinc-950/78 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="font-black tracking-tight">
          幸運星幣城
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="rounded px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white hover:text-zinc-950">
              {section.label}
            </a>
          ))}
          <Link
            to={isAuthenticated ? '/games' : '/member'}
            className="rounded bg-white px-4 py-2 text-sm font-black text-zinc-950 hover:bg-zinc-200"
          >
            {isAuthenticated ? '進入遊戲大全' : '會員登入'}
          </Link>
        </nav>

        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded border border-white/20 text-white"
            aria-label="開啟會員選單"
            aria-expanded={menuOpen}
          >
            <span className="grid gap-1">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-56 rounded border border-white/10 bg-zinc-950 p-2 shadow-2xl">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white hover:text-zinc-950"
                >
                  {section.label}
                </a>
              ))}
              <Link
                to="/member"
                className="mt-2 block rounded bg-white px-3 py-2 text-sm font-black text-zinc-950"
                onClick={() => setMenuOpen(false)}
              >
                會員登入 / 註冊
              </Link>
              {isAuthenticated && (
                <Link
                  to="/profile"
                  className="mt-2 block rounded border border-white/10 px-3 py-2 text-sm font-black text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  會員中心
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  return (
    <div className="theme-background scroll-sections h-screen overflow-y-auto text-white" style={getBackgroundStyle('home')}>
      <HomeHeader />

      <section id="intro" className="scroll-section flex items-center px-4 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[1fr_0.84fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Lucky Star Casino</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight text-white sm:text-7xl">幸運星幣城</h1>
            <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-zinc-300">
              從首頁進入會員、遊戲大全與賭場商城。登入後即可選擇遊戲、累積籌碼，並在商城兌換禮品。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={isAuthenticated ? '/games' : '/member'} className="rounded bg-white px-6 py-3 text-sm font-black text-zinc-950 hover:bg-zinc-200">
                {isAuthenticated ? '查看遊戲大全' : '登入後開始'}
              </Link>
              <a href="#games" className="rounded border border-white/20 px-6 py-3 text-sm font-black text-white hover:bg-white hover:text-zinc-950">
                瀏覽網站結構
              </a>
            </div>
          </div>
          <DecorativeAsset assetKey="homeHero" className="min-h-[420px]" />
        </div>
      </section>

      <section id="games" className="scroll-section flex items-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.72fr_1fr]">
          <DecorativeAsset assetKey="homeGames" className="min-h-[360px]" />
          <div className="grid content-center gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Game Directory</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">遊戲大全作為所有遊戲入口</h2>
              <p className="mt-4 max-w-2xl text-base font-bold leading-8 text-zinc-400">
                未登入使用者會先導向會員頁。登入後可從遊戲大全進入每個遊戲網頁，遊玩結果會更新籌碼。
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {gameCatalog.map((game) => (
                <Link
                  key={game.id}
                  to={isAuthenticated ? game.to : '/member'}
                  className="rounded border border-white/10 bg-zinc-900 p-5 transition hover:border-white hover:bg-white hover:text-zinc-950"
                >
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">{game.meta}</p>
                  <h3 className="mt-3 text-2xl font-black">{game.title}</h3>
                  <p className="mt-2 text-sm font-bold text-zinc-400">{game.caption}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="member" className="scroll-section flex items-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Member Gate</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">會員頁負責登入、註冊與遊戲門禁</h2>
            <p className="mt-4 max-w-2xl text-base font-bold leading-8 text-zinc-400">
              遊戲大全、遊戲網頁與賭場商城都需要登入。尚未登入時會導回會員頁，完成登入後再進入遊戲流程。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/member" className="rounded bg-white px-6 py-3 text-sm font-black text-zinc-950 hover:bg-zinc-200">
                前往會員頁
              </Link>
              <Link to={isAuthenticated ? '/profile' : '/member'} className="rounded border border-white/20 px-6 py-3 text-sm font-black text-white hover:bg-white hover:text-zinc-950">
                會員中心
              </Link>
            </div>
          </div>
          <DecorativeAsset assetKey="memberHero" className="min-h-[360px]" />
        </div>
      </section>

      <section id="shop" className="scroll-section flex items-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[0.72fr_1fr]">
          <DecorativeAsset assetKey="shopHero" className="min-h-[360px]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Casino Shop</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">賭場商城承接遊戲贏得的籌碼</h2>
            <p className="mt-4 max-w-2xl text-base font-bold leading-8 text-zinc-400">
              商城頁已預留禮品素材與兌換流程，後續可以接上實際庫存、出貨狀態或活動 API。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={isAuthenticated ? '/shop' : '/member'} className="rounded bg-white px-6 py-3 text-sm font-black text-zinc-950 hover:bg-zinc-200">
                進入賭場商城
              </Link>
              <Link to={isAuthenticated ? '/games' : '/member'} className="rounded border border-white/20 px-6 py-3 text-sm font-black text-white hover:bg-white hover:text-zinc-950">
                先去贏籌碼
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
