import https from 'https';

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Fetch live Crypto rates
 */
export async function getCryptoPrices() {
  try {
    const data = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin,binancecoin&vs_currencies=usd,inr&include_24hr_change=true');
    if (!data) return null;
    return {
      btc: { usd: data.bitcoin?.usd, inr: data.bitcoin?.inr, change: data.bitcoin?.usd_24h_change?.toFixed(2) },
      eth: { usd: data.ethereum?.usd, inr: data.ethereum?.inr, change: data.ethereum?.usd_24h_change?.toFixed(2) },
      sol: { usd: data.solana?.usd, inr: data.solana?.inr, change: data.solana?.usd_24h_change?.toFixed(2) },
      doge: { usd: data.dogecoin?.usd, inr: data.dogecoin?.inr, change: data.dogecoin?.usd_24h_change?.toFixed(2) },
    };
  } catch (err) {
    return null;
  }
}
