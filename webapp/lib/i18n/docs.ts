/**
 * Docs pages strings (/docs, /docs/verification, /docs/stats,
 * /docs/agent-access). EN values must stay byte-identical to the original
 * literals; zh holds the Simplified-Chinese translations.
 *
 * Organised per page (index / verification / stats / agentAccess) plus a small
 * `common` group for labels shared by several pages (section links, footers).
 * Dynamic values (addresses, chainIds, numbers, URLs, code/commands, monospace
 * identifiers) are intentionally NOT stored here — they stay in the JSX.
 */
export const docs = {
  en: {
    common: {
      backDocs: "← Docs",
      collection: "Collection",
      related: "Related: ",
      officialLinks: "Official links: ",
      linkAgentAccess: "Agent access",
      linkVerification: "Verification",
      linkStatsDataset: "Stats dataset",
      linkLiveStats: "Live stats",
      linkDocsIndex: "Docs index",
      gitbook: "GitBook",
    },
    index: {
      back: "← Back to collection",
      heading: "Documentation",
      introBefore:
        "Spirit Cards is a proof-of-work minted NFT collection on Robinhood Chain (chainId ",
      introAfter:
        "). These pages document the agent-facing surfaces of the project: how to integrate, how the proof of work is verified, and how to read the published statistics. Every page here is static, server-rendered HTML and works without JavaScript.",
      pages: {
        agentAccess: {
          title: "Agent access",
          summary: "How AI agents and developers integrate with the collection.",
          points: [
            "Read-only JSON, markdown and service-discovery endpoints (OpenAPI, llms.txt, .well-known/ai.json).",
            "OpenAPI, /.well-known/ai.json, llms.txt and llms-full.txt.",
            "Client config examples for Claude Desktop, Cursor and VS Code, plus copy-paste curl checks.",
            "Read-only and anonymous: no API keys, no accounts, no wallet.",
          ],
        },
        verification: {
          title: "Verification (proof of work)",
          summary: "The exact keccak proof-of-work math behind every mint.",
          points: [
            "The 104-byte preimage layout and the leading-zero-bit validity rule.",
            "The difficulty formula: a base-bit threshold plus a small step per price era.",
            "A worked example with a real nonce and its winning hash.",
            "How to re-verify a nonce against Config.baseBits(), and why rarity is deterministic.",
          ],
        },
        stats: {
          title: "Stats dataset",
          summary: "Machine-readable snapshots of the collection.",
          points: [
            "JSON schema of /stats/current.json and /stats/history.jsonl.",
            "Units (ETH price, bits) and methodology (live contract reads, cache, updatedAt).",
            "How to cite the data and the expected update cadence.",
          ],
        },
        claim: {
          title: "Packs (coming soon)",
          summary: "Card packs are coming soon to Spirit Cards.",
          points: [
            "Packs are not live yet; this surface is a placeholder.",
            "While we build them out, mine, merge, stake and battle cards.",
            "Pack price will be size × (currentPrice() × 2) − volume discount.",
            "Every card comes out of the finite 8,888 max supply, with rarity derived from its seed.",
          ],
        },
        points: {
          title: "House Points (Season 1)",
          summary:
            "Points for mining, merging, staking and PvP wins — and the leaderboard.",
          points: [
            "Rules: mine +1, merge +2, stake +2, PvP win +3.",
            "Points are derived from public on-chain events; anyone can recompute them via /api/points.",
            "Points have no monetary value; they track on-chain activity only.",
            "Machine-readable: GET /api/points (add ?address=0x… for a single wallet).",
          ],
        },
        agents: {
          title: "Agent registry & leaderboard",
          summary:
            "AI agents of the House — registered wallets ranked by on-chain activity.",
          points: [
            "Agents are ordinary wallets; register self-serve with a wallet signature via POST /api/points/register.",
            "Ranking is purely on-chain activity (House Points); no boosts are sold.",
            "Machine-readable: GET /api/points returns the registry and the leaderboard.",
          ],
        },
        crafting: {
          title: "Merging (2→1)",
          summary:
            "Burn two owned Cards into one — mergeBurn, a deflationary evolution.",
          points: [
            "mergeBurn(a, b) payable; msg.value must equal Config.mergeFee(). Both parents are burned and one child is forged in the same transaction.",
            "The child's rarity and traits are derived deterministically from its new on-chain seed.",
            "Staking tiers 0..5 (lock 0/7/30/90/180/365 days) grant a PoW milli-bits discount; staking is a hard lock with no early exit — only tier 0 (flexible) can be unstaked any time.",
            "Read surfaces for agents: /docs/agent-access.",
          ],
        },
      },
      readLink: (title: string) => `Read ${title} →`,
      machineHeading: "Machine-readable surface",
      machineIntro:
        "Stable URLs an agent can fetch directly. All are read-only and require no authentication.",
      machineReadable: {
        openapi: "OpenAPI 3.0 spec for the metadata and image endpoints.",
        aiJson: "Service discovery: endpoints, contract facts and read surfaces.",
        llmsTxt: "llms.txt v2 map of the site for language models.",
        llmsFull: "Complete agent-readable documentation in one text file.",
        meta: "OpenSea-compatible metadata JSON for a minted token (example: token 1).",
        statsCurrent: "Latest machine-readable snapshot of the collection.",
        points:
          "House Points (Season 1) dataset — derived from on-chain events, recomputable.",
        agents: "Registered agents and their on-chain activity leaderboard.",
      },
      fullHeading: "Full documentation",
      fullIntro:
        "Longer-form, human-oriented documentation lives in GitBook; the plain-text mirror below is generated for agents.",
      gitbookLink: "GitBook — Spirit Cards",
      gitbookNote: "(concepts, mechanics, art, roadmap)",
      llmsFullNote: "(complete reference: contract, mechanics, economics, API)",
      llmsTxtNote: "(index / map)",
      contractLabel: "Contract: ",
      explorerLabel: ". Explorer: ",
      explorerLink: "explorer",
      liveSuffix: ". This is the live collection contract.",
      freeClaimCodes: ". Free claim codes: ",
      freeClaimEnd: ".",
    },
    stats: {
      heading: "Stats dataset",
      introBefore:
        "Spirit Cards publishes machine-readable statistics generated from live on-chain reads. The data is served as static, server-rendered resources that work without JavaScript or a wallet, so an agent can fetch and cite concrete numbers instead of scraping. Reference contract:",
      introAfter: ".",
      h2_1: "1. Endpoints",
      endpoints: {
        stats: "Human and agent readable HTML view (server-rendered, no JavaScript).",
        current: "A single object — the latest live snapshot.",
        history: "JSON Lines — one snapshot per line, append-only, chronological.",
      },
      endpointsNoteA: "The HTML page at ",
      endpointsNoteB: " is the human view (it also carries a ",
      endpointsNoteC:
        " JSON-LD block); the two JSON resources are the machine contract described below.",
      h2_2: "2. /stats/current.json",
      currentIntro:
        "A single JSON object: the most recent snapshot, a direct read of the contract. Example (values illustrative):",
      thField: "Field",
      thType: "Type",
      thUnitsMeaning: "Units / meaning",
      current: {
        domain: "snapshot schema id: spiritcards.fun/stats/1",
        updatedAt: "ISO-8601 UTC, time of the on-chain reads",
        contract: "0x address used for the reads",
        site: "canonical site URL",
        totalMinted: "cards minted",
        maxSupply: "final supply cap (8,888)",
        currentPriceEth: 'current mint price in ETH; "0" means free',
        baseBits: "bits (base difficulty)",
        mineCooldownSeconds: "seconds between mints per wallet",
        mergeFeeEth: "merge fee in ETH",
        burned: "cards burned by merging",
        forged: "cards forged by merging",
        paused: "mint pause flag",
      },
      unitsLineA:
        "Units in one line: ETH is the native gas token with 18 decimals, so the underlying on-chain prices are ",
      unitsLineB:
        " values in wei (1 ETH = 1e18); the snapshot exposes them already scaled as decimal strings in ",
      unitsLineC: " and ",
      unitsLineD: ' ("0" means free). ',
      unitsLineE: " is a leading-zero-bit difficulty.",
      h2_3: "3. /stats/history.jsonl",
      histA:
        "A JSON Lines file: one compact JSON object per line, no surrounding array, no commas between lines. Each line is a lightweight snapshot (a subset of ",
      histB: ", with ",
      histC: " instead of ",
      histD: "), appended oldest first:",
      history: {
        ts: "ISO-8601 UTC timestamp of the snapshot",
        totalMinted: "cards minted",
        currentPriceEth: "decimal ETH price",
        baseBits: "bits (base difficulty)",
      },
      histLi1:
        "Append-only and chronological (oldest first); the last line is the most recent recorded state.",
      histLi2:
        "Parse line by line (streaming); ignore blank lines. Do not assume a key exists in every line — the shape is a stable subset and may grow additively.",
      histLi3:
        "The line count equals the number of recorded changes, not the number of mints (see the cadence note below).",
      h2_4: "4. Methodology",
      methodSourceLabel: "Source.",
      methodSourceA:
        " Every value is read directly from the deployed contract on Robinhood Chain over RPC via viem (",
      methodSourceB: "). There is no indexer and no database behind the numbers.",
      methodReadsLabel: "Reads.",
      methodReadsA: " Core views (",
      methodReadsB: "), plus ",
      methodReadsC: " and ",
      methodReadsD:
        " for the burn and merge counters; the chain id comes from the build env.",
      methodCacheLabel: "Cache and freshness.",
      methodCacheA: " ",
      methodCacheB: " is generated with a short cache (about 60 seconds; ",
      methodCacheC: ") and always carries ",
      methodCacheD: ", the timestamp of the reads. Treat ",
      methodCacheE:
        " as authoritative and do not cache the file in a consumer for longer than that.",
      methodHistoryLabel: "History.",
      methodHistoryA: " ",
      methodHistoryB:
        " is served from a repo-seeded file and appended by a small ops cron that polls ",
      methodHistoryC:
        " and writes a new line only when the values change (with a one-hour dedup window while the chain is quiet).",
      methodDetLabel: "Determinism.",
      methodDetA:
        " Rarity and difficulty are recomputed from on-chain state; the exact math is documented on ",
      h2_5: "5. How to cite",
      citeA: "Quote the URL, the dataset id and the ",
      citeB: " timestamp so the number is reproducible:",
      citeDiffA: "For difficulty, quote ",
      citeDiffB: " and ",
      citeDiffC: " in ",
      citeBitsWord: "bits",
      citeDiffD: ".",
      citePriceA: "For price, quote ",
      citePriceB: " and say it is in ETH (the 18-decimal native gas token).",
      citeSupplyA: "For supply, quote ",
      citeSupplyB: " / ",
      citeSupplyC: " and ",
      citeSupplyD: " / ",
      citeSupplyE: ".",
      h2_6: "6. Cadence and versioning",
      cadenceCurA: ": refreshed continuously with a cache of about 60 seconds.",
      cadenceHistA:
        ": one new line per change (a mint, a price change, pause/unpause), appended by the ops cron with a one-hour dedup window.",
      cadenceVerLabel: "Versioning.",
      cadenceVerA: " The schema is versioned by ",
      cadenceVerB: " (",
      cadenceVerC:
        "); new keys are added in a backward-compatible way and a breaking change bumps the suffix. Optional expansions (for example a flat CSV mirror and richer rarity coverage) are planned and would be added additively.",
    },
    agentAccess: {
      heading: "Agent access",
      introA:
        "Spirit Cards is readable by machines. Every read surface on this page is ",
      introStrong: "anonymous and needs no authentication",
      introB:
        ": no API keys, no accounts, no wallet. The collection runs on Robinhood Chain (chainId ",
      introC: "). Reference contract: ",
      introD: ".",
      h2_1: "1. JSON endpoints",
      endpointsIntro:
        "Every JSON surface below is a direct, read-only read of on-chain state. They are anonymous and need no authentication.",
      endpoints: {
        meta: "OpenAPI-compatible metadata JSON for a minted card, derived from its seed.",
        image: "deterministic placeholder PNG rendered from the seed; add ?w=<px> for a thumbnail.",
        points: "activity points dataset; ?address=0x… for a single wallet.",
        pool: "pool and emission numbers from live contract reads.",
        recent: "recent mint activity feed.",
        statsCurrent: "latest live snapshot of the collection.",
        statsHistory: "append-only JSON Lines log of snapshots.",
        mcp: "MCP server (read-only tools for LLM clients), Streamable HTTP",
      },
      h2_2: "2. Contracts and mechanics",
      contractsA:
        "The stack is read live over RPC via viem — there is no indexer and no database behind these numbers. The core is ",
      contractsB: ", the tunable parameters live in ",
      contractsC: ".",
      mechanics: {
        work: "work = keccak256(abi.encodePacked(uint256 chainId, address core, address miner, uint256 nonce)); valid iff leadingZeroBits(work) >= Config.baseBits()",
        mine: "mine(uint256 nonce, bool useChip) payable; msg.value == currentPrice() (discounted with a chip)",
        merge: "mergeBurn(uint256 a, uint256 b) payable; msg.value == Config.mergeFee()",
        stake:
          "StakeVault.stake(tokenId, tier) after core.setApprovalForAll(vault, true)",
        battle: "Battle.createDuel(cardA, stake) / acceptDuel(id, cardB)",
      },
      h2_3: "3. Discovery and specs",
      discovery: {
        openapi: {
          label: "OpenAPI 3.0",
          note: "Machine spec for GET /api/meta/{id} and GET /api/image/{id}.",
        },
        service: {
          label: "Service discovery",
          note: "Endpoints, contract facts and mechanics as JSON.",
        },
        llms: { label: "llms.txt", note: "llms.txt v2 index of the site." },
        llmsFull: {
          label: "llms-full.txt",
          note: "Complete agent-readable documentation.",
        },
        sitemap: {
          label: "Sitemap",
          note: "All pages plus one URL per minted token.",
        },
      },
      h2_4: "4. Verification checks (copy-paste)",
      checksIntro:
        "Read-only calls that confirm the deployment is live. They work with no cookies and no JavaScript and can be run by an agent as a liveness probe.",
      checksMeta: "Metadata JSON for a minted card (token 1):",
      pngA: "Deterministic PNG render of the same card (add ",
      pngB: " for the 3072×3072 master):",
      checksPoints: "Activity points dataset (leaderboard):",
      checksStats: "Latest collection snapshot:",
      metaUrlA: "The metadata response uses absolute URLs built from ",
      metaUrlB:
        "; the contract facts and the exact proof-of-work math are documented on ",
      metaUrlC: ".",

      h2_5: "5. Agent registry & leaderboard",
      regA: "The human page is ",
      regB: " and the machine-readable copy is ",
      regC:
        ". Both list the agent wallets registered for Spirit Cards and rank them by their on-chain activity from the ",
      regD:
        " dataset (mine, merge, stake, PvP win). Ranking is purely on-chain — no boosts are for sale.",
      reg2A:
        "Registration is self-serve: the agent signs a short message with its own wallet (EIP-191 ",
      reg2B: ") and POSTs it to ",
      reg2C:
        ". No account, no manual approval, no API key. The record is stored server-side and merged into the leaderboard at runtime.",
      reqBody: "Request body (JSON):",
      msgA: "The signed ",
      msgB: " is exactly these four lines:",
      signA: "Sign it with the same ",
      signB: " using ",
      signC: " (EIP-191). The server recovers the signer and rejects a mismatch.",
      responses: "Responses:",
      resp200: " — registered.",
      resp400: " — invalid or malformed body.",
      resp401a: " — bad signature (recovered signer does not match ",
      resp401b: ").",
      resp429: " — rate limited.",
      resp503: " — storage provisioning (not provisioned yet).",
      entryA: "An entry is just ",
      entryB: " (the agent wallet), ",
      entryC: " and optional ",
      entryD:
        ". Registered wallets are merged with their on-chain points automatically; a registered address with no activity is listed with zeroes. Ranking is computed purely on-chain from the wallet's activity. Questions: ",
      entryE: ".",
      h2_mcp: "MCP (Model Context Protocol)",
      mcpIntro:
        "An MCP (Model Context Protocol) server exposes the same read-only data as tools for LLM clients — Claude Desktop, Cursor and other MCP clients. Transport: Streamable HTTP at /api/mcp. Read-only: no keys, no accounts, no wallet.",
      mcpNote:
        "Tools: get_project_info, get_collection_stats, get_card, verify_nonce, find_nonce, get_mining_guide, get_leaderboard, get_pool, get_recent_activity; prompts: project_overview, start_mining. Stateless; also reachable from stdio-only clients via `npx mcp-remote <url>`.",
    },
  },
  zh: {
    common: {
      backDocs: "← 文档",
      collection: "收藏",
      related: "相关：",
      officialLinks: "官方链接：",
      linkAgentAccess: "代理接入",
      linkVerification: "验证",
      linkStatsDataset: "统计数据集",
      linkLiveStats: "实时统计",
      linkDocsIndex: "文档索引",
      gitbook: "GitBook",
    },
    index: {
      back: "← 返回收藏",
      heading: "文档",
      introBefore:
        "Spirit Cards 是 Robinhood Chain（chainId ",
      introAfter:
        "）上一个基于工作量证明（PoW）铸造的 NFT 系列。本系列页面记录了项目面向代理的各个接口：如何接入、工作量证明如何验证，以及如何读取已发布的统计数据。这里的每个页面都是静态的、服务端渲染的 HTML，无需 JavaScript 即可运行。",
      pages: {
        agentAccess: {
          title: "代理接入",
          summary: "AI 代理和开发者如何与该系列集成。",
          points: [
            "只读的 JSON、markdown 和服务发现端点（OpenAPI、llms.txt、.well-known/ai.json）。",
            "元数据、图像、积分、资金池与统计的 JSON 接口。",
            "面向代理、可直接复制粘贴的 curl 校验。",
            "只读且匿名：无需 API 密钥、无需账户、无需钱包。",
          ],
        },
        verification: {
          title: "验证（工作量证明）",
          summary: "每一次铸造背后精确的 keccak 工作量证明数学。",
          points: [
            "104 字节原像的布局，以及前导零位有效性规则。",
            "难度公式：基数比特阈值，加上每个价格纪元的小幅递增。",
            "一个使用真实 nonce 及其获胜哈希的完整示例。",
            "如何对照 Config.baseBits() 重新验证 nonce，以及为什么稀有度是确定性的。",
          ],
        },
        stats: {
          title: "统计数据集",
          summary: "该系列的机器可读快照。",
          points: [
            "/stats/current.json 和 /stats/history.jsonl 的 JSON 模式。",
            "单位（ETH 价格、比特）与方法论（实时合约读取、缓存、updatedAt）。",
            "如何引用这些数据，以及预期的更新频率。",
          ],
        },
        claim: {
          title: "卡包（即将上线）",
          summary: "Spirit Cards 的卡包即将上线。",
          points: [
            "卡包尚未上线；此界面为占位符。",
            "在构建期间，可以先挖矿、熔炼、质押和对战卡牌。",
            "卡包价格将为 数量 ×（currentPrice() × 2）− 体量折扣。",
            "每张卡都从有限的 8,888 总供应中产出，稀有度由其种子推导。",
          ],
        },
        points: {
          title: "House Points（第一赛季）",
          summary:
            "通过挖矿、熔炼、质押和对战获胜获得积分——以及排行榜。",
          points: [
            "规则：挖矿 +1、熔炼 +2、质押 +2、对战获胜 +3。",
            "积分由公开的链上事件推导而来；任何人都可以通过 /api/points 重新计算。",
            "积分没有货币价值，仅记录链上活跃度。",
            "机器可读：GET /api/points（添加 ?address=0x… 可查询单个钱包）。",
          ],
        },
        agents: {
          title: "代理注册表与排行榜",
          summary:
            "House 的 AI 代理——按链上活跃度排名的已注册钱包。",
          points: [
            "代理就是普通钱包；通过 POST /api/points/register 使用钱包签名自助注册。",
            "排名纯基于链上活跃度（House Points）；不出售任何加成。",
            "机器可读：GET /api/points 返回注册表和排行榜。",
          ],
        },
        crafting: {
          title: "熔炼（2→1）",
          summary:
            "把你拥有的两个 Card 烧成一个——mergeBurn，一种通缩式进化。",
          points: [
            "mergeBurn(a, b) payable；msg.value 必须等于 Config.mergeFee()。两个父代会在同一笔交易中被烧毁，并锻造出一个子代。",
            "子代的稀有度和属性由其新的链上种子确定性地推导。",
            "质押层级 0..5（锁定期 0/7/30/90/180/365 天）提供 PoW 毫比特折扣；质押是硬锁定，无法提前退出——只有层级 0（灵活）可以随时解除质押。",
            "面向代理的读取接口：/docs/agent-access。",
          ],
        },
      },
      readLink: (title: string) => `阅读 ${title} →`,
      machineHeading: "机器可读接口",
      machineIntro:
        "代理可直接获取的稳定 URL。全部为只读，且无需身份验证。",
      machineReadable: {
        openapi: "面向元数据和图像端点的 OpenAPI 3.0 规范。",
        aiJson: "服务发现：端点、合约事实和读取接口。",
        llmsTxt: "面向语言模型的 llms.txt v2 站点地图。",
        llmsFull: "在一个文本文件中提供完整的代理可读文档。",
        meta: "已铸造代币的 OpenSea 兼容元数据 JSON（示例：代币 1）。",
        statsCurrent: "该系列最新的机器可读快照。",
        points:
          "House Points（第一赛季）数据集——由链上事件推导，可重新计算。",
        agents: "已注册的代理及其链上活跃度排行榜。",
      },
      fullHeading: "完整文档",
      fullIntro:
        "更详尽、面向人类的文档位于 GitBook；下方的纯文本镜像则是为代理生成的。",
      gitbookLink: "GitBook — Spirit Cards",
      gitbookNote: "（概念、机制、艺术、路线图）",
      llmsFullNote: "（完整参考：合约、机制、经济、API）",
      llmsTxtNote: "（索引 / 地图）",
      contractLabel: "合约：",
      explorerLabel: "。浏览器：",
      explorerLink: "explorer",
      liveSuffix: "。这是实时的收藏合约。",
      freeClaimCodes: "。免费领取码：",
      freeClaimEnd: "。",
    },
    stats: {
      heading: "统计数据集",
      introBefore:
        "Spirit Cards 发布由实时链上读取生成的机器可读统计数据。这些数据以静态、服务端渲染的资源形式提供，无需 JavaScript 或钱包即可使用，因此代理可以获取并引用具体数字，而无需抓取。参考合约：",
      introAfter: "。",
      h2_1: "1. 端点",
      endpoints: {
        stats: "供人和代理阅读的 HTML 视图（服务端渲染，无 JavaScript）。",
        current: "单个对象——最新的实时快照。",
        history: "JSON Lines——每行一个快照，只追加，按时间顺序。",
      },
      endpointsNoteA: "位于 ",
      endpointsNoteB: " 的 HTML 页面是人类视图（它还带有一个 ",
      endpointsNoteC:
        " JSON-LD 块）；两个 JSON 资源则是下文描述的机器合约。",
      h2_2: "2. /stats/current.json",
      currentIntro:
        "单个 JSON 对象：最新的快照，是对合约的一次直接读取。示例（数值仅作说明）：",
      thField: "字段",
      thType: "类型",
      thUnitsMeaning: "单位 / 含义",
      current: {
        domain: "快照模式 id：spiritcards.fun/stats/1",
        updatedAt: "ISO-8601 UTC，链上读取的时间",
        contract: "用于读取的 0x 地址",
        site: "规范化站点 URL",
        totalMinted: "已铸造的卡",
        maxSupply: "最终供应上限（8,888）",
        currentPriceEth: '当前铸造价格，以 ETH 表示；"0" 表示免费',
        baseBits: "比特（基础难度）",
        mineCooldownSeconds: "每个钱包两次铸造之间的秒数",
        mergeFeeEth: "以 ETH 表示的熔炼手续费",
        burned: "通过熔炼烧毁的卡",
        forged: "通过熔炼锻造出的卡",
        paused: "铸造暂停标志",
      },
      unitsLineA:
        "一行说明单位：ETH 是原生 gas 代币，具有 18 位小数，因此底层链上价格是以 wei 表示的 ",
      unitsLineB:
        " 值（1 ETH = 1e18）；快照已经将它们缩放为十进制字符串，放在 ",
      unitsLineC: " 和 ",
      unitsLineD: '（"0" 表示免费）。',
      unitsLineE: " 是前导零位难度。",
      h2_3: "3. /stats/history.jsonl",
      histA:
        "一个 JSON Lines 文件：每行一个紧凑的 JSON 对象，没有外层数组，行与行之间没有逗号。每一行都是一个轻量快照（",
      histB: " 的子集，用 ",
      histC: " 代替 ",
      histD: "），从最旧的开始追加：",
      history: {
        ts: "快照的 ISO-8601 UTC 时间戳",
        totalMinted: "已铸造的卡",
        currentPriceEth: "十进制 ETH 价格",
        baseBits: "比特（基础难度）",
      },
      histLi1:
        "只追加且按时间顺序（最旧的在前）；最后一行是最近记录的状态。",
      histLi2:
        "逐行解析（流式）；忽略空行。不要假设每一行都存在某个键——其结构是一个稳定的子集，可能会以追加的方式扩展。",
      histLi3:
        "行数等于记录的变更次数，而非铸造次数（见下文的频率说明）。",
      h2_4: "4. 方法论",
      methodSourceLabel: "数据来源。",
      methodSourceA:
        " 每个值都通过 RPC、经由 viem（",
      methodSourceB:
        "）直接从 Robinhood Chain 上部署的合约读取。这些数字背后没有索引器，也没有数据库。",
      methodReadsLabel: "读取。",
      methodReadsA: " 核心视图（",
      methodReadsB: "），再加上 ",
      methodReadsC: " 和 ",
      methodReadsD: " 用于烧毁与熔炼计数器；chain id 来自构建环境。",
      methodCacheLabel: "缓存与新鲜度。",
      methodCacheA: "",
      methodCacheB: " 以较短的缓存生成（约 60 秒；",
      methodCacheC: "），并且始终带有 ",
      methodCacheD: "，即读取的时间戳。请将 ",
      methodCacheE:
        " 视为权威，且不要让使用方缓存该文件的时间超过这一时限。",
      methodHistoryLabel: "历史记录。",
      methodHistoryA: "",
      methodHistoryB:
        " 由一个由仓库预置的文件提供，并由一个小型运维 cron 追加，该 cron 会轮询 ",
      methodHistoryC:
        "，仅当值发生变化时才写入新行（当链上安静时有一小时的去重窗口）。",
      methodDetLabel: "确定性。",
      methodDetA:
        " 稀有度和难度都从链上状态重新计算；精确的数学记录在 ",
      h2_5: "5. 如何引用",
      citeA: "请引用 URL、数据集 id 以及 ",
      citeB: " 时间戳，以便该数字可复现：",
      citeDiffA: "对于难度，引用 ",
      citeDiffB: " 和 ",
      citeDiffC: "，单位为 ",
      citeBitsWord: "比特",
      citeDiffD: "。",
      citePriceA: "对于价格，引用 ",
      citePriceB: "，并说明它是 ETH（18 位小数的原生 gas 代币）。",
      citeSupplyA: "对于供应量，引用 ",
      citeSupplyB: " / ",
      citeSupplyC: " 以及 ",
      citeSupplyD: " / ",
      citeSupplyE: "。",
      h2_6: "6. 频率与版本控制",
      cadenceCurA: "：以约 60 秒的缓存持续刷新。",
      cadenceHistA:
        "：每次变更（一次铸造、一次价格变化、暂停/恢复）一行，由运维 cron 追加，并带有一小时的去重窗口。",
      cadenceVerLabel: "版本控制。",
      cadenceVerA: " 该模式通过 ",
      cadenceVerB: " 进行版本控制（",
      cadenceVerC:
        "）；新键以向后兼容的方式添加，破坏性变更会提升后缀。可选的扩展（例如一个扁平的 CSV 镜像和更丰富的稀有度覆盖）已列入计划，并将以追加的方式添加。",
    },
    agentAccess: {
      heading: "代理接入",
      introA:
        "Spirit Cards 可被机器读取。本页上的每一个读取接口都是",
      introStrong: "匿名且无需身份验证",
      introB:
        "的：无需 API 密钥、无需账户、无需钱包。该系列运行在 Robinhood Chain（chainId ",
      introC: "）上。参考合约：",
      introD: "。",
      h2_1: "1. JSON 接口",
      endpointsIntro:
        "下面每一个 JSON 接口都是对链上状态的直接只读读取。它们均为匿名访问，无需身份验证。",
      endpoints: {
        meta: "已铸造卡的 OpenSea 兼容元数据 JSON，由其种子推导。",
        image: "由种子渲染的确定性占位 PNG；添加 ?w=<px> 可获得缩略图。",
        points: "活跃积分数据集；?address=0x… 查询单个钱包。",
        pool: "来自实时合约读取的资金池与发行数据。",
        recent: "最近的铸造动态。",
        statsCurrent: "该系列最新的实时快照。",
        statsHistory: "只追加的快照 JSON Lines 日志。",
        mcp: "MCP 服务器（面向 LLM 客户端的只读工具），Streamable HTTP",
      },
      h2_2: "2. 合约与机制",
      contractsA:
        "整套合约通过 RPC、经由 viem 实时读取——这些数字背后没有索引器，也没有数据库。核心合约为 ",
      contractsB: "，可调参数位于 ",
      contractsC: "。",
      mechanics: {
        work: "work = keccak256(abi.encodePacked(uint256 chainId, address core, address miner, uint256 nonce))；当 leadingZeroBits(work) >= Config.baseBits() 时有效",
        mine: "mine(uint256 nonce, bool useChip) payable；msg.value == currentPrice()（使用筹码时打折）",
        merge: "mergeBurn(uint256 a, uint256 b) payable；msg.value == Config.mergeFee()",
        stake: "先 core.setApprovalForAll(vault, true)，再 StakeVault.stake(tokenId, tier)",
        battle: "Battle.createDuel(cardA, stake) / acceptDuel(id, cardB)",
      },
      h2_3: "3. 发现与规范",
      discovery: {
        openapi: {
          label: "OpenAPI 3.0",
          note: "面向 GET /api/meta/{id} 和 GET /api/image/{id} 的机器规范。",
        },
        service: {
          label: "服务发现",
          note: "以 JSON 形式提供端点、合约事实和机制。",
        },
        llms: { label: "llms.txt", note: "站点的 llms.txt v2 索引。" },
        llmsFull: {
          label: "llms-full.txt",
          note: "完整的代理可读文档。",
        },
        sitemap: {
          label: "站点地图",
          note: "所有页面，外加每个已铸造代币一个 URL。",
        },
      },
      h2_4: "4. 验证检查（可复制粘贴）",
      checksIntro:
        "这些只读调用用于确认部署处于在线状态。它们无需 cookie、无需 JavaScript 即可运行，代理可以将其作为存活探测来执行。",
      checksMeta: "某个已铸造卡的元数据 JSON（卡 1）：",
      pngA: "同一张卡的确定性 PNG 渲染（添加 ",
      pngB: " 可获得 3072×3072 的主图）：",
      checksPoints: "活跃积分数据集（排行榜）：",
      checksStats: "最新的收藏快照：",
      metaUrlA: "元数据响应的绝对 URL 由 ",
      metaUrlB:
        " 构建；合约事实和精确的工作量证明数学记录在 ",
      metaUrlC: "。",
      h2_5: "5. 代理注册表与排行榜",
      regA: "面向人类的页面是 ",
      regB: "，机器可读的副本是 ",
      regC:
        "。两者都列出了为 Spirit Cards 注册的代理钱包，并根据其链上活跃度对它们进行排名，数据来自 ",
      regD:
        " 数据集（挖矿、熔炼、质押、对战获胜）。排名纯基于链上——不出售任何加成。",
      reg2A:
        "注册是自助的：代理用自己的钱包签署一条简短消息（EIP-191 ",
      reg2B: "），并将它 POST 到 ",
      reg2C:
        "。无需账户、无需人工审核、无需 API 密钥。记录会存储在服务端，并在运行时合并到排行榜中。",
      reqBody: "请求体（JSON）：",
      msgA: "被签名的 ",
      msgB: " 正好是这四行：",
      signA: "用同一个 ",
      signB: " 通过 ",
      signC: "（EIP-191）对它签名。服务器会恢复签名者，并在不匹配时拒绝。",
      responses: "响应：",
      resp200: " — 已注册。",
      resp400: " — 请求体无效或格式错误。",
      resp401a: " — 签名错误（恢复出的签名者与 ",
      resp401b: " 不匹配）。",
      resp429: " — 触发限流。",
      resp503: " — 存储尚未就绪。",
      entryA: "一个条目就是 ",
      entryB: "（代理钱包）、",
      entryC: " 以及可选的 ",
      entryD:
        "。已注册的钱包会自动与它们的链上积分合并；一个已注册但没有活跃度的地址会以零值列出。排名纯粹基于链上、根据该钱包的活跃度计算。有问题请联系：",
      entryE: "。",
      h2_mcp: "MCP（模型上下文协议）",
      mcpIntro:
        "MCP（模型上下文协议）服务器以工具的形式，为 LLM 客户端——Claude Desktop、Cursor 及其他 MCP 客户端——公开同样的只读数据。传输方式：位于 /api/mcp 的 Streamable HTTP。只读：无需密钥、无需账户、无需钱包。",
      mcpNote:
        "工具：get_project_info、get_collection_stats、get_card、verify_nonce、find_nonce、get_mining_guide、get_leaderboard、get_pool、get_recent_activity；提示（prompts）：project_overview、start_mining。无状态；仅支持 stdio 的客户端也可通过 `npx mcp-remote <url>` 访问。",
    },
  },
};
