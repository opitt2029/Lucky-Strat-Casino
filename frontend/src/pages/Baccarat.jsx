import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AppShell from '../components/AppShell'
import BaccaratTable from '../components/BaccaratTable'
import MetricCard from '../components/MetricCard'
import { betBaccarat } from '../store/slices/gameSlice'
import { setBalance } from '../store/slices/walletSlice'

const chipOptions = [100, 500, 1000]

export default function Baccarat() {
  const dispatch = useDispatch()
  const [selectedAmount, setSelectedAmount] = useState(100)
  const [bets, setBets] = useState({})
  const balance = useSelector((state) => state.wallet.balance)
  const { result, baccaratRound, loading, error } = useSelector((state) => state.game)

  const handleBet = async (area) => {
    try {
      const round = await dispatch(betBaccarat({ area, amount: selectedAmount })).unwrap()
      setBets((current) => ({ ...current, [area]: (current[area] || 0) + selectedAmount }))
      dispatch(setBalance(round.wallet))
    } catch {
      // gameSlice already exposes the message in state.error
    }
  }

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <BaccaratTable onBet={handleBet} bets={bets} round={baccaratRound} loading={loading} />

        <aside className="grid gap-4 content-start">
          <MetricCard label="牌桌限紅" value="100 / 50K" caption="可由 table API 回填" tone="light" />
          <MetricCard
            label="本局結果"
            value={result?.game === 'baccarat' ? result.winner : '-'}
            caption={result?.game === 'baccarat' ? `派彩 ${result.payout}` : '等待開牌'}
          />
          <div className="rounded border border-white/10 bg-zinc-900 p-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Chips</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {chipOptions.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setSelectedAmount(amount)}
                  className={[
                    'min-h-12 rounded border text-sm font-black transition',
                    selectedAmount === amount
                      ? 'border-white bg-white text-zinc-950'
                      : 'border-white/10 bg-black text-zinc-300 hover:border-white hover:text-white',
                  ].join(' ')}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="rounded border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}
          <button
            type="button"
            onClick={() => setBets({})}
            className="rounded border border-white/20 px-5 py-4 text-sm font-black text-white transition hover:bg-white hover:text-zinc-950"
          >
            清空桌面籌碼
          </button>
          <MetricCard label="可用星幣" value={balance.toLocaleString()} caption="下注後即時更新" />
        </aside>
      </section>
    </AppShell>
  )
}
