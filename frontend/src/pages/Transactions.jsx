import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AppShell from '../components/AppShell'
import { fetchTransactions, setTransactionFilters, setTransactionPage } from '../store/slices/walletSlice'

const typeOptions = [
  ['all', '全部'],
  ['bet', '下注'],
  ['payout', '派彩'],
  ['checkin', '簽到'],
  ['task', '任務'],
  ['gift', '贈送'],
]

export default function Transactions() {
  const dispatch = useDispatch()
  const { transactions, transactionTotal, transactionPage, transactionPageSize, filters, loading, error } = useSelector((state) => state.wallet)
  const totalPages = Math.max(Math.ceil(transactionTotal / transactionPageSize), 1)

  useEffect(() => {
    dispatch(fetchTransactions({ ...filters, page: transactionPage, pageSize: transactionPageSize }))
  }, [dispatch, filters, transactionPage, transactionPageSize])

  return (
    <AppShell>
      <section className="rounded border border-white/10 bg-zinc-900 p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Wallet Ledger</p>
            <h2 className="mt-1 text-2xl font-black text-white">交易紀錄</h2>
          </div>
          <button
            type="button"
            onClick={() => dispatch(fetchTransactions({ ...filters, page: transactionPage, pageSize: transactionPageSize }))}
            className="rounded bg-white px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-zinc-200"
          >
            {loading ? '同步中...' : '同步流水'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <select
            className="min-h-11 rounded border border-white/10 bg-black px-4 text-sm font-bold text-white outline-none focus:border-white"
            value={filters.type}
            onChange={(event) => dispatch(setTransactionFilters({ type: event.target.value }))}
          >
            {typeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="min-h-11 rounded border border-white/10 bg-black px-4 text-sm font-bold text-white outline-none focus:border-white"
            value={filters.startDate}
            onChange={(event) => dispatch(setTransactionFilters({ startDate: event.target.value }))}
          />
          <input
            type="date"
            className="min-h-11 rounded border border-white/10 bg-black px-4 text-sm font-bold text-white outline-none focus:border-white"
            value={filters.endDate}
            onChange={(event) => dispatch(setTransactionFilters({ endDate: event.target.value }))}
          />
        </div>
        {error && <p className="mt-3 rounded border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="px-3 py-2">交易 ID</th>
                <th className="px-3 py-2">類型</th>
                <th className="px-3 py-2">金額</th>
                <th className="px-3 py-2">狀態</th>
                <th className="px-3 py-2">時間</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id} className="bg-black">
                  <td className="rounded-l border-y border-l border-white/10 px-3 py-4 font-black text-white">{row.id}</td>
                  <td className="border-y border-white/10 px-3 py-4 text-zinc-300">{row.typeLabel}</td>
                  <td className={['border-y border-white/10 px-3 py-4 font-black', row.amount < 0 ? 'text-red-300' : 'text-emerald-300'].join(' ')}>
                    {row.amount > 0 ? '+' : ''}
                    {row.amount.toLocaleString()}
                  </td>
                  <td className="border-y border-white/10 px-3 py-4 text-zinc-300">{row.status}</td>
                  <td className="rounded-r border-y border-r border-white/10 px-3 py-4 text-zinc-400">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr className="bg-black">
                  <td colSpan="5" className="rounded border border-white/10 px-3 py-8 text-center font-bold text-zinc-500">
                    沒有符合條件的交易紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-bold text-zinc-500">
            第 {transactionPage} / {totalPages} 頁，共 {transactionTotal} 筆
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch(setTransactionPage(Math.max(transactionPage - 1, 1)))}
              disabled={transactionPage <= 1}
              className="rounded border border-white/10 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一頁
            </button>
            <button
              type="button"
              onClick={() => dispatch(setTransactionPage(Math.min(transactionPage + 1, totalPages)))}
              disabled={transactionPage >= totalPages}
              className="rounded border border-white/10 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一頁
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
