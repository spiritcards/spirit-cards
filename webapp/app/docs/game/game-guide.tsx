import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { RH_CHAIN_ID } from "@/lib/rh-chain";
import { Panel } from "@/app/spirit/ui";

/**
 * Game Guide — bilingual (en/zh) walkthrough of the current Spirit Cards
 * mechanics, rendered by `/docs/game` (en) and `/zh/docs/game` (zh).
 *
 * All prose lives in the local `CONTENT` object below (both languages), so the
 * i18n dictionary (`lib/i18n/*`) is never touched. Presentational only — no
 * hooks, safe in both server and client trees.
 */

type Block =
  | { kind: "p"; text: string }
  | { kind: "sub"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "table"; head: string[]; rows: string[][] };

type Section = {
  id: string;
  kicker: string;
  title: string;
  blocks: Block[];
  note?: string;
};

type Guide = {
  back: string;
  heading: string;
  kicker: string;
  intro: string;
  toc: string;
  sections: Section[];
  footer: string;
};

const CONTENT: { en: Guide; zh: Guide } = {
  en: {
    back: "← Docs",
    heading: "Game Guide",
    kicker: "Game Guide",
    intro:
      "How Spirit Cards actually works — the five-node loop and the current mechanics of every node. The numbers below are the live defaults from the game's Config contract; they are gameplay parameters that the team (owner multi-sig) can retune, not financial promises.",
    toc: "On this page",
    sections: [
      {
        id: "world",
        kicker: "00 · The World",
        title: "What is Spirit Cards",
        blocks: [
          {
            kind: "p",
            text: "Spirit Cards is an on-chain world of elemental creatures. A card is not an abstract token but a spirit-character with an element, battle stats and a 'personality' — all derived deterministically from its on-chain seed. You don't buy a picture; you mine a creature.",
          },
          {
            kind: "p",
            text: "Each card is rendered from layered art derived from its seed, so the same token always looks identical in the app, in its metadata and in the explorer.",
          },
          {
            kind: "list",
            items: [
              "16 species in Season 1 — 8 universal (Emberback · Ripplefin · Mossroot · Cloudwhisk · Flashbound · Frostpuff · Quicksilver · Moonglimmer) and 8 dragons (Cindermaw · Tidecoil · Rootwaker · Zephyrcrest · Voltrush · Frostmane · Silvervein · Starwisp).",
              "6 rarity tiers: Common, Rare, Super Rare, Ultra Rare, Secret Rare and Prism (1-of-1). Rarity is read from the top bits of the seed and scales base HP / ATK / DEF.",
              "4 elements forming a rock–paper–scissors cycle: Ember › Stone › Gale › Tide › Ember.",
              "A finite supply — at most 8888 cards (maxSupply). Minting and burns only ever reduce what is left.",
            ],
          },
        ],
        note: "A fight's outcome is not guaranteed by stats alone — element, skill and per-battle variance all matter. See Battle.",
      },
      {
        id: "loop",
        kicker: "01 · The Loop",
        title: "The Loop",
        blocks: [
          {
            kind: "p",
            text: "The whole game is a five-node cycle you repeat hundreds of times. There are no hundred-page rule trees: the home screen is one big MINE button, and everything else is a clear section.",
          },
          {
            kind: "code",
            text: "挖 MINE  →  熔 MERGE  →  ⚔ BATTLE  →  押 STAKE  →  榜 POINTS  →  repeat",
          },
          {
            kind: "table",
            head: ["Node", "What you do", "What it feeds"],
            rows: [
              ["Mine", "Grind a nonce to mint a card (real proof-of-work).", "Cards + a chip + points."],
              ["Merge", "Burn 2 cards into 1 higher tier (evolution).", "Stronger cards; fewer cards in circulation."],
              ["Battle", "Duel another card for a stake.", "Wins, provenance, and rake into the pool."],
              ["Stake", "Lock a card in the vault for a term.", "A share of real fees; cards leave free circulation."],
              ["Points", "Every action accrues activity points.", "Leaderboard position and season standing."],
            ],
          },
          {
            kind: "p",
            text: "The nodes feed each other: weak cards become merge fuel, stronger cards fight better, winning cards are worth staking, and the pool share encourages another round. Every action also earns points.",
          },
        ],
      },
      {
        id: "mining",
        kicker: "02 · Mining",
        title: "Mining (PoW)",
        blocks: [
          {
            kind: "p",
            text: "You can't buy a card in a shop — you mine it. Mining here is real proof-of-work: your device searches nonces until a hash clears the difficulty threshold. The grind happens off-chain and is free; you only pay gas at the moment of mint.",
          },
          {
            kind: "code",
            text: "work = keccak256(chainId ‖ contract ‖ miner ‖ nonce)\nvalid ⟺ leadingZeroBits(work) ≥ requiredBits()",
          },
          {
            kind: "p",
            text: "leadingZeroBits is the count of leading zero bits in the hash. The SpiritCards contract enforces this rule, and the on-chain Mined event carries exactly the same work a CLI miner computes.",
          },
          {
            kind: "table",
            head: ["Difficulty", "Default", "Meaning"],
            rows: [
              ["baseBits", "20", "Starting difficulty (required leading-zero bits)"],
              ["bitsStepX100", "33", "+0.33 bit per price era"],
              ["requiredBits()", "baseBits + era × bitsStepX100 / 100", "Current threshold"],
            ],
          },
          {
            kind: "p",
            text: "Difficulty is fixed for the season and rises only alongside price eras — there is no 'difficulty ratchet', the fast-up / slow-down regulator that killed many earlier projects. Pace is set by the protocol (emission gate + price), not by a hashpower race, so a phone and a farm earn the same reward per card.",
          },
          {
            kind: "table",
            head: ["Rate limit", "Default", "Meaning"],
            rows: [
              ["mineCooldown", "45 s", "Pause between mints per wallet"],
              ["epochCap", "1000 cards", "Cards per epoch, network-wide"],
              ["epochLength", "3600 s (1 h)", "Epoch length → hourly network cap"],
            ],
          },
          {
            kind: "table",
            head: ["Price era", "Default", "Meaning"],
            rows: [
              ["eraPrice", "0.00037 ETH", "Starting price of an era"],
              ["priceStepBps", "2500", "+25% per era (soft, not ×2)"],
              ["eraSize", "1111 cards", "Cards per price era"],
              ["maxSupply", "8888", "Final, finite supply"],
            ],
          },
          {
            kind: "p",
            text: "With eraSize 1111 and maxSupply 8888 there are ≈8 price eras: the price walks from the first era up to a few dollars in the last one — a soft step, not a doubling.",
          },
          {
            kind: "p",
            text: "Chip (ERC-1155): a full-price mint grants one chip; using a chip takes −30% off your next mint and the chip is burned. A discounted mint only spends the chip and grants no new one.",
          },
        ],
        note: "All of these are Config knobs — the owner can retune difficulty, rate limits and prices without redeploying.",
      },
      {
        id: "merge",
        kicker: "03 · Merge",
        title: "Merge",
        blocks: [
          {
            kind: "p",
            text: "Merge is the reroll: two weak cards fuse into one stronger card. The world's supply shrinks (deflation), and junk that nobody would buy at mint price becomes a chance at rarity.",
          },
          {
            kind: "list",
            items: [
              "Pick two of your cards (neither may be staked).",
              "Pay a small merge fee.",
              "Both cards burn; one new card a tier higher is born (evolution).",
            ],
          },
          {
            kind: "p",
            text: "The child's seed is decided after inclusion, so you cannot pre-compute a winning pair before the transaction. base = max(rankA, rankB); the child is a weighted pick that can stay the same or, rarely, drop.",
          },
          {
            kind: "table",
            head: ["Parameter", "Default", "Meaning"],
            rows: [
              ["mergeFee", "0.00002 ETH", "Fee per merge"],
              ["mergeFailBps", "700", "7% chance of an empty merge"],
            ],
          },
        ],
        note: "If a merge comes up empty (dud), both cards burn and no new card appears — this is anti-arbitrage protection (it closes the '2×N is always worth less than N+1' loop). Set mergeFailBps = 0 to disable it. Invariants: you can't merge a card with itself, nor a card you don't own or that is staked; the operation is atomic.",
      },
      {
        id: "staking",
        kicker: "04 · Staking",
        title: "Staking (6 tiers)",
        blocks: [
          {
            kind: "p",
            text: "Staking is the card bank. You lock a card in the StakeVault for a chosen term and receive a share of the pool — a portion of the real fees the game actually collects. Longer locks carry more weight and therefore a bigger share.",
          },
          {
            kind: "table",
            head: ["Tier", "Lock", "Weight", "Multiplier"],
            rows: [
              ["t0", "flexible (0 days)", "1000", "×1"],
              ["t1", "7 days", "5000", "×5"],
              ["t2", "30 days", "10000", "×10"],
              ["t3", "90 days", "20000", "×20"],
              ["t4", "180 days", "30000", "×30"],
              ["t5", "365 days", "40000", "×40"],
            ],
          },
          {
            kind: "p",
            text: "t0 is flexible (withdraw any time); t1–t5 are hard locks — the card can't be withdrawn before the term ends. Weight sets what fraction of the pool a card receives relative to every other staked card.",
          },
          {
            kind: "p",
            text: "The pool is filled by project fees (a share of mint, merge and pack revenue) and external revenue (duel rake), then distributed proportional to weight inside the StakeVault (accRewardPerWeight). If no cards are staked, inflows accrue and go to the first staker. You can claim at any time without unstaking, and stakeBatch / claimBatch / unstakeBatch move many cards in one transaction.",
          },
          {
            kind: "p",
            text: "A staked card can still fight: it never leaves the vault — it is only locked for the duel (lockForBattle), dividends keep accruing, and no NFT approval is needed. If it loses its last life in battle, the vault itself burns it and settles any unclaimed rewards to the staker.",
          },
        ],
        note: "Honest warning: the pool is tied to real activity. No mints or turnover → no inflows → payouts fall, down to zero. This is a revenue-share of what the project actually earned, not 'interest on a deposit' and not a promise of return. No APY, no percentage returns and no payback dates are published or guaranteed.",
      },
      {
        id: "battle",
        kicker: "05 · Battle",
        title: "Battle",
        blocks: [
          {
            kind: "p",
            text: "Battle v2 is a staked duel-escrow. Two players each commit one card and an equal stake in ETH; the winner takes the pot minus a rake, and the loser loses one of the card's three lives. Fights are resolved deterministically on-chain, but the outcome is gambling — not simply 'the stronger card always wins'.",
          },
          {
            kind: "p",
            text: "Format: you create an open duel with a card + stake; an opponent accepts with their card + the same stake and the fight resolves in that same transaction; you can cancel your own open duel (card and stake return). You cannot accept your own duel. The pot is stake × 2.",
          },
          { kind: "sub", text: "Elements" },
          {
            kind: "table",
            head: ["#", "Element", "Beats", "Loses to"],
            rows: [
              ["0", "Ember", "Stone", "Tide"],
              ["1", "Stone", "Gale", "Ember"],
              ["2", "Gale", "Tide", "Stone"],
              ["3", "Tide", "Ember", "Gale"],
            ],
          },
          {
            kind: "p",
            text: "Cycle: Ember › Stone › Gale › Tide › Ember. The winning element deals +20% damage; the losing one deals −20% (typeAdvBps = 2000).",
          },
          { kind: "sub", text: "Skills" },
          {
            kind: "table",
            head: ["#", "Skill", "Effect"],
            rows: [
              ["0", "None", "No effect"],
              ["1", "Crit", "20% chance to deal ×2 damage"],
              ["2", "Shield", "Incoming damage −30%"],
              ["3", "Pierce", "Ignores the defender's DEF"],
              ["4", "Precision", "+15% damage, always"],
              ["5", "Vigor", "+20% maximum HP"],
            ],
          },
          {
            kind: "p",
            text: "A card's skill is derived from its seed (skill = (seed >> 208) % 6); the player doesn't control it.",
          },
          {
            kind: "p",
            text: "Every attack is multiplied by a random factor in ±40% (atkVarianceBps = 4000). Add ±20% from element plus the skill effects, and the result is genuine variance: roughly equal cards are close to a coin flip, and a card about 25% stronger wins ≈72% of fights — the underdog still wins ≈28%. A clearly stronger card wins almost always.",
          },
          {
            kind: "p",
            text: "Honest detail: the exact outcome also depends on the executing block's prevrandao, which the accepter does not know at signing time — so nobody can pick a guaranteed-winning moment. Because the fight is deterministic on-chain, anyone can replay the result off-chain from the card seeds, the stake and prevrandao.",
          },
          {
            kind: "p",
            text: "Lives: each card has 3 lives. The loser loses one life; the winner takes the pot minus rake and gains +1 on its win counter. A card with 0 lives burns (a real supply sink), and every card keeps a win/loss history as its provenance.",
          },
          {
            kind: "table",
            head: ["Share of rake", "Where it goes", "Parameter"],
            rows: [
              ["70%", "Treasury (team)", "remainder of rakeToPoolBps"],
              ["30%", "Staker pool", "rakeToPoolBps = 3000"],
            ],
          },
          {
            kind: "p",
            text: "The rake is 10% of the pot (pvpRakeBps = 1000). It is external revenue (not from mints), so duels feed the dividend pool. A duel is a zero-sum game between players plus the rake — not a pyramid.",
          },
        ],
        note: "Battle is a zero-sum gambling mechanic (plus rake): you can lose both money and cards. No income is guaranteed.",
      },
      {
        id: "packs",
        kicker: "06 · Packs",
        title: "Packs",
        blocks: [
          {
            kind: "p",
            text: "Packs are buying a bundle of cards at a discount. The Packs contract mints N real cards to the buyer — normal token ids, normal rarity, normal rights. Buying a pack bypasses PoW, the epoch cap and the cooldown, because that is the product.",
          },
          {
            kind: "table",
            head: ["Pack", "Size (cards)", "Discount"],
            rows: [
              ["0", "5", "3%"],
              ["1", "10", "6%"],
              ["2", "25", "12%"],
              ["3", "50", "20%"],
              ["4", "100", "30%"],
            ],
          },
          {
            kind: "p",
            text: "Pack price = size × (currentPrice() × 2) − volume discount (packPriceBps = 20000): a pack skips proof-of-work, so each card costs ×2 the mint price minus the size discount. Revenue flows through the same shared split as every other fee (pool 60 / referral 10 / treasury 30 / reserve 0). Each card comes out of the 8888 max supply with rarity derived from its seed.",
          },
          {
            kind: "p",
            text: "The contract keeps a pity counter for the buyer, and the public pull rates for rarities are disclosed on the dashboard.",
          },
        ],
        note: "A pack does not guarantee a specific card or a payback; a card's value is set by the market (secondary sales), not by the project. No income is guaranteed.",
      },
      {
        id: "points",
        kicker: "07 · Points",
        title: "Points",
        blocks: [
          {
            kind: "p",
            text: "Points are on-chain activity points plus a leaderboard. The game rewards activity — mining, merging, staking and PvP wins — and that competition is the retention engine.",
          },
          {
            kind: "table",
            head: ["Action", "Points (default)", "Parameter"],
            rows: [
              ["Mine", "1", "pointsMine"],
              ["Merge", "2", "pointsMerge"],
              ["Stake", "2", "pointsStake"],
              ["PvP win", "3", "pointsPvpWin"],
            ],
          },
          {
            kind: "p",
            text: "Points are credited by authorised modules (SpiritCards, StakeVault, Battle) through the Points contract and stored on-chain as points[address]; the leaderboard reads the same contract. Seasons are off-chain (by snapshot). The contract emits PointsAdded(user, amount, reason), so activity is verifiable.",
          },
        ],
        note: "Points have no monetary value and are not exchangeable for money — they are a gameplay metric. Season rewards are skins or unique items, not money. A new season resets only the leaderboard; your collection never rotates out of the game.",
      },
      {
        id: "economy",
        kicker: "08 · Economy",
        title: "Economy & Referral",
        blocks: [
          {
            kind: "p",
            text: "Spirit Cards is a game; its money layer is built on the real fees the project actually collects. There is no guaranteed yield and no 'deposit at interest'. Everything distributed is a share of collected fees.",
          },
          {
            kind: "table",
            head: ["Source", "What it is"],
            rows: [
              ["Mint", "Payment to mine a card (eraPrice by price era)"],
              ["Merge", "The merge fee"],
              ["Packs", "Pack revenue (discounted)"],
              ["PvP rake", "10% of each duel pot — external revenue"],
              ["Royalty", "5% of secondary sales (ERC-2981) → treasury"],
            ],
          },
          {
            kind: "table",
            head: ["Share", "Where it goes", "Parameter"],
            rows: [
              ["60%", "Pool (staker dividends)", "poolBps = 6000"],
              ["10%", "Referral fund", "referralBps = 1000"],
              ["30%", "Treasury (team)", "houseBps = 3000"],
              ["0%", "Reserve", "reserveBps = 0"],
            ],
          },
          {
            kind: "p",
            text: "Every project fee is split by these fixed shares (they can be retuned via setSplit, but must always sum to 100%). Royalties (5%, ERC-2981) go to the treasury, not the pool, and come from secondary sales on OpenSea.",
          },
          {
            kind: "p",
            text: "Referral: an invite is a percentage of the invitee's activity, not of their deposit. A player sets a referrer once, and the referrer must have mined at least once. From the 10% referral fund, 3% of the gross payment goes to the master referrer (a fixed top-level referrer for every payer) and 7% goes to the payer's own referrer. If a payer has no referrer, that 7% stays in the undistributed fund. Amounts credited to referrers are protected and cannot be withdrawn by the owner as 'leftover'.",
          },
          {
            kind: "p",
            text: "The pool is filled by: 60% of mint fees, 60% of merge fees, 60% of pack revenue, 30% of the duel rake, and (planned) external sponsorship. Royalties do not go to the pool. A permissionless pumpPool() moves the accumulated pool into the StakeVault as dividends — anyone can call it, and the funds always go to the vault, never to the caller.",
          },
        ],
        note: "Honest math: the pool share is tied to activity — no fees means no inflows and payouts fall to zero. There are no APY figures, no percentage returns and no payback dates. There is no 'interest on a deposit' — referral is paid on activity only, and there is no manual floor-push or wash volume.",
      },
      {
        id: "chain",
        kicker: "09 · Chain",
        title: "Chain & Contracts",
        blocks: [
          {
            kind: "p",
            text: `Spirit Cards deploys on Robinhood Chain, an Arbitrum Orbit L2, with gas paid in ETH. chainId ${RH_CHAIN_ID}.`,
          },
          {
            kind: "p",
            text: "The core contracts are Config, SpiritCards, ChipToken (ERC-1155 chip), StakeVault, Battle, Points and Packs. Ownership moves to a multi-signature Safe (and later a timelock); every economic parameter is a Config knob, changeable without redeployment.",
          },
          {
            kind: "p",
            text: "Trading happens on OpenSea, the marketplace native to the chain. There is no ERC-20 token and no LP — the project does not use Uniswap.",
          },
        ],
        note: "Contract addresses are maintained in the frontend's canonical source (webapp/lib/canonical.ts) and on the project's public docs, updated whenever the stack is redeployed. We deliberately do not hard-code addresses in this guide, since they change.",
      },
    ],
    footer:
      "Spirit Cards is a game. Points have no monetary value. Nothing here is financial advice, and nothing here promises a return — the pool is a revenue-share of real fees the game actually earns, with no guarantees.",
  },
  zh: {
    back: "← 文档",
    heading: "游戏指南",
    kicker: "游戏指南",
    intro:
      "Spirit Cards 到底怎么玩——五个节点的循环，以及每个节点当前的机制。下面的数字是游戏 Config 合约里的即时默认值；它们是玩法参数，可能由团队（所有者多签）重新调整，并非财务承诺。",
    toc: "本页内容",
    sections: [
      {
        id: "world",
        kicker: "00 · 世界",
        title: "什么是 Spirit Cards",
        blocks: [
          {
            kind: "p",
            text: "Spirit Cards 是一个由元素生物构成的链上世界。一张卡不是抽象的代币，而是带有元素、战斗属性和“性格”的精灵角色——全部由其链上种子（seed）确定性地推导而来。你不是在买一张图，而是在挖出一只生物。",
          },
          {
            kind: "p",
            text: "每张卡都由其种子生成的分层素材渲染，因此同一个代币在应用、元数据和区块浏览器里永远长得一模一样。",
          },
          {
            kind: "list",
            items: [
              "第一赛季 16 个物种——8 个通用（Emberback · Ripplefin · Mossroot · Cloudwhisk · Flashbound · Frostpuff · Quicksilver · Moonglimmer）与 8 条龙（Cindermaw · Tidecoil · Rootwaker · Zephyrcrest · Voltrush · Frostmane · Silvervein · Starwisp）。",
              "6 个稀有度档位：普通、稀有、超稀有、极稀有、秘密稀有，以及棱镜（1-of-1）。稀有度取自种子的高位，并放大基础 HP / ATK / DEF。",
              "4 种元素，构成“石头-剪刀-布”循环：余烬 › 磐石 › 疾风 › 潮汐 › 余烬。",
              "有限供应——最多 8888 张卡（maxSupply）。铸造与销毁只会让剩余的越来越少。",
            ],
          },
        ],
        note: "战斗结果并非仅由属性决定——元素、技能和每场对战内的随机浮动都起作用。详见“对战”。",
      },
      {
        id: "loop",
        kicker: "01 · 循环",
        title: "游戏循环",
        blocks: [
          {
            kind: "p",
            text: "整个游戏就是五个节点反复循环上百次。没有几百页的规则树：主页就是一个大大的 MINE 按钮，其余都是清晰的板块。",
          },
          {
            kind: "code",
            text: "挖 MINE  →  熔 MERGE  →  ⚔ BATTLE  →  押 STAKE  →  榜 POINTS  →  重复",
          },
          {
            kind: "table",
            head: ["节点", "你做什么", "它带来什么"],
            rows: [
              ["挖矿", "不断尝试 nonce 以铸造一张卡（真正的工作量证明）。", "卡牌 + 一枚筹码 + 积分。"],
              ["熔炼", "将 2 张卡烧成 1 张更高档位的卡（进化）。", "更强的卡；流通中的卡更少。"],
              ["对战", "用一张卡下注并与其他卡决斗。", "胜负、履历，以及进入资金池的抽成。"],
              ["质押", "把卡锁进金库一段时间。", "真实手续费的一份份额；卡离开自由流通。"],
              ["积分", "每个动作都会累积活跃积分。", "排行榜名次与赛季排位。"],
            ],
          },
          {
            kind: "p",
            text: "各节点互相供给：弱卡变成熔炼燃料，更强的卡打得更好，赢过的卡值得质押，而资金池的份额又鼓励你再玩一轮。每个动作也会累积积分。",
          },
        ],
      },
      {
        id: "mining",
        kicker: "02 · 挖矿",
        title: "挖矿（PoW）",
        blocks: [
          {
            kind: "p",
            text: "卡不能在商店里买到——你得挖出来。这里的挖矿是真正的工作量证明：你的设备不断尝试 nonce，直到某个哈希越过难度阈值。计算在链下进行且免费；只有铸造那一刻才付 gas。",
          },
          {
            kind: "code",
            text: "work = keccak256(chainId ‖ contract ‖ miner ‖ nonce)\n有效 ⟺ leadingZeroBits(work) ≥ requiredBits()",
          },
          {
            kind: "p",
            text: "leadingZeroBits 是哈希中前导零位的数量。合约 SpiritCards 校验这条规则；链上 Mined 事件携带的 work 与 CLI 矿工计算出的完全一致。",
          },
          {
            kind: "table",
            head: ["难度", "默认值", "含义"],
            rows: [
              ["baseBits", "20", "起始难度（所需前导零位）"],
              ["bitsStepX100", "33", "每个价格纪元 +0.33 位"],
              ["requiredBits()", "baseBits + era × bitsStepX100 / 100", "当前阈值"],
            ],
          },
          {
            kind: "p",
            text: "难度按赛季固定，只随价格纪元上升——这里没有“难度棘轮”（只快升几乎不降的调节器，它曾杀死很多早期项目）。节奏由协议决定（发行闸门 + 价格），而不是算力竞赛，所以手机和矿机每张卡的奖励完全一样。",
          },
          {
            kind: "table",
            head: ["限速", "默认值", "含义"],
            rows: [
              ["mineCooldown", "45 秒", "每个钱包两次铸造之间的间隔"],
              ["epochCap", "1000 张", "每个纪元的全网卡数上限"],
              ["epochLength", "3600 秒（1 小时）", "纪元长度 → 每小时全网上限"],
            ],
          },
          {
            kind: "table",
            head: ["价格纪元", "默认值", "含义"],
            rows: [
              ["eraPrice", "0.00037 ETH", "一个纪元的起始价格"],
              ["priceStepBps", "2500", "每个纪元 +25%（温和，非 ×2）"],
              ["eraSize", "1111 张", "每个价格纪元的卡数"],
              ["maxSupply", "8888", "最终、有限的供应"],
            ],
          },
          {
            kind: "p",
            text: "当 eraSize = 1111、maxSupply = 8888 时约有 8 个价格纪元：价格从第一个纪元一步步走到最后一个纪元的几美元——温和台阶，而非翻倍。",
          },
          {
            kind: "p",
            text: "筹码（ERC-1155）：按全价铸造会得到一枚筹码；使用筹码会让下一次铸造 −30%，筹码随即被烧毁。打折铸造只消耗筹码，不再发放新的筹码。",
          },
        ],
        note: "这些都是 Config 的参数——所有者无需重新部署即可调整难度、限速和价格。",
      },
      {
        id: "merge",
        kicker: "03 · 熔炼",
        title: "熔炼（Merge）",
        blocks: [
          {
            kind: "p",
            text: "熔炼就是“重掷”：两张弱卡融合成一张更强的卡。世界的供应因此收缩（通缩），而以铸造价没人会买的“垃圾”则变成搏一次稀有度的机会。",
          },
          {
            kind: "list",
            items: [
              "选择你自己的两张卡（两张都不能处于质押中）。",
              "支付一笔很小的熔炼费。",
              "两张卡都被烧毁，诞生一张高一档位的新卡（进化）。",
            ],
          },
          {
            kind: "p",
            text: "子卡的种子在交易打包后才确定，所以无法在交易前预先算出必胜的一对。base = max(rankA, rankB)；子卡是加权抽取，可能原地不变，偶尔还会掉档。",
          },
          {
            kind: "table",
            head: ["参数", "默认值", "含义"],
            rows: [
              ["mergeFee", "0.00002 ETH", "每次熔炼的费用"],
              ["mergeFailBps", "700", "7% 的空熔炼概率"],
            ],
          },
        ],
        note: "如果熔炼落空（dud），两张卡都烧掉且不产生新卡——这是防套利保护（堵住“2×N 总是比 N+1 划算”的循环）。将 mergeFailBps 设为 0 即可关闭。不变量：不能把卡与自身熔炼，也不能熔炼不属于你或处于质押中的卡；操作是原子的。",
      },
      {
        id: "staking",
        kicker: "04 · 质押",
        title: "质押（6 个档位）",
        blocks: [
          {
            kind: "p",
            text: "质押就是卡的银行。你把一张卡锁进 StakeVault 一段时间，并获得资金池的一份份额——即游戏真实收取的手续费中的一部分。锁得越久权重越高，份额也就越大。",
          },
          {
            kind: "table",
            head: ["档位", "锁定期", "权重", "倍数"],
            rows: [
              ["t0", "灵活（0 天）", "1000", "×1"],
              ["t1", "7 天", "5000", "×5"],
              ["t2", "30 天", "10000", "×10"],
              ["t3", "90 天", "20000", "×20"],
              ["t4", "180 天", "30000", "×30"],
              ["t5", "365 天", "40000", "×40"],
            ],
          },
          {
            kind: "p",
            text: "t0 灵活（随时可取）；t1–t5 是硬锁定——到期前不能取回卡。权重决定了这张卡相对于其他所有质押卡能分到资金池的多大比例。",
          },
          {
            kind: "p",
            text: "资金池由项目手续费（铸造、熔炼、卡包收入的一部分）和外部收入（对战抽成）填充，随后在 StakeVault 内按权重比例分配（accRewardPerWeight）。若没有任何卡被质押，流入会累积，归第一个质押者。你可以随时领取奖励而无需解除质押，且 stakeBatch / claimBatch / unstakeBatch 可用一笔交易移动多张卡。",
          },
          {
            kind: "p",
            text: "已质押的卡依然可以战斗：它不会离开金库——只在决斗期间被锁定（lockForBattle），分红继续累积，也无需 NFT 授权。如果它在战斗中失去最后一条命，金库会亲自烧掉它，并把未领取的奖励结算给质押者。",
          },
        ],
        note: "诚实提醒：资金池与真实活跃度挂钩。没有铸造或交易量 → 没有流入 → 支付下降，直至为零。这是项目真实赚取部分的收入分成，不是“存款利息”，也不是回报承诺。我们不发布、也不保证任何 APY、收益率或回本期限。",
      },
      {
        id: "battle",
        kicker: "05 · 对战",
        title: "对战",
        blocks: [
          {
            kind: "p",
            text: "对战 v2 是一种带押注的托管决斗。两名玩家各自提交一张卡和等额的 ETH 押注；赢家拿走奖池减去抽成，输家失去卡的三条命之一。对战在链上确定性地结算，但结果是一场概率游戏——并不是“谁更强谁就赢”。",
          },
          {
            kind: "p",
            text: "流程：你用一张卡 + 押注发起一场公开决斗；对手用他的卡 + 相同押注接受，决斗在同一笔交易里结算；你可以取消自己发起的公开决斗（卡与押注退回）。你不能接受自己的决斗。奖池 = 押注 × 2。",
          },
          { kind: "sub", text: "元素" },
          {
            kind: "table",
            head: ["#", "元素", "克制", "被克"],
            rows: [
              ["0", "余烬", "磐石", "潮汐"],
              ["1", "磐石", "疾风", "余烬"],
              ["2", "疾风", "潮汐", "磐石"],
              ["3", "潮汐", "余烬", "疾风"],
            ],
          },
          {
            kind: "p",
            text: "循环：余烬 › 磐石 › 疾风 › 潮汐 › 余烬。占优元素造成 +20% 伤害，劣势元素造成 −20%（typeAdvBps = 2000）。",
          },
          { kind: "sub", text: "技能" },
          {
            kind: "table",
            head: ["#", "技能", "效果"],
            rows: [
              ["0", "无", "无效果"],
              ["1", "暴击", "20% 概率造成 ×2 伤害"],
              ["2", "护盾", "受到的伤害 −30%"],
              ["3", "穿刺", "无视防守方的 DEF"],
              ["4", "精准", "始终 +15% 伤害"],
              ["5", "坚韧", "最大 HP +20%"],
            ],
          },
          {
            kind: "p",
            text: "卡片的技能由其种子决定（skill = (seed >> 208) % 6），玩家无法左右。",
          },
          {
            kind: "p",
            text: "每次攻击都会乘以 ±40% 的随机系数（atkVarianceBps = 4000）。再加上元素 ±20% 与技能效果，结果就是真正的波动：实力相当的两张卡几乎等于抛硬币，而强约 25% 的卡胜率约 72%——弱者仍有约 28% 的机会赢。明显更强的卡几乎总能赢。",
          },
          {
            kind: "p",
            text: "诚实说明：确切结果还取决于执行区块的 prevrandao，而接受者在签名时并不知道它——所以没人能挑到一个必胜的时刻。由于对战在链上是确定性的，任何人都能用卡种子、押注和 prevrandao 在链下复现结果。",
          },
          {
            kind: "p",
            text: "生命：每张卡有 3 条命。输家失去一条命；赢家拿走奖池减去抽成，并在胜场计数 +1。0 条命的卡会被烧毁（真实的供应消耗），每张卡都会保留胜负履历，作为它的来历。",
          },
          {
            kind: "table",
            head: ["抽成占比", "去向", "参数"],
            rows: [
              ["70%", "国库（团队）", "rakeToPoolBps 的剩余部分"],
              ["30%", "质押资金池", "rakeToPoolBps = 3000"],
            ],
          },
          {
            kind: "p",
            text: "抽成为奖池的 10%（pvpRakeBps = 1000），属于外部收入（并非来自铸造），所以决斗会滋养分红池。决斗是玩家之间的零和博弈外加抽成——不是金字塔。",
          },
        ],
        note: "对战是零和（加抽成）的概率机制：你可能既输掉钱也可能输掉卡。不保证任何收益。",
      },
      {
        id: "packs",
        kicker: "06 · 卡包",
        title: "卡包",
        blocks: [
          {
            kind: "p",
            text: "卡包就是以折扣购买一组卡。Packs 合约会为买家铸造 N 张真实的卡——普通 token id、普通稀有度、普通权利。购买卡包会跳过 PoW、纪元上限和冷却，因为这正是这个产品的定义。",
          },
          {
            kind: "table",
            head: ["卡包", "数量（张）", "折扣"],
            rows: [
              ["0", "5", "3%"],
              ["1", "10", "6%"],
              ["2", "25", "12%"],
              ["3", "50", "20%"],
              ["4", "100", "30%"],
            ],
          },
          {
            kind: "p",
            text: "卡包价格 = 数量 ×（currentPrice() × 2）− 体量折扣（`packPriceBps = 20000`）：买包跳过 PoW，单价为矿价的 2 倍，减去随尺寸递增的折扣。收入走与其他手续费相同的通用分成（资金池 60 / 推荐 10 / 国库 30 / 储备 0）。每张卡都从 8888 的总供应中产出，稀有度由其种子推导。",
          },
          {
            kind: "p",
            text: "合约为买家维护一个保底（pity）计数器，各稀有度的公开掉率会在仪表盘上披露。",
          },
        ],
        note: "卡包不保证特定卡片，也不保证回本；卡的价值由市场（二级交易）决定，而非项目。不保证任何收益。",
      },
      {
        id: "points",
        kicker: "07 · 积分",
        title: "积分",
        blocks: [
          {
            kind: "p",
            text: "积分是链上的活跃度积分加上排行榜。游戏奖励活跃——挖矿、熔炼、质押和对战胜利——这种竞争正是留存引擎。",
          },
          {
            kind: "table",
            head: ["动作", "积分（默认）", "参数"],
            rows: [
              ["挖矿", "1", "pointsMine"],
              ["熔炼", "2", "pointsMerge"],
              ["质押", "2", "pointsStake"],
              ["对战胜利", "3", "pointsPvpWin"],
            ],
          },
          {
            kind: "p",
            text: "积分由获授权的模块（SpiritCards、StakeVault、Battle）通过 Points 合约发放，并链上存储为 points[address]；排行榜读取同一合约。赛季是链下的（按快照）。合约会发出 PointsAdded(user, amount, reason) 事件，因此活跃度可验证。",
          },
        ],
        note: "积分没有货币价值，也不能兑换成钱——它只是游戏内指标。赛季奖励是皮肤或独特物品，不是钱。新赛季只重置排行榜；你的收藏永远不会被轮换出游戏。",
      },
      {
        id: "economy",
        kicker: "08 · 经济",
        title: "经济与推荐",
        blocks: [
          {
            kind: "p",
            text: "Spirit Cards 是一款游戏；它的资金层建立在项目真实收取的手续费之上。这里没有保证收益，也没有“存款生息”。所有分配出去的都是已收取手续费的一部分。",
          },
          {
            kind: "table",
            head: ["来源", "是什么"],
            rows: [
              ["铸造", "挖掘一张卡的付费（按价格纪元的 eraPrice）"],
              ["熔炼", "熔炼费"],
              ["卡包", "卡包收入（已打折）"],
              ["对战抽成", "每场决斗奖池的 10%——外部收入"],
              ["版税", "二级销售的 5%（ERC-2981）→ 国库"],
            ],
          },
          {
            kind: "table",
            head: ["占比", "去向", "参数"],
            rows: [
              ["60%", "资金池（质押者分红）", "poolBps = 6000"],
              ["10%", "推荐基金", "referralBps = 1000"],
              ["30%", "国库（团队）", "houseBps = 3000"],
              ["0%", "储备", "reserveBps = 0"],
            ],
          },
          {
            kind: "p",
            text: "每笔项目手续费都按这些固定比例拆分（可通过 setSplit 调整，但必须始终合计 100%）。版税（5%，ERC-2981）进入国库而非资金池，来自 OpenSea 上的二级销售。",
          },
          {
            kind: "p",
            text: "推荐：邀请是被邀请者“活动”的百分比，而不是其“存款”的百分比。玩家只能设置一次推荐人，且推荐人自己至少挖过一次矿。在 10% 的推荐基金中，毛支付的 3% 给主推荐人（对每个付款者固定的顶层推荐人），7% 给付款者自己的推荐人。若付款者没有推荐人，这 7% 留在未分配基金中。已记入推荐人的金额受保护，所有者不能以“剩余”名义提取。",
          },
          {
            kind: "p",
            text: "资金池由以下填充：铸造费的 60%、熔炼费的 60%、卡包收入的 60%、对战抽成的 30%，以及（计划中的）外部赞助。版税不进资金池。一个无需许可的 pumpPool() 会把累积的资金池作为分红注入 StakeVault——任何人都能调用，资金永远进入金库，绝不进入调用者。",
          },
        ],
        note: "诚实的算术：资金池份额与活跃度挂钩——没有手续费就没有流入，支付会降到零。没有 APY 数字、没有收益率、没有回本期限。没有“存款利息”——推荐只在活动上支付，也没有手动托底或刷量。",
      },
      {
        id: "chain",
        kicker: "09 · 链",
        title: "链与合约",
        blocks: [
          {
            kind: "p",
            text: `Spirit Cards 部署在 Robinhood Chain 上，这是一条 Arbitrum Orbit L2，gas 用 ETH 支付。chainId ${RH_CHAIN_ID}。`,
          },
          {
            kind: "p",
            text: "核心合约有 Config、SpiritCards、ChipToken（ERC-1155 筹码）、StakeVault、Battle、Points 和 Packs。所有权会移交给多签 Safe（之后再加时间锁）；所有经济参数都是 Config 的参数，无需重新部署即可更改。",
          },
          {
            kind: "p",
            text: "交易发生在 OpenSea 上，这是该链原生的市场。没有 ERC-20 代币，也没有 LP——项目不使用 Uniswap。",
          },
        ],
        note: "合约地址维护在前端的规范来源（webapp/lib/canonical.ts）和项目公开文档中，每当整套合约重新部署时都会更新。我们有意不把地址硬编码进本指南，因为它们会变。",
      },
    ],
    footer:
      "Spirit Cards 是一款游戏。积分没有货币价值。本文不构成任何财务建议，也不承诺任何回报——资金池是游戏真实赚取手续费的收入分成，且不作任何保证。",
  },
};

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((cell) => (
              <th
                key={cell}
                className="border border-slate/60 bg-basalt/60 px-3 py-2 text-left font-code text-[10px] uppercase tracking-[0.12em] text-ash"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border border-slate/60 px-3 py-2 align-top text-bone/90"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "p":
            return (
              <p key={i} className="mt-2 text-sm leading-relaxed text-ash">
                {block.text}
              </p>
            );
          case "sub":
            return (
              <h3
                key={i}
                className="mt-4 font-display text-xs font-bold uppercase tracking-[0.12em] text-ember"
              >
                {block.text}
              </h3>
            );
          case "list":
            return (
              <ul key={i} className="mt-2 space-y-1.5">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-bone/90">
                    <span className="text-ember" aria-hidden="true">
                      ▸
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre
                key={i}
                className="mt-2 overflow-x-auto border border-slate/60 bg-obsidian/60 p-3 font-code text-xs leading-relaxed text-bone/90"
              >
                {block.text}
              </pre>
            );
          case "table":
            return <Table key={i} head={block.head} rows={block.rows} />;
          default:
            return null;
        }
      })}
    </>
  );
}

export function GameGuide({ locale }: { locale: Locale }) {
  const t = CONTENT[locale];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <Link
        href="/docs"
        className="font-code text-[11px] uppercase tracking-[0.14em] text-ash transition-colors hover:text-bone"
      >
        {t.back}
      </Link>

      <div className="mb-3 mt-3">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-bone sm:text-4xl">
          {t.heading}
        </h1>
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-ash">{t.intro}</p>

      <Panel kicker={t.toc} className="mt-4">
        <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {t.sections.map((section, i) => (
            <li key={section.id} className="flex gap-2 text-sm text-bone/90">
              <span className="font-code text-[11px] text-ember">
                {String(i).padStart(2, "0")}
              </span>
              <a href={`#${section.id}`} className="transition-colors hover:text-ember">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="mt-4 space-y-4">
        {t.sections.map((section) => (
          <Panel key={section.id} kicker={section.kicker}>
            <h2
              id={section.id}
              className="scroll-mt-6 font-display text-lg font-bold uppercase tracking-wide text-bone"
            >
              {section.title}
            </h2>
            <Blocks blocks={section.blocks} />
            {section.note ? (
              <p className="mt-3 border-l-2 border-ember/60 bg-ember/5 px-3 py-2 text-xs leading-relaxed text-ash">
                <span className="text-ember" aria-hidden="true">
                  ⚠{" "}
                </span>
                {section.note}
              </p>
            ) : null}
          </Panel>
        ))}
      </div>

      <p className="mt-5 text-xs text-ash">{t.footer}</p>
    </main>
  );
}
