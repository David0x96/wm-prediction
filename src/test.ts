import { gamma, clob } from './api/index.js';

async function run() {
  console.log('\n=== [1] Hot Markets (top 5 by volume) ===');
  const hot = await gamma.getHotMarkets(5);
  for (const m of hot) {
    const prices = JSON.parse(m.outcomePrices) as number[];
    const outcomes = JSON.parse(m.outcomes) as string[];
    console.log(`• ${m.question}`);
    console.log(`  Volume: $${Number(m.volume).toLocaleString()} | Liquidity: $${Number(m.liquidity).toLocaleString()}`);
    console.log(`  Odds: ${outcomes.map((o, i) => `${o} ${(prices[i]! * 100).toFixed(1)}%`).join(' | ')}`);
    console.log(`  Slug: ${m.slug}`);
    console.log();
  }

  // Lấy token IDs từ market đầu tiên để test CLOB
  const firstMarket = hot[0];
  if (firstMarket?.clobTokenIds) {
    const tokenIds = JSON.parse(firstMarket.clobTokenIds) as string[];
    const yesTokenId = tokenIds[0];

    if (yesTokenId) {
      console.log(`=== [2] Orderbook — "${firstMarket.question}" (YES) ===`);
      try {
        const book = await clob.getOrderBook(yesTokenId);
        const topBids = book.bids.slice(0, 3);
        const topAsks = book.asks.slice(0, 3);
        console.log(`Top Bids: ${topBids.map(b => `${b.price} (${b.size})`).join(', ')}`);
        console.log(`Top Asks: ${topAsks.map(a => `${a.price} (${a.size})`).join(', ')}`);
      } catch (e) {
        console.log(`  Orderbook unavailable: ${e}`);
      }

      console.log(`\n=== [3] Price History (1 day) ===`);
      try {
        const history = await clob.getPriceHistory(yesTokenId, '1d', 100);
        const points = history.history.slice(-5);
        console.log(`Last 5 price points:`);
        for (const p of points) {
          const date = new Date(p.t * 1000).toLocaleString();
          console.log(`  ${date} → ${(p.p * 100).toFixed(1)}%`);
        }
      } catch (e) {
        console.log(`  Price history unavailable: ${e}`);
      }
    }
  }

  console.log('\n=== [4] Search: "election" ===');
  const results = await gamma.searchMarkets('election', 3);
  for (const m of results) {
    console.log(`• ${m.question}`);
  }

  console.log('\n✅ Done.');
}

run().catch(console.error);
