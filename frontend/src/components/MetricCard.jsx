export default function MetricCard({ label, value, caption, tone = 'dark' }) {
  const isLight = tone === 'light'

  return (
    <div
      className={[
        'rounded border p-4',
        isLight ? 'border-white bg-white text-zinc-950' : 'border-white/10 bg-zinc-900 text-white',
      ].join(' ')}
    >
      <p className={['text-xs font-black uppercase tracking-[0.25em]', isLight ? 'text-zinc-500' : 'text-zinc-500'].join(' ')}>
        {label}
      </p>
      <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
      {caption ? <p className={['mt-2 text-sm', isLight ? 'text-zinc-600' : 'text-zinc-400'].join(' ')}>{caption}</p> : null}
    </div>
  )
}
