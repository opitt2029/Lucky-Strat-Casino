import { decorativeAssets, getDecorativeAssetStyle } from '../theme/backgroundTheme'

export default function DecorativeAsset({ assetKey, className = '' }) {
  const asset = decorativeAssets[assetKey] || decorativeAssets.homeHero

  return (
    <div
      className={`decorative-asset grid min-h-56 content-end rounded border border-white/10 p-5 ${className}`}
      style={getDecorativeAssetStyle(assetKey)}
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-500">Asset Slot</p>
        <h3 className="mt-2 text-2xl font-black text-white">{asset.label}</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">{asset.caption}</p>
      </div>
    </div>
  )
}
