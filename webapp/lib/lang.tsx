"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Client-side, URL-independent language for the app shell + surfaces that are
 * NOT localized under the `/zh` route tree (mine/stake/battle/...). The toggle
 * flips the UI text in place and remembers the choice in `localStorage`.
 *
 * The public marketing routes (`/`, `/collection`, `/docs`, `/claim`) keep
 * their own `/zh/...` pages — this provider only drives the in-place app copy.
 */

export type Lang = "en" | "zh";

const STORAGE_KEY = "poc-lang";

type Ctx = { lang: Lang; setLang: (lang: Lang) => void; toggle: () => void };
const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {}, toggle: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  // Server render + first paint are EN; the stored/navigator locale applies on mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let next: Lang = "en";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "zh" || saved === "en") next = saved;
      else if (navigator.language?.toLowerCase().startsWith("zh")) next = "zh";
    } catch {
      /* storage unavailable — keep EN */
    }
    setLangState(next);
    document.documentElement.lang = next;
  }, []);

  const setLang = useCallback((value: Lang) => {
    setLangState(value);
    document.documentElement.lang = value;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => setLang(lang === "en" ? "zh" : "en"), [lang, setLang]);

  return <LangContext.Provider value={{ lang, setLang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx & { t: (typeof STRINGS)["en"] } {
  const ctx = useContext(LangContext);
  return { ...ctx, t: STRINGS[ctx.lang] };
}

/** All app-shell + /mine copy (EN / 中文). Keep keys flat and obvious. */
const STRINGS = {
  en: {
    mining: "Mining",
    more: "More",
    // wallet corner
    connect: "Connect wallet",
    connecting: "Connecting…",
    myProfile: "My profile",
    copyAddress: "Copy address",
    copied: "Copied",
    viewExplorer: "View on explorer",
    disconnect: "Disconnect",
    // /mine — hero
    heroKicker: "Mining Console 挖矿",
    heroTitle: "Mine",
    heroSubtitle:
      "One tap grinds a valid nonce and auto-mints it — the loop keeps running (mint → cooldown → grind) even while you browse other tabs.",
    // /mine — console
    consoleKicker: "Mining Console",
    mintPrice: "Mint price",
    minted: "Minted",
    chips: "Chips",
    nextWave: "Next era",
    waveProgress: "Era progress",
    collectionProgress: "Collection progress",
    baseBits: "Base bits",
    cooldown: "Cooldown",
    chipDisc: "Chip disc.",
    hashes: "Hashes",
    rate: "Rate",
    elapsed: "Elapsed",
    bestBits: "Best bits",
    powProgress: "PoW progress",
    useChip: "Use a chip",
    paying: "paying",
    balance: "balance",
    serial: "Serial",
    btnMine: "Mine",
    btnStop: "Stop",
    stReady: "ready",
    stMinting: "minting…",
    stGrinding: "grinding…",
    stAuto: "auto · waiting",
    stCheckingWorker: "checking worker…",
    stWorkerReady: "worker ready",
    stWorkerUnavailable: "worker unavailable",
    coin: "ETH",
    // /mine — packs
    packsTitle: "Packs 卡包",
    packsDesc:
      "Buy a bundle of cards — bigger packs get a bigger discount. Packs open on-chain and land in your wallet.",
    cards: "cards",
    buy: "Buy",
    packsFooter: "Opens on-chain — cards land in your wallet. Pity / pull-rate shown in the docs.",
    // /mine — wallet panel
    walletTitle: "Wallet",
    wallet: "Wallet",
    chain: "Chain",
    price: "Price",
    notConnected: "not connected",
    connectWallet: "Connect wallet",
    wcQr: "WalletConnect (QR)",
    switchChain: "Switch to Robinhood Chain",
    refresh: "Refresh",
    wrongNetwork: "Wrong network: connected to chain",
    expected: "Expected",
    switchAdd: "switch/add chain",
    // header language toggle
    langToZh: "中文",
    langToEn: "EN",
    langAriaToZh: "Switch to Chinese",
    langAriaToEn: "Switch to English",
  },
  zh: {
    mining: "挖矿中",
    more: "更多",
    connect: "连接钱包",
    connecting: "连接中…",
    myProfile: "我的主页",
    copyAddress: "复制地址",
    copied: "已复制",
    viewExplorer: "在区块浏览器查看",
    disconnect: "断开连接",
    heroKicker: "挖矿控制台 挖矿",
    heroTitle: "挖矿",
    heroSubtitle:
      "一键寻找有效 nonce 并自动铸造 —— 循环会持续运行（铸造 → 冷却 → 挖矿），即使在浏览其他标签页时也不会停止。",
    consoleKicker: "挖矿控制台",
    mintPrice: "铸造价格",
    minted: "已铸造",
    chips: "芯片",
    nextWave: "下一纪元",
    waveProgress: "纪元进度",
    collectionProgress: "系列进度",
    baseBits: "基础位数",
    cooldown: "冷却",
    chipDisc: "芯片折扣",
    hashes: "哈希次数",
    rate: "速率",
    elapsed: "耗时",
    bestBits: "最佳位数",
    powProgress: "PoW 进度",
    useChip: "使用芯片",
    paying: "支付",
    balance: "余额",
    serial: "编号",
    btnMine: "挖矿",
    btnStop: "停止",
    stReady: "就绪",
    stMinting: "铸造中…",
    stGrinding: "挖矿中…",
    stAuto: "自动 · 等待",
    stCheckingWorker: "检测挖矿程序…",
    stWorkerReady: "挖矿程序就绪",
    stWorkerUnavailable: "挖矿程序不可用",
    coin: "ETH",
    packsTitle: "卡包 卡包",
    packsDesc: "购买卡牌礼包 —— 礼包越大折扣越高。卡包在链上开启并直接进入你的钱包。",
    cards: "张卡",
    buy: "购买",
    packsFooter: "链上开启 —— 卡牌直接进入你的钱包。稀有度 / 出货率见文档。",
    walletTitle: "钱包",
    wallet: "钱包",
    chain: "网络",
    price: "价格",
    notConnected: "未连接",
    connectWallet: "连接钱包",
    wcQr: "WalletConnect（二维码）",
    switchChain: "切换到 Robinhood Chain",
    refresh: "刷新",
    wrongNetwork: "网络错误：当前连接到链",
    expected: "期望",
    switchAdd: "切换/添加网络",
    langToZh: "中文",
    langToEn: "EN",
    langAriaToZh: "切换到中文",
    langAriaToEn: "Switch to English",
  },
};
