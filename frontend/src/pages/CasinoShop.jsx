import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AppShell from '../components/AppShell'
import DecorativeAsset from '../components/DecorativeAsset'
import MetricCard from '../components/MetricCard'
import { setBalance } from '../store/slices/walletSlice'
import { shopCatalog } from '../theme/backgroundTheme'

function ShopItem({ item, balance, onRedeem }) {
  const disabled = balance < item.cost

  return (
    <article className="grid gap-4 rounded border border-white/10 bg-zinc-900 p-4">
      <DecorativeAsset assetKey={item.assetKey} className="min-h-48" />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Reward</p>
        <h3 className="mt-2 text-2xl font-black text-white">{item.title}</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">{item.caption}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-black text-white">{item.cost.toLocaleString()} 星幣</p>
        <button
          type="button"
          onClick={() => onRedeem(item)}
          disabled={disabled}
          className="rounded bg-white px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          兌換
        </button>
      </div>
    </article>
  )
}

export default function CasinoShop() {
  const dispatch = useDispatch()
  const balance = useSelector((state) => state.wallet.balance)
  const frozenAmount = useSelector((state) => state.wallet.frozenAmount)
  const [notice, setNotice] = useState('')
  const totalPrizeCost = useMemo(() => shopCatalog.reduce((sum, item) => sum + item.cost, 0), [])

  const handleRedeem = (item) => {
    if (balance < item.cost) {
      setNotice('星幣不足，先去遊戲大全累積更多籌碼。')
      return
    }

    dispatch(setBalance({ balance: balance - item.cost, frozenAmount }))
    setNotice(`已兌換 ${item.title}，後續可接出貨或背包 API。`)
  }

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[1fr_0.34fr]">
        <div className="grid gap-6 rounded border border-white/10 bg-zinc-900 p-6 sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Casino Shop</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">賭場商城</h2>
            <p className="mt-4 max-w-2xl text-base font-bold leading-8 text-zinc-400">
              使用遊戲中贏得的星幣兌換禮品。禮品圖、商城主視覺與每個素材槽都集中在 theme 檔案中設定。
            </p>
          </div>
          <DecorativeAsset assetKey="shopHero" className="min-h-[320px]" />
        </div>

        <aside className="grid content-start gap-4">
          <MetricCard label="可用星幣" value={balance.toLocaleString()} caption="walletSlice.balance" tone="light" />
          <MetricCard label="凍結星幣" value={frozenAmount.toLocaleString()} caption="保留給未結算流程" />
          <MetricCard label="商城總值" value={totalPrizeCost.toLocaleString()} caption={`${shopCatalog.length} 項禮品`} />
          {notice && <p className="rounded border border-white/10 bg-black px-4 py-3 text-sm font-bold text-zinc-300">{notice}</p>}
        </aside>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {shopCatalog.map((item) => (
          <ShopItem key={item.id} item={item} balance={balance} onRedeem={handleRedeem} />
        ))}
      </section>
    </AppShell>
  )
}
