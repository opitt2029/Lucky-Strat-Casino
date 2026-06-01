import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import DecorativeAsset from '../components/DecorativeAsset'
import MetricCard from '../components/MetricCard'
import { gameCatalog, getBackgroundStyle, getDecorativeAssetStyle } from '../theme/backgroundTheme'

function GameCard({ game }) {
  return (
    <Link
      to={game.to}
      className="group grid overflow-hidden rounded border border-white/10 bg-zinc-900 transition hover:border-white hover:bg-white hover:text-zinc-950 md:grid-cols-[0.44fr_0.56fr]"
    >
      <div className="decorative-asset min-h-52" style={getDecorativeAssetStyle(game.assetKey)} />
      <div className="grid content-between p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">{game.meta}</p>
          <h3 className="mt-3 text-3xl font-black">{game.title}</h3>
          <p className="mt-3 text-sm font-bold leading-6 text-zinc-400 group-hover:text-zinc-700">{game.caption}</p>
        </div>
        <span className="mt-6 text-sm font-black">查看遊戲頁</span>
      </div>
    </Link>
  )
}

export default function Lobby() {
  const balance = useSelector((state) => state.wallet.balance)

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div
          className="theme-artwork flex min-h-[360px] flex-col justify-between rounded border border-white/10 p-6 sm:p-8"
          style={getBackgroundStyle('lobbyHero')}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Game Directory</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              遊戲大全
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              這裡只展示平台目前收錄的遊戲清單。使用者從遊戲大全選擇遊戲後，才會進入各自的遊玩頁面。
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="rounded border border-white/20 px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-zinc-950">
              前往賭場商城
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <MetricCard label="目前星幣" value={balance.toLocaleString()} caption="walletSlice.balance" tone="light" />
          <MetricCard label="收錄遊戲" value={gameCatalog.length.toString()} caption="遊戲大全展示數" />
          <MetricCard label="頁面定位" value="Catalog" caption="不在大廳直接遊玩" />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.32fr_1fr]">
        <DecorativeAsset assetKey="gamesGallery" className="min-h-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {gameCatalog.map((game) => (
            <GameCard key={game.to} game={game} />
          ))}
        </div>
      </section>
    </AppShell>
  )
}
