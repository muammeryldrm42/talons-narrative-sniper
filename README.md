# Talons Narrative Sniper

Solana memecoin signal site. Every new token launched on pump.fun / letsbonk is checked in real time
against a live narrative dictionary built from what the internet is talking about right now.
No min liquidity or min volume filters: the filter is the narrative.

## Data sources (all public, no keys)

Narratives (refreshed every 3 min, server side via `/api/narratives`):
- Google Trends daily RSS (US, GB, CA, AU, IN, NG, PH, SG, IE)
- Google News top stories RSS
- Reddit r/all hot (often blocked from cloud IPs, shown as unavailable when it is)
- CoinGecko trending
- GeckoTerminal Solana trending pools
- Wikipedia most read articles (English)
- YouTube trending videos US + GB (via kworb.net)
- DexScreener top boosts (Solana)

Tokens:
- PumpPortal websocket `subscribeNewToken` (connected directly from the browser)
- PumpPortal `subscribeTokenTrade` for matched tokens, first 15 min (buyers, net SOL flow)
- DexScreener latest token profiles (catches Raydium / Meteora / other launches)
- DexScreener token lookup for launches that arrive without a name

Safety: RugCheck summary API, shown as warnings, lowers score, never hides a token.

## Scoring (0-100)

- Narrative strength up to 50 (term weight x match quality: exact, word, contains, close spelling)
- Early traction up to 35 (unique buyers, net SOL in)
- Socials up to 9 (X, website, Telegram in metadata)
- Penalties: copycat on an already launched narrative, RugCheck danger risks, heavy selling

Tiers: Hot 65+, Warm 40+, Early below.

## Momentum

While a token is watched the site keeps rolling 1 and 5 minute windows over its trades:
new unique buyers, net SOL flow, market cap change, whale buys (2+ SOL), and how much of the
buying comes from the top 3 wallets. A token is Rising when it has 3+ new buyers in the last minute,
net SOL in, market cap up 5%+ over 5 min, and buyers arriving faster than the previous 4 minutes.
Tokens keep being watched past 15 min while they are Rising, Strong or still getting buyers (max 60 min).

Fresh narratives: terms that are new or grew 50%+ since the previous dictionary get a bonus.

Performance: current and peak multiple since the signal, plus a summary strip (median peak,
share that reached 2x) for signals older than 15 min.

## Run

```
npm install
npm run dev
```

Deploy: push to GitHub and import in Vercel. No env vars needed.

## Limits

Scanning runs in the browser tab, so signals are only produced while the site is open.
History is kept in that browser's localStorage (last 500 signals).

## Strong filter

A signal is marked Strong only when every check passes:
first token on the narrative, trend confirmed by 2+ sources (or a very heavy single trend),
clean name match, 8+ unique buyers, dev has not sold, no heavy sniping in the first seconds,
RugCheck clean, not being dumped. The detail panel shows which checks passed.

## Dev history

Every launch on the PumpPortal new-token stream is recorded per creator wallet (kept 7 days in
localStorage for repeat launchers and dumpers). For each signal:
- Serial dev: 3+ other launches in the last 24h (penalty), 6+ (bigger penalty)
- Dev still holding: the creator's token balance is read from Solana RPC (`/api/devbalance`) after 60s
  and every 2 min for the first hour. Under 50% of the initial buy = dev sold
- Previous dumps: the dev's earlier tokens (up to 5) are checked the same way. Any dump marks the dev
- Strong requires a clean dev history

RPC defaults to the public mainnet endpoint. Put `RPC_URL=...` in `.env` to use your own.

## Note on PumpPortal trade stream

`subscribeTokenTrade` now needs an API key funded with 0.02 SOL. The key controls a trading wallet,
so it must never be shipped to the browser. Momentum therefore comes from DexScreener polling
(every 20s for signals under 1 hour old). The trade-stream code stays in place and activates
automatically if the stream ever delivers trades again.

## Alerts, watchlist, graduation, report

- Alerts (header toggle): sound plus browser notification when a signal turns Rising, Strong or Graduated.
  Clicking the notification opens DexScreener. A reload does not replay old alerts
- Watchlist: your own words, matched like trending narratives with a fixed weight of 6 (stacks if the word
  is also trending). Stored in the browser
- Graduation: PumpPortal `subscribeMigration` (free). Signaled tokens that finish the bonding curve get a
  Graduated badge, filter and alert
- "What actually ran" report: for signals older than 15 min, 2x rate and median peak grouped by score,
  Strong, Rising, narrative source, number of confirming sources, match type, fresh narrative and dev status.
  Use it to see which filters work before tightening thresholds

## Signal hardening (RugCheck full report)

`/api/rugcheck` reads the full RugCheck report and is re-checked at about 5, 10 and 20 minutes:
- Holder concentration with AMM pools and bonding curves removed: top 10 over 35% or one wallet
  over 10% is penalised
- Insider networks (linked wallets, a common bundle signature): 5+ wallets or 15%+ of supply is penalised
- Rugged flag: heavy penalty
- Dev track record across every earlier launch (not only what this browser saw): 10+ launches with 80%+
  dead (under $8K mcap) = serial rugger. A previous token over $100K is a small bonus
- Everyday words and meme staples (life, party, cat, moon...) match at 40% strength and cannot be Strong,
  unless you put them on your watchlist

Strong now also requires: holders spread out, no insider network, not rugged, specific narrative.

## Running in the background

All engine timers run on a small Web Worker, so polling (DexScreener, RugCheck, dev balance checks)
keeps its pace when the tab is in the background instead of being throttled to once a minute.
A watchdog reconnects the PumpPortal socket after 90s of silence.

Export (feed header) downloads every signal with checks and performance as JSON, for tuning.

## One scanner per browser

The engine runs in one tab only (Web Locks API). Extra tabs show a notice, mirror the running tab's
signals through localStorage, and take over automatically when that tab closes. This keeps a single
PumpPortal connection, as PumpPortal asks, and stops two tabs from overwriting each other's history.

## Tuning from the report

"Which checks matter" shows, for every Strong check, the 2x rate of signals that passed vs failed it.
A lift well above 1 means the check is useful; around 1 means it is not separating winners from losers.
"Best narratives" lists the narratives that produced the biggest runs.

## Quality layer

- DEX paid: `/api/orders` checks DexScreener paid orders (profile, ads, boosts) for the top 20 young signals
  every minute. Paid = +10, paid within 30 min of launch = +5 more, boosts = +3
- Holder growth: holders per minute between RugCheck re-checks, up to +10
- Low effort: no X, Telegram, website or description in metadata = -10 and fails Strong
- Hide junk (feed, on by default): hides rugged, dev dumped or sold, serial ruggers, insider-heavy,
  no-effort tokens, anything under score 20 after 5 min, and tokens with under 15 holders after 15 min
  that are not rising. Untick to see everything

## False positive filters

- Copycat: an exact match on a narrative that only comes from CoinGecko, GeckoTerminal or DexScreener boosts
  is a copy of a live token, not a new story. -15 and fails Strong
- Narrative age: every narrative's first appearance is stored (3 days). A launch within 60 min of a narrative
  appearing gets +6 as a first mover
- Thin liquidity (normal AMM pools only): liquidity under 5% of FDV = -10 and fails Strong
- Dumped from peak: under 35% of peak after 10 min, or -50% in 5 min, goes to junk

## Backtest (live sample, 415 launches, 30 min window)

Collected every pump.fun / bonk.fun launch for 15 minutes with launch-time features only, then measured the
real 30 minute peak from minute candles. Base rate of reaching 2x: 8.7%.

| Feature | n | Reached 2x |
|---|---|---|
| Narrative match, not a copycat | 8 | 25% |
| Copy of a live trending token | 5 | 0% |
| No narrative match | 402 | 8.5% |
| Dev buy 0.5 to 2 SOL | 87 | 13.8% |
| Dev buy under 0.5 SOL | 211 | 6.2% |
| Dev buy 2 to 10 SOL | 74 | 5.4% |
| Serial rugger dev (10+ launches, 80% dead) | 94 | 6.4% |
| Dev first launch | 258 | 9.3% |
| X link in metadata | 105 | 7.6% |

Changes made from it: copycat penalty raised to 25, socials weigh less, dev buy 0.5 to 2 SOL gets +4,
short-window serial launching penalty softened (the dead-token record is what separates).
One 15 minute sample is small; narrative groups especially need more data before stronger conclusions.
