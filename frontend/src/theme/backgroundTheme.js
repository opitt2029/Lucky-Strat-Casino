export const BACKGROUND_ASSET_FOLDER = '/backgrounds/'

const asset = (fileName) => {
  if (!fileName) {
    return 'none'
  }

  return `url("${BACKGROUND_ASSET_FOLDER}${fileName}")`
}

export const gameCatalog = [
  {
    id: 'slot',
    to: '/game/slot',
    title: '老虎機',
    caption: '3x3 轉輪 / 100 起注',
    meta: '快速局',
    assetKey: 'slotGame',
  },
  {
    id: 'baccarat',
    to: '/game/baccarat',
    title: '百家樂',
    caption: '莊 / 閒 / 和 三區下注',
    meta: '牌桌局',
    assetKey: 'baccaratGame',
  },
]

export const shopCatalog = [
  {
    id: 'vip-ticket',
    title: 'VIP 入場券',
    caption: '預留給活動、抽獎或限時桌台資格',
    cost: 12000,
    assetKey: 'shopPrizeA',
  },
  {
    id: 'avatar-frame',
    title: '會員頭像框',
    caption: '可接會員中心外觀裝飾',
    cost: 8000,
    assetKey: 'shopPrizeB',
  },
  {
    id: 'bonus-box',
    title: '幸運禮盒',
    caption: '預留給兌換碼、道具或實體禮品',
    cost: 20000,
    assetKey: 'shopPrizeC',
  },
]

export const decorativeAssets = {
  homeHero: {
    image: '',
    label: '首頁主視覺',
    caption: '可放品牌 KV、角色或場景圖',
    overlay:
      'linear-gradient(90deg, rgba(9, 9, 11, 0.9) 0%, rgba(9, 9, 11, 0.64) 48%, rgba(9, 9, 11, 0.92) 100%)',
  },
  homeGames: {
    image: '',
    label: '遊戲入口素材',
    caption: '可放遊戲集合、轉輪或牌桌情境',
    overlay:
      'linear-gradient(135deg, rgba(24, 24, 27, 0.78) 0%, rgba(9, 9, 11, 0.92) 100%)',
  },
  memberHero: {
    image: '',
    label: '會員頁素材',
    caption: '可放會員徽章、登入背景或品牌角色',
    overlay:
      'linear-gradient(180deg, rgba(2, 6, 23, 0.52) 0%, rgba(2, 6, 23, 0.92) 100%)',
  },
  gamesGallery: {
    image: '',
    label: '遊戲大全素材',
    caption: '可放收編遊戲牆或分類視覺',
    overlay:
      'linear-gradient(135deg, rgba(0, 0, 0, 0.62) 0%, rgba(9, 9, 11, 0.92) 100%)',
  },
  slotGame: {
    image: '',
    label: '老虎機素材',
    caption: '可放遊戲封面、角色或機台圖',
    overlay:
      'linear-gradient(135deg, rgba(63, 63, 70, 0.28) 0%, rgba(9, 9, 11, 0.92) 100%)',
  },
  baccaratGame: {
    image: '',
    label: '百家樂素材',
    caption: '可放牌桌、荷官或籌碼圖',
    overlay:
      'linear-gradient(135deg, rgba(39, 39, 42, 0.32) 0%, rgba(9, 9, 11, 0.92) 100%)',
  },
  shopHero: {
    image: '',
    label: '商城主視覺',
    caption: '可放禮品、寶箱或兌換活動圖',
    overlay:
      'linear-gradient(90deg, rgba(9, 9, 11, 0.9) 0%, rgba(39, 39, 42, 0.58) 58%, rgba(9, 9, 11, 0.96) 100%)',
  },
  shopPrizeA: {
    image: '',
    label: '禮品素材 A',
    caption: 'VIP 票券圖',
    overlay:
      'linear-gradient(135deg, rgba(250, 204, 21, 0.16) 0%, rgba(9, 9, 11, 0.88) 100%)',
  },
  shopPrizeB: {
    image: '',
    label: '禮品素材 B',
    caption: '頭像框圖',
    overlay:
      'linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(9, 9, 11, 0.88) 100%)',
  },
  shopPrizeC: {
    image: '',
    label: '禮品素材 C',
    caption: '禮盒圖',
    overlay:
      'linear-gradient(135deg, rgba(244, 63, 94, 0.16) 0%, rgba(9, 9, 11, 0.88) 100%)',
  },
}

export const backgroundTheme = {
  app: {
    color: '#09090b',
    image: '',
    overlay:
      'linear-gradient(180deg, rgba(9, 9, 11, 0.88) 0%, rgba(9, 9, 11, 0.72) 42%, rgba(9, 9, 11, 0.94) 100%)',
    accent:
      'radial-gradient(circle at 18% 12%, rgba(250, 204, 21, 0.14), transparent 30%), radial-gradient(circle at 82% 0%, rgba(244, 63, 94, 0.12), transparent 28%)',
    position: 'center',
    size: 'cover',
  },
  auth: {
    color: '#09090b',
    image: '',
    overlay:
      'linear-gradient(135deg, rgba(9, 9, 11, 0.94) 0%, rgba(9, 9, 11, 0.72) 48%, rgba(9, 9, 11, 0.96) 100%)',
    accent:
      'radial-gradient(circle at 14% 18%, rgba(250, 204, 21, 0.18), transparent 28%), radial-gradient(circle at 78% 86%, rgba(14, 165, 233, 0.14), transparent 32%)',
    position: 'center',
    size: 'cover',
  },
  authHero: {
    color: '#020617',
    image: '',
    overlay:
      'linear-gradient(180deg, rgba(2, 6, 23, 0.5) 0%, rgba(2, 6, 23, 0.88) 100%)',
    accent:
      'radial-gradient(circle at 24% 20%, rgba(250, 204, 21, 0.22), transparent 30%), radial-gradient(circle at 78% 66%, rgba(244, 63, 94, 0.18), transparent 34%)',
    position: 'center',
    size: 'cover',
  },
  lobbyHero: {
    color: '#050505',
    image: '',
    overlay:
      'linear-gradient(90deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.58) 58%, rgba(0, 0, 0, 0.9) 100%)',
    accent:
      'radial-gradient(circle at 72% 22%, rgba(250, 204, 21, 0.16), transparent 28%), radial-gradient(circle at 92% 82%, rgba(255, 255, 255, 0.08), transparent 24%)',
    position: 'center',
    size: 'cover',
  },
  home: {
    color: '#09090b',
    image: '',
    overlay:
      'linear-gradient(180deg, rgba(9, 9, 11, 0.92) 0%, rgba(9, 9, 11, 0.72) 48%, rgba(9, 9, 11, 0.96) 100%)',
    accent:
      'radial-gradient(circle at 16% 12%, rgba(250, 204, 21, 0.16), transparent 28%), radial-gradient(circle at 82% 20%, rgba(14, 165, 233, 0.12), transparent 30%)',
    position: 'center',
    size: 'cover',
  },
  shop: {
    color: '#08080a',
    image: '',
    overlay:
      'linear-gradient(180deg, rgba(8, 8, 10, 0.9) 0%, rgba(8, 8, 10, 0.74) 46%, rgba(8, 8, 10, 0.96) 100%)',
    accent:
      'radial-gradient(circle at 18% 18%, rgba(250, 204, 21, 0.14), transparent 30%), radial-gradient(circle at 78% 78%, rgba(244, 63, 94, 0.12), transparent 32%)',
    position: 'center',
    size: 'cover',
  },
}

export function getBackgroundStyle(name = 'app') {
  const preset = backgroundTheme[name] || backgroundTheme.app

  return {
    '--theme-bg-color': preset.color,
    '--theme-bg-image': asset(preset.image),
    '--theme-bg-overlay': preset.overlay || 'none',
    '--theme-bg-accent': preset.accent || 'none',
    '--theme-bg-position': preset.position || 'center',
    '--theme-bg-size': preset.size || 'cover',
  }
}

export function getDecorativeAssetStyle(name) {
  const preset = decorativeAssets[name] || decorativeAssets.homeHero

  return {
    '--decorative-image': asset(preset.image),
    '--decorative-overlay': preset.overlay || 'linear-gradient(135deg, rgba(24, 24, 27, 0.72), rgba(9, 9, 11, 0.92))',
  }
}
