import React, { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown, Search, Star, StarOff, X, Plus } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const WS_BASE = API_BASE.replace(/^https/, "wss").replace(/^http/, "ws");
const SCAN_INTERVAL_SEC = 300;

const TIMEFRAMES = ["15m", "30m", "1h"];
const ASSET_FILTERS = ["all", "stock", "crypto", "forex"];
const ASSET_TYPES = ["stock", "crypto", "forex"];
const DIRECTION_FILTERS = ["all", "BUY", "SELL", "WAIT"];

const SYMBOL_LIST = [
  // Stocks
  { symbol: "AAPL",  assetType: "stock",  label: "Apple" },
  { symbol: "MSFT",  assetType: "stock",  label: "Microsoft" },
  { symbol: "NVDA",  assetType: "stock",  label: "Nvidia" },
  { symbol: "TSLA",  assetType: "stock",  label: "Tesla" },
  { symbol: "AMZN",  assetType: "stock",  label: "Amazon" },
  { symbol: "META",  assetType: "stock",  label: "Meta" },
  { symbol: "GOOGL", assetType: "stock",  label: "Google" },
  { symbol: "AMD",   assetType: "stock",  label: "AMD" },
  { symbol: "PLTR",  assetType: "stock",  label: "Palantir" },
  { symbol: "INTC",  assetType: "stock",  label: "Intel" },
  { symbol: "BAC",   assetType: "stock",  label: "Bank of America" },
  { symbol: "F",     assetType: "stock",  label: "Ford" },
  { symbol: "SOFI",  assetType: "stock",  label: "SoFi" },
  { symbol: "RIVN",  assetType: "stock",  label: "Rivian" },
  { symbol: "LCID",  assetType: "stock",  label: "Lucid Motors" },
  { symbol: "NIO",   assetType: "stock",  label: "NIO" },
  { symbol: "SNAP",  assetType: "stock",  label: "Snapchat" },
  { symbol: "UBER",  assetType: "stock",  label: "Uber" },
  { symbol: "LYFT",  assetType: "stock",  label: "Lyft" },
  { symbol: "HOOD",  assetType: "stock",  label: "Robinhood" },
  { symbol: "COIN",  assetType: "stock",  label: "Coinbase" },
  { symbol: "MARA",  assetType: "stock",  label: "Marathon Digital" },
  { symbol: "RIOT",  assetType: "stock",  label: "Riot Platforms" },
  { symbol: "CLSK",  assetType: "stock",  label: "CleanSpark" },
  { symbol: "MSTR",  assetType: "stock",  label: "MicroStrategy" },
  { symbol: "GME",   assetType: "stock",  label: "GameStop" },
  { symbol: "AMC",   assetType: "stock",  label: "AMC Entertainment" },
  { symbol: "SPY",   assetType: "stock",  label: "S&P 500 ETF" },
  { symbol: "QQQ",   assetType: "stock",  label: "Nasdaq ETF" },
  { symbol: "IWM",   assetType: "stock",  label: "Russell 2000 ETF" },
  { symbol: "XLF",   assetType: "stock",  label: "Financials ETF" },
  { symbol: "ARKK",  assetType: "stock",  label: "ARK Innovation ETF" },
  { symbol: "BABA",  assetType: "stock",  label: "Alibaba" },
  { symbol: "JD",    assetType: "stock",  label: "JD.com" },
  { symbol: "PDD",   assetType: "stock",  label: "Pinduoduo" },
  { symbol: "XPEV",  assetType: "stock",  label: "XPeng" },
  { symbol: "LI",    assetType: "stock",  label: "Li Auto" },
  { symbol: "NFLX",  assetType: "stock",  label: "Netflix" },
  { symbol: "DIS",   assetType: "stock",  label: "Disney" },
  { symbol: "PYPL",  assetType: "stock",  label: "PayPal" },
  { symbol: "XYZ",   assetType: "stock",  label: "Block (fmr Square)" },
  { symbol: "SHOP",  assetType: "stock",  label: "Shopify" },
  { symbol: "ZM",    assetType: "stock",  label: "Zoom" },
  { symbol: "RBLX",  assetType: "stock",  label: "Roblox" },
  { symbol: "DKNG",  assetType: "stock",  label: "DraftKings" },
  { symbol: "PENN",  assetType: "stock",  label: "Penn Entertainment" },
  { symbol: "ABNB",  assetType: "stock",  label: "Airbnb" },
  { symbol: "DASH",  assetType: "stock",  label: "DoorDash" },
  { symbol: "SPOT",  assetType: "stock",  label: "Spotify" },
  { symbol: "TWLO",  assetType: "stock",  label: "Twilio" },
  // Crypto
  { symbol: "BTCUSDT",  assetType: "crypto", label: "Bitcoin" },
  { symbol: "ETHUSDT",  assetType: "crypto", label: "Ethereum" },
  { symbol: "BNBUSDT",  assetType: "crypto", label: "BNB" },
  { symbol: "SOLUSDT",  assetType: "crypto", label: "Solana" },
  { symbol: "XRPUSDT",  assetType: "crypto", label: "XRP / Ripple" },
  { symbol: "ADAUSDT",  assetType: "crypto", label: "Cardano" },
  { symbol: "DOGEUSDT", assetType: "crypto", label: "Dogecoin" },
  { symbol: "AVAXUSDT", assetType: "crypto", label: "Avalanche" },
  { symbol: "DOTUSDT",  assetType: "crypto", label: "Polkadot" },
  { symbol: "MATICUSDT",assetType: "crypto", label: "Polygon / Matic" },
  { symbol: "LINKUSDT", assetType: "crypto", label: "Chainlink" },
  { symbol: "UNIUSDT",  assetType: "crypto", label: "Uniswap" },
  { symbol: "ATOMUSDT", assetType: "crypto", label: "Cosmos" },
  { symbol: "LTCUSDT",  assetType: "crypto", label: "Litecoin" },
  { symbol: "ETCUSDT",  assetType: "crypto", label: "Ethereum Classic" },
  { symbol: "XLMUSDT",  assetType: "crypto", label: "Stellar" },
  { symbol: "ALGOUSDT", assetType: "crypto", label: "Algorand" },
  { symbol: "NEARUSDT", assetType: "crypto", label: "NEAR Protocol" },
  { symbol: "FTMUSDT",  assetType: "crypto", label: "Fantom" },
  { symbol: "ARBUSDT",  assetType: "crypto", label: "Arbitrum" },
  // Forex & CFDs
  { symbol: "EURUSD", assetType: "forex", label: "Euro / US Dollar" },
  { symbol: "GBPUSD", assetType: "forex", label: "British Pound / USD" },
  { symbol: "USDJPY", assetType: "forex", label: "USD / Japanese Yen" },
  { symbol: "AUDUSD", assetType: "forex", label: "Australian Dollar / USD" },
  { symbol: "USDCAD", assetType: "forex", label: "USD / Canadian Dollar" },
  { symbol: "USDCHF", assetType: "forex", label: "USD / Swiss Franc" },
  { symbol: "NZDUSD", assetType: "forex", label: "New Zealand Dollar / USD" },
  { symbol: "GBPJPY", assetType: "forex", label: "British Pound / JPY" },
  { symbol: "EURJPY", assetType: "forex", label: "Euro / JPY" },
  { symbol: "EURGBP", assetType: "forex", label: "Euro / British Pound" },
  { symbol: "XAUUSD", assetType: "forex", label: "Gold" },
  { symbol: "XAGUSD", assetType: "forex", label: "Silver" },
  { symbol: "US30",   assetType: "forex", label: "Dow Jones 30" },
  { symbol: "US500",  assetType: "forex", label: "S&P 500 Index" },
  { symbol: "NAS100", assetType: "forex", label: "Nasdaq 100 Index" },
  { symbol: "GER40",  assetType: "forex", label: "DAX 40 / Germany" },
  { symbol: "USOIL",  assetType: "forex", label: "Crude Oil (WTI)" },
  { symbol: "UKOIL",  assetType: "forex", label: "Brent Oil" },
];

const TF_TV = { "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1D": "D", "1W": "W" };
const CHART_TF_OPTIONS = [
  { label: "Signal", key: null },  // null = use signal's own timeframe
  { label: "4H",     key: "4h" },
  { label: "1D",     key: "1D" },
  { label: "1W",     key: "1W" },
];

const TV_SYMBOL_MAP = {
  XAUUSD: "TVC:GOLD", XAGUSD: "TVC:SILVER",
  US30: "TVC:DJI", US500: "SP:SPX", NAS100: "NASDAQ:NDX",
  GER40: "TVC:DEU40", USOIL: "TVC:USOIL", UKOIL: "TVC:UKOIL",
  EURUSD: "FX:EURUSD", GBPUSD: "FX:GBPUSD", USDJPY: "FX:USDJPY",
  AUDUSD: "FX:AUDUSD", USDCAD: "FX:USDCAD", USDCHF: "FX:USDCHF",
  NZDUSD: "FX:NZDUSD", GBPJPY: "FX:GBPJPY", EURJPY: "FX:EURJPY",
  EURGBP: "FX:EURGBP",
};

function toTVSymbol(symbol, assetType) {
  if (TV_SYMBOL_MAP[symbol]) return TV_SYMBOL_MAP[symbol];
  if (assetType === "crypto") return `BINANCE:${symbol}`;
  return symbol;
}

function TradingViewChart({ symbol, assetType, interval }) {
  const tvSymbol = toTVSymbol(symbol, assetType);
  const src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${interval}&theme=dark&style=1&locale=en&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&calendar=0&hide_volume=0`;
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-dark-600">
      <iframe src={src} width="100%" height="100%" frameBorder="0" allowTransparency="true" scrolling="no" />
    </div>
  );
}

function useCountdown(lastScan) {
  const [seconds, setSeconds] = useState(null);
  useEffect(() => {
    if (!lastScan) return;
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(lastScan).getTime()) / 1000);
      return Math.max(0, SCAN_INTERVAL_SEC - elapsed);
    };
    setSeconds(calc());
    const id = setInterval(() => setSeconds(calc()), 1000);
    return () => clearInterval(id);
  }, [lastScan]);
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const COLUMNS = [
  { label: "Symbol",      key: "symbol",      mobile: true },
  { label: "Signal",      key: "direction",   mobile: true },
  { label: "Score",       key: "score",       mobile: true },
  { label: "Entry",       key: "entry",       mobile: false },
  { label: "Stop Loss",   key: "stop_loss",   mobile: false },
  { label: "Take Profit", key: "take_profit", mobile: false },
  { label: "RSI",         key: "rsi",         mobile: false },
  { label: "R:R",         key: "_rr",         mobile: false },
  { label: "TF",          key: "timeframe",   mobile: false },
];

function computeRR(signal) {
  if (signal.direction === "WAIT") return -1;
  const diff = Math.abs(signal.take_profit - signal.entry);
  const risk = Math.abs(signal.entry - signal.stop_loss);
  return risk === 0 ? 0 : diff / risk;
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={12} className="inline ml-0.5 opacity-30" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="inline ml-0.5 text-blue-400" />
    : <ChevronDown size={12} className="inline ml-0.5 text-blue-400" />;
}

function ScoreBadge({ score }) {
  const color = score >= 70 ? "text-buy" : score >= 50 ? "text-wait" : "text-gray-400";
  return <span className={`font-bold ${color}`}>{score.toFixed(0)}/100</span>;
}

function DirectionBadge({ direction }) {
  const map = {
    BUY: "bg-buy/20 text-buy border border-buy/40",
    SELL: "bg-sell/20 text-sell border border-sell/40",
    WAIT: "bg-wait/20 text-wait border border-wait/40",
  };
  const icons = {
    BUY: <TrendingUp size={12} className="inline mr-1" />,
    SELL: <TrendingDown size={12} className="inline mr-1" />,
    WAIT: <Minus size={12} className="inline mr-1" />,
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[direction] || ""}`}>
      {icons[direction]}{direction}
    </span>
  );
}

function SignalRow({ signal, onClick, selected }) {
  const rr = computeRR(signal);
  return (
    <tr
      onClick={() => onClick(signal)}
      className={`cursor-pointer border-b border-dark-700 hover:bg-dark-700 transition-colors ${selected ? "bg-dark-700 ring-1 ring-blue-500/30" : ""}`}
    >
      <td className="px-4 py-3">
        <div className="font-semibold text-white">{signal.symbol}</div>
        <div className="text-xs text-gray-500 capitalize">{signal.asset_type}</div>
      </td>
      <td className="px-4 py-3"><DirectionBadge direction={signal.direction} /></td>
      <td className="px-4 py-3"><ScoreBadge score={signal.score} /></td>
      <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">{signal.entry}</td>
      <td className="px-4 py-3 text-sm font-mono text-sell whitespace-nowrap">{signal.stop_loss}</td>
      <td className="px-4 py-3 text-sm font-mono text-buy whitespace-nowrap">{signal.take_profit}</td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <span className={signal.rsi < 35 ? "text-buy" : signal.rsi > 65 ? "text-sell" : "text-gray-300"}>
          {signal.rsi}
        </span>
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">{rr < 0 ? "-" : `${rr.toFixed(1)}:1`}</td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{signal.timeframe}</td>
    </tr>
  );
}

function SignalTable({ signals, loading, emptyMsg, onRowClick, selectedSignal, sortCol, sortDir, onSort }) {
  const sorted = [...signals].sort((a, b) => {
    let av = sortCol === "_rr" ? computeRR(a) : a[sortCol];
    let bv = sortCol === "_rr" ? computeRR(b) : b[sortCol];
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl">
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-600 bg-dark-700">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap"
                >
                  {col.label}
                  <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  {loading ? "Scanning markets..." : emptyMsg}
                </td>
              </tr>
            ) : (
              sorted.map((s, i) => (
                <SignalRow
                  key={`${s.symbol}-${i}`}
                  signal={s}
                  onClick={onRowClick}
                  selected={selectedSignal?.symbol === s.symbol}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SignalDetail({ signal, onClose, watchlist, onToggleWatchlist, onPaperTrade }) {
  if (!signal) return null;
  const inWatchlist = watchlist.some(w => w.symbol === signal.symbol && w.assetType === signal.asset_type);
  const [optionsData, setOptionsData] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [backtestData, setBacktestData] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestLoaded, setBacktestLoaded] = useState(false);
  const [chartTf, setChartTf] = useState("1D");
  const [pmData, setPmData] = useState(null);
  const [pmLoading, setPmLoading] = useState(false);

  useEffect(() => {
    setOptionsData(null);
    setOptionsLoading(false);
    setBacktestData(null);
    setBacktestLoading(false);
    setBacktestLoaded(false);
    setChartTf("1D");
    setPmData(null);
    if (signal.asset_type !== "stock" || signal.direction === "WAIT") return;
    setOptionsLoading(true);
    fetch(`${API_BASE}/api/options/${signal.symbol}?direction=${signal.direction}&price=${signal.entry}`)
      .then(r => r.json())
      .then(d => { setOptionsData(d.option); setOptionsLoading(false); })
      .catch(() => setOptionsLoading(false));
  }, [signal.symbol, signal.direction, signal.entry]);

  useEffect(() => {
    if (signal.asset_type !== "stock") return;
    setPmLoading(true);
    fetch(`${API_BASE}/api/premarket/${signal.symbol}`)
      .then(r => r.json())
      .then(d => { setPmData(d); setPmLoading(false); })
      .catch(() => setPmLoading(false));
  }, [signal.symbol, signal.asset_type]);

  const loadBacktest = () => {
    if (backtestLoaded || backtestLoading) return;
    setBacktestLoading(true);
    fetch(`${API_BASE}/api/backtest/${signal.symbol}?asset_type=${signal.asset_type}&timeframe=${signal.timeframe}&min_score=60`)
      .then(r => r.json())
      .then(d => { setBacktestData(d.backtest); setBacktestLoading(false); setBacktestLoaded(true); })
      .catch(() => { setBacktestLoading(false); setBacktestLoaded(true); });
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 max-w-3xl w-full mx-auto my-auto" onClick={e => e.stopPropagation()}>
        <TradingViewChart
          symbol={signal.symbol}
          assetType={signal.asset_type}
          interval={TF_TV[chartTf] ?? TF_TV[signal.timeframe] ?? "15"}
        />
        <div className="flex items-center justify-between mt-2 mb-4">
          <div className="flex gap-1 bg-dark-700 rounded-lg p-0.5">
            {CHART_TF_OPTIONS.map(opt => {
              const key = opt.key ?? signal.timeframe;
              const label = opt.key === null ? `Signal (${signal.timeframe})` : opt.label;
              return (
                <button
                  key={label}
                  onClick={() => setChartTf(key)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${chartTf === key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{signal.symbol}</h2>
            <span className="text-sm text-gray-400 capitalize">{signal.asset_type} · {signal.timeframe}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadBacktest}
              disabled={backtestLoading || signal.asset_type === "forex"}
              title={signal.asset_type === "forex" ? "Backtesting not supported for forex" : "Run historical backtest"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-dark-600 text-gray-400 hover:text-white border border-dark-500 disabled:opacity-40"
            >
              {backtestLoading ? <RefreshCw size={12} className="animate-spin" /> : "📊 Backtest"}
            </button>
            <button
              onClick={() => onPaperTrade(signal)}
              disabled={signal.direction === "WAIT"}
              title={signal.direction === "WAIT" ? "No signal to trade" : "Open a paper trade from this signal"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-dark-600 text-gray-400 hover:text-white border border-dark-500 disabled:opacity-40"
            >
              📝 Paper Trade
            </button>
            <button
              onClick={() => onToggleWatchlist(signal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inWatchlist ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30" : "bg-dark-600 text-gray-400 hover:text-white border border-dark-500"}`}
            >
              {inWatchlist ? <StarOff size={12} /> : <Star size={12} />}
              {inWatchlist ? "Remove" : "Watchlist"}
            </button>
            <DirectionBadge direction={signal.direction} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Entry", value: signal.entry, color: "text-white" },
            { label: "Stop Loss", value: signal.stop_loss, color: "text-sell" },
            { label: "Take Profit", value: signal.take_profit, color: "text-buy" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`font-mono font-semibold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Score", value: `${signal.score}/100` },
            { label: "RSI", value: signal.rsi },
            { label: "EMA Trend", value: signal.ema_trend },
          ].map(({ label, value }) => (
            <div key={label} className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="font-semibold text-sm">{value}</div>
            </div>
          ))}
        </div>
        <div className="bg-dark-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2">Signal Reasons</div>
          <ul className="space-y-1">
            {signal.reasons.map((r, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
        {signal.asset_type === "stock" && (
          <div className="bg-dark-700 rounded-lg p-3 mt-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              🌅 Extended Hours <span className="text-gray-600 font-normal normal-case">(US stocks)</span>
            </div>
            {pmLoading && <div className="text-xs text-gray-500 py-1">Loading extended hours data...</div>}
            {!pmLoading && pmData && (() => {
              const activePrice = pmData.pre_market_price ?? pmData.post_market_price;
              const activePct = pmData.pre_market_price ? pmData.pre_market_change_pct : pmData.post_market_change_pct;
              const session = pmData.pre_market_price ? "Pre-Market" : pmData.post_market_price ? "After-Hours" : null;
              const sessionColor = pmData.pre_market_price ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-purple-500/20 text-purple-300 border-purple-500/30";
              const isUp = activePct >= 0;
              const withSignal = (signal.direction === "BUY" && isUp) || (signal.direction === "SELL" && !isUp);

              if (!session) return <div className="text-xs text-gray-500 py-1">No extended hours activity right now.</div>;

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${sessionColor}`}>{session}</span>
                    <span className="text-white font-mono font-semibold">${activePrice.toFixed(2)}</span>
                    <span className={`text-sm font-semibold ${isUp ? "text-buy" : "text-sell"}`}>
                      {isUp ? "▲" : "▼"} {activePct > 0 ? "+" : ""}{activePct}%
                    </span>
                    {signal.direction !== "WAIT" && (
                      <span className={`text-xs font-medium ${withSignal ? "text-green-400" : "text-red-400"}`}>
                        {withSignal ? "✓ With signal" : "✗ Against signal"}
                      </span>
                    )}
                  </div>
                  {pmData.previous_close && (
                    <div className="text-xs text-gray-500">Prev Close: ${pmData.previous_close.toFixed(2)}</div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
        {backtestLoaded && backtestData && (
          <div className="bg-dark-700 rounded-lg p-3 mt-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              📊 Backtest — {backtestData.timeframe} · {backtestData.bars_analyzed} bars
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(() => {
                const wr = backtestData.win_rate;
                const wrColor = wr === null ? "text-gray-400" : wr >= 55 ? "text-green-400" : wr >= 45 ? "text-yellow-400" : "text-red-400";
                return [
                  { label: "Win Rate", value: wr !== null ? `${wr}%` : "—", sub: `${backtestData.signal_count} signals`, color: wrColor },
                  { label: "Avg Win", value: `+${backtestData.avg_win_pct}%`, sub: "", color: "text-green-400" },
                  { label: "Avg Loss", value: `-${backtestData.avg_loss_pct}%`, sub: "", color: "text-red-400" },
                  { label: "Lookahead", value: backtestData.lookahead_label, sub: "", color: "text-gray-300" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-dark-600 rounded-lg p-2 text-center">
                    <div className="text-gray-500 mb-1">{label}</div>
                    <div className={`font-semibold ${color}`}>{value}</div>
                    {sub && <div className="text-gray-600 mt-0.5">{sub}</div>}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
        {backtestLoaded && !backtestData && (
          <div className="bg-dark-700 rounded-lg p-3 mt-3 text-xs text-gray-500">Not enough historical data to run a backtest for this symbol.</div>
        )}
        {signal.asset_type === "stock" && signal.direction !== "WAIT" && (
          <div className="bg-dark-700 rounded-lg p-3 mt-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              ⚡ Suggested Options Play
              <span className="text-gray-600 font-normal normal-case">(US stocks only)</span>
            </div>
            {optionsLoading && <div className="text-xs text-gray-500 py-1">Loading options chain...</div>}
            {!optionsLoading && !optionsData && <div className="text-xs text-gray-500 py-1">No liquid options available for this symbol.</div>}
            {optionsData && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${optionsData.type === "CALL" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                    {optionsData.type}
                  </span>
                  <span className="text-white font-mono font-semibold">${optionsData.strike} strike</span>
                  <span className="text-gray-400 text-xs">· expires {optionsData.expiry} ({optionsData.dte} DTE)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: "Cost / contract", value: optionsData.cost_per_contract ? `$${optionsData.cost_per_contract}` : "—" },
                    { label: "Impl. Volatility", value: optionsData.iv ? `${optionsData.iv}%` : "—" },
                    { label: "Volume", value: optionsData.volume || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-dark-600 rounded-lg p-2 text-center">
                      <div className="text-gray-500 mb-1">{label}</div>
                      <div className="text-white font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
                {optionsData.iv_vs_hv && optionsData.iv_vs_hv !== "NORMAL" && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${optionsData.iv_vs_hv === "HIGH" ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-green-500/10 border border-green-500/20 text-green-400"}`}>
                    {optionsData.iv_vs_hv === "HIGH"
                      ? "📈 IV HIGH vs historical — options are expensive, consider a spread instead of a naked call/put"
                      : "📉 IV LOW vs historical — options are cheap, good time to buy outright"}
                    {optionsData.hv && <span className="ml-auto text-gray-500">HV {optionsData.hv}%</span>}
                  </div>
                )}
                {optionsData.earnings_warning && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
                    ⚠️ Earnings date <strong>{optionsData.earnings_date}</strong> falls within this option's expiry window — IV may spike before and crash after the announcement.
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Bid ${optionsData.bid} · Ask ${optionsData.ask} · <span className="text-yellow-400">Max loss = premium paid (${optionsData.cost_per_contract || "—"})</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-xs text-yellow-400 flex gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          This is a technical analysis suggestion. Always apply your own judgment before trading.
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 bg-dark-600 hover:bg-dark-500 rounded-lg text-sm transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

function WatchlistPage({ watchlist, setWatchlist, sortCol, sortDir, onSort, selectedSignal, setSelectedSignal }) {
  const [addSymbol, setAddSymbol] = useState("");
  const [addAssetType, setAddAssetType] = useState("stock");
  const [addTimeframe, setAddTimeframe] = useState("15m");
  const [addError, setAddError] = useState("");
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanTime, setScanTime] = useState("");

  const addToWatchlist = () => {
    const sym = addSymbol.trim().toUpperCase();
    if (!sym) return;
    if (watchlist.some(w => w.symbol === sym && w.assetType === addAssetType)) {
      setAddError(`${sym} is already in your watchlist`);
      return;
    }
    setWatchlist(prev => [...prev, { symbol: sym, assetType: addAssetType, timeframe: addTimeframe }]);
    setAddSymbol("");
    setAddError("");
  };

  const removeFromWatchlist = (symbol, assetType) => {
    setWatchlist(prev => prev.filter(w => !(w.symbol === symbol && w.assetType === assetType)));
    setSignals(prev => prev.filter(s => !(s.symbol === symbol && s.asset_type === assetType)));
  };

  const scanWatchlist = useCallback(async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/scan/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: watchlist.map(w => ({ symbol: w.symbol, asset_type: w.assetType })),
          timeframe: addTimeframe,
        }),
      });
      const data = await res.json();
      setSignals(data.signals || []);
      setScanTime(data.scan_time || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [watchlist, addTimeframe]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Add symbol form */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Add Symbol to Watchlist</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            value={addSymbol}
            onChange={e => {
              const val = e.target.value.toUpperCase();
              setAddSymbol(val);
              setAddAssetType(detectAssetType(val));
              setAddError("");
            }}
            onKeyDown={e => e.key === "Enter" && addToWatchlist()}
            placeholder="e.g. NVDA, BTCUSDT, EURUSD"
            className="flex-1 min-w-48 bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={addAssetType}
            onChange={e => setAddAssetType(e.target.value)}
            className="bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={addToWatchlist}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {addError && <p className="text-xs text-red-400 mt-2">{addError}</p>}

        {/* Watchlist chips */}
        {watchlist.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {watchlist.map(w => (
              <span key={`${w.symbol}-${w.assetType}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-600 border border-dark-500 rounded-full text-xs text-gray-300">
                <span className="font-semibold text-white">{w.symbol}</span>
                <span className="text-gray-500 capitalize">{w.assetType}</span>
                <button onClick={() => removeFromWatchlist(w.symbol, w.assetType)} className="text-gray-500 hover:text-red-400 transition-colors ml-0.5">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Scan controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setAddTimeframe(tf)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${addTimeframe === tf ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {scanTime && <span className="text-xs text-gray-500">Scanned: {new Date(scanTime).toLocaleTimeString()}</span>}
          <button
            onClick={scanWatchlist}
            disabled={loading || watchlist.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Scanning..." : "Scan Watchlist"}
          </button>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="bg-dark-800 border border-dark-600 rounded-xl py-16 text-center text-gray-500">
          <Star size={32} className="mx-auto mb-3 opacity-30" />
          <p>Your watchlist is empty — add symbols above</p>
        </div>
      ) : (
        <SignalTable
          signals={signals}
          loading={loading}
          emptyMsg="Click Scan Watchlist to get signals"
          onRowClick={setSelectedSignal}
          selectedSignal={selectedSignal}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={onSort}
        />
      )}
    </div>
  );
}

async function fetchCryptoSuggestions(q) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.coins || []).slice(0, 8).map(c => ({
      symbol: `${c.symbol.toUpperCase()}USDT`,
      assetType: "crypto",
      label: c.name,
    }));
  } catch {
    return [];
  }
}

const FOREX_SYMBOLS = new Set(SYMBOL_LIST.filter(s => s.assetType === "forex").map(s => s.symbol));

function detectAssetType(sym) {
  if (sym.endsWith("USDT") || sym.endsWith("BTC") || sym.endsWith("ETH")) return "crypto";
  if (FOREX_SYMBOLS.has(sym)) return "forex";
  return "stock";
}

function generateTradeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function calcPnl(trade, currentPrice) {
  return trade.direction === "BUY"
    ? (currentPrice - trade.entry_price) * trade.shares
    : (trade.entry_price - currentPrice) * trade.shares;
}

function buildOpenTrade(signal, shares, dollarAmount, portfolio) {
  return {
    newTrade: {
      id: generateTradeId(),
      symbol: signal.symbol, asset_type: signal.asset_type, direction: signal.direction,
      entry_price: signal.entry, shares, dollar_amount: dollarAmount,
      stop_loss: signal.stop_loss, take_profit: signal.take_profit,
      opened_at: new Date().toISOString(),
      closed_at: null, close_price: null, close_reason: null, pnl: null,
      signal_score: signal.score, timeframe: signal.timeframe,
    },
    newPortfolio: { ...portfolio, balance: portfolio.balance - dollarAmount },
  };
}

function applyCloseTrade(tradeId, closePrice, reason, trades, portfolio) {
  let returnedCash = 0, pnlDelta = 0;
  const updatedTrades = trades.map(t => {
    if (t.id !== tradeId) return t;
    const pnl = calcPnl(t, closePrice);
    returnedCash = t.dollar_amount; pnlDelta = pnl;
    return { ...t, closed_at: new Date().toISOString(), close_price: closePrice, close_reason: reason, pnl };
  });
  return {
    updatedTrades,
    newPortfolio: { ...portfolio, balance: portfolio.balance + returnedCash + pnlDelta },
  };
}

function fmtUSD(n, showSign = false) {
  if (n === null || n === undefined) return "—";
  const sign = showSign ? (n >= 0 ? "+" : "-") : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n) {
  if (n === null || n === undefined) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function SearchModal({ onResult, onClose }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setSuggestions([]); return; }
    const staticMatches = SYMBOL_LIST.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
    ).slice(0, 5);
    setSuggestions(staticMatches);
    setHighlighted(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const cryptoMatches = await fetchCryptoSuggestions(q);
      const existing = new Set(staticMatches.map(s => s.symbol));
      const extra = cryptoMatches.filter(c => !existing.has(c.symbol));
      setSuggestions([...staticMatches, ...extra].slice(0, 8));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const doSearch = async (sym, type) => {
    setLoading(true);
    setError("");
    setSuggestions([]);
    try {
      const res = await fetch(`${API_BASE}/api/scan/symbol?symbol=${sym}&asset_type=${type}&timeframe=15m`, { method: "POST" });
      const data = await res.json();
      if (data.signal) { onResult(data.signal); onClose(); }
      else { setError(`No signal found for ${sym}`); setLoading(false); }
    } catch {
      setError("Search failed");
      setLoading(false);
    }
  };

  const selectSuggestion = (s) => doSearch(s.symbol, s.assetType);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      if (highlighted >= 0 && suggestions[highlighted]) selectSuggestion(suggestions[highlighted]);
      else { const sym = query.trim().split(/[\s—]/)[0].toUpperCase(); doSearch(sym, detectAssetType(sym)); }
    }
    else if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-500 rounded-2xl w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-600">
          {loading
            ? <RefreshCw size={18} className="text-blue-400 animate-spin flex-shrink-0" />
            : <Search size={18} className="text-gray-400 flex-shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setError(""); }}
            onKeyDown={onKeyDown}
            placeholder="Search any symbol or name..."
            className="flex-1 bg-transparent text-white text-base placeholder-gray-500 focus:outline-none"
            autoComplete="off"
          />
          {query && <button onClick={() => setQuery("")} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>}
        </div>

        {suggestions.length > 0 && (
          <ul className="max-h-72 overflow-y-auto divide-y divide-dark-700/50">
            {suggestions.map((s, i) => (
              <li
                key={s.symbol}
                onMouseDown={() => selectSuggestion(s)}
                className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${i === highlighted ? "bg-blue-600/20" : "hover:bg-dark-700"}`}
              >
                <span className="font-mono font-bold text-white w-28 flex-shrink-0 text-sm">{s.symbol}</span>
                <span className="text-gray-400 text-sm flex-1 truncate">{s.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.assetType === "crypto" ? "bg-yellow-500/15 text-yellow-300" : s.assetType === "forex" ? "bg-purple-500/15 text-purple-300" : "bg-blue-500/15 text-blue-300"}`}>
                  {s.assetType}
                </span>
              </li>
            ))}
          </ul>
        )}

        {error && <div className="px-5 py-3 text-sm text-red-400 border-t border-dark-600">{error}</div>}

        {!suggestions.length && !error && (
          <div className="px-5 py-3 text-xs text-gray-600 border-t border-dark-600">
            Type a name or ticker and press Enter — or pick from the list above
          </div>
        )}
      </div>
    </div>
  );
}

function PaperTradeModal({ signal, portfolio, trades, onConfirm, onCancel }) {
  const initDollar = Math.min(1000, portfolio.balance);
  const [entry, setEntry] = useState(String(signal.entry));
  const [stopLoss, setStopLoss] = useState(String(signal.stop_loss));
  const [takeProfit, setTakeProfit] = useState(String(signal.take_profit));
  const [dollarAmount, setDollarAmount] = useState(String(initDollar));
  const [shares, setShares] = useState(signal.entry > 0 ? (initDollar / signal.entry).toFixed(4) : "0");

  const hasDuplicate = trades.some(t => t.symbol === signal.symbol && !t.closed_at);
  const entryNum = parseFloat(entry) || 0;

  const handleDollarChange = (val) => {
    setDollarAmount(val);
    const d = parseFloat(val) || 0;
    setShares(entryNum > 0 ? (d / entryNum).toFixed(4) : "0");
  };

  const handleSharesChange = (val) => {
    setShares(val);
    const s = parseFloat(val) || 0;
    setDollarAmount((s * entryNum).toFixed(2));
  };

  const handleEntryChange = (val) => {
    setEntry(val);
    const e = parseFloat(val) || 0;
    const d = parseFloat(dollarAmount) || 0;
    setShares(e > 0 ? (d / e).toFixed(4) : "0");
  };

  const dollarNum = parseFloat(dollarAmount) || 0;
  const sharesNum = parseFloat(shares) || 0;
  const slNum = parseFloat(stopLoss) || 0;
  const tpNum = parseFloat(takeProfit) || 0;
  const isBuy = signal.direction === "BUY";

  const error = hasDuplicate
    ? `Already have an open position in ${signal.symbol}`
    : dollarNum <= 0
    ? "Enter a valid amount"
    : dollarNum > portfolio.balance
    ? "Insufficient balance"
    : entryNum <= 0
    ? "Entry price must be greater than 0"
    : null;

  const inputCls = "w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500 text-center";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onCancel}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">📝 Paper Trade</h2>
            <DirectionBadge direction={signal.direction} />
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="text-white font-semibold text-base mb-4">{signal.symbol} <span className="text-gray-500 text-sm font-normal capitalize">{signal.asset_type}</span></div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1 text-center">Entry</div>
            <input type="number" min="0" step="any" value={entry} onChange={e => handleEntryChange(e.target.value)} className={inputCls} />
          </div>
          <div>
            <div className="text-xs text-red-400 mb-1 text-center">Stop Loss</div>
            <input type="number" min="0" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className={`${inputCls} text-sell`} />
          </div>
          <div>
            <div className="text-xs text-green-400 mb-1 text-center">Take Profit</div>
            <input type="number" min="0" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className={`${inputCls} text-buy`} />
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Dollar Amount ($)</label>
            <input
              type="number" min="0" step="any"
              value={dollarAmount}
              onChange={e => handleDollarChange(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Shares / Units</label>
            <input
              type="number" min="0" step="any"
              value={shares}
              onChange={e => handleSharesChange(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4">
          Available balance: <span className="text-white font-medium">{fmtUSD(portfolio.balance)}</span>
        </div>

        {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => !error && onConfirm(sharesNum, dollarNum, entryNum, slNum, tpNum)}
            disabled={!!error}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${isBuy ? "bg-green-600 hover:bg-green-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"}`}
          >
            Confirm {signal.direction}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaperTradePage({ trades, portfolio, onClose, onReset }) {
  const [livePrices, setLivePrices] = useState({});

  const openTrades = trades.filter(t => !t.closed_at);
  const closedTrades = trades.filter(t => t.closed_at).sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at));

  const fetchLivePrices = useCallback(async () => {
    if (!openTrades.length) return;
    const results = await Promise.allSettled(
      openTrades.map(async t => {
        const r = await fetch(`${API_BASE}/api/price/${t.asset_type}/${t.symbol}`);
        const { price } = await r.json();
        return { symbol: t.symbol, price };
      })
    );
    const map = {};
    results.forEach(r => { if (r.status === "fulfilled") map[r.value.symbol] = r.value.price; });
    setLivePrices(map);
  }, [openTrades.length]);

  useEffect(() => {
    fetchLivePrices();
    const id = setInterval(fetchLivePrices, 60_000);
    return () => clearInterval(id);
  }, [fetchLivePrices]);

  const openPositionValues = openTrades.reduce((sum, t) => {
    const livePrice = livePrices[t.symbol];
    const pnl = livePrice ? calcPnl(t, livePrice) : 0;
    return sum + t.dollar_amount + pnl;
  }, 0);

  const currentValue = portfolio.balance + openPositionValues;
  const totalPnl = currentValue - portfolio.starting_balance;
  const totalPnlPct = (totalPnl / portfolio.starting_balance) * 100;

  const wins = closedTrades.filter(t => t.pnl > 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : null;

  const reasonBadge = (reason) => {
    if (reason === "take_profit") return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">TP Hit</span>;
    if (reason === "stop_loss") return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">SL Hit</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">Manual</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Paper Trading</h2>
        <button
          onClick={() => { if (window.confirm("Reset portfolio to $100,000? All trades will be cleared.")) onReset(); }}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-dark-600 hover:border-red-500/30"
        >
          Reset Portfolio
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Current Value", value: fmtUSD(currentValue), color: "text-white" },
          { label: "Total P&L", value: `${fmtUSD(totalPnl, true)} (${fmtPct(totalPnlPct)})`, color: totalPnl >= 0 ? "text-buy" : "text-sell" },
          { label: "Win Rate", value: winRate !== null ? `${winRate.toFixed(0)}%` : "—", color: winRate !== null ? (winRate >= 50 ? "text-buy" : "text-sell") : "text-gray-400" },
          { label: "Trades", value: `${openTrades.length} open / ${closedTrades.length} closed`, color: "text-gray-300" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-sm sm:text-base font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Open Positions</h3>
        {openTrades.length === 0 ? (
          <div className="bg-dark-800 border border-dark-600 rounded-xl py-10 text-center text-gray-500 text-sm">
            No open positions. Find a signal and click 📝 Paper Trade.
          </div>
        ) : (
          <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600 bg-dark-700">
                  {["Symbol", "Dir", "Entry", "Live", "P&L $", "P&L %", "SL", "TP", ""].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openTrades.map(t => {
                  const livePrice = livePrices[t.symbol];
                  const pnl = livePrice ? calcPnl(t, livePrice) : null;
                  const pnlPct = pnl !== null ? (pnl / t.dollar_amount) * 100 : null;
                  return (
                    <tr key={t.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                      <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap">{t.symbol}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><DirectionBadge direction={t.direction} /></td>
                      <td className="px-3 py-2.5 font-mono text-sm whitespace-nowrap">{t.entry_price}</td>
                      <td className="px-3 py-2.5 font-mono text-sm whitespace-nowrap">{livePrice ? livePrice.toFixed(4) : "—"}</td>
                      <td className={`px-3 py-2.5 font-mono text-sm whitespace-nowrap font-semibold ${pnl === null ? "text-gray-500" : pnl >= 0 ? "text-buy" : "text-sell"}`}>{fmtUSD(pnl, true)}</td>
                      <td className={`px-3 py-2.5 text-sm whitespace-nowrap font-semibold ${pnlPct === null ? "text-gray-500" : pnlPct >= 0 ? "text-buy" : "text-sell"}`}>{fmtPct(pnlPct)}</td>
                      <td className="px-3 py-2.5 font-mono text-sm text-sell whitespace-nowrap">{t.stop_loss}</td>
                      <td className="px-3 py-2.5 font-mono text-sm text-buy whitespace-nowrap">{t.take_profit}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <button
                          onClick={() => onClose(t.id)}
                          className="px-2.5 py-1 rounded text-xs bg-dark-600 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-dark-500 hover:border-red-500/30 transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {closedTrades.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Trade History</h3>
          <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600 bg-dark-700">
                  {["Symbol", "Dir", "Entry", "Close", "P&L $", "P&L %", "Reason", "Date"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedTrades.map(t => {
                  const pnlPct = t.pnl !== null && t.dollar_amount > 0 ? (t.pnl / t.dollar_amount) * 100 : null;
                  return (
                    <tr key={t.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                      <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap">{t.symbol}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><DirectionBadge direction={t.direction} /></td>
                      <td className="px-3 py-2.5 font-mono text-sm whitespace-nowrap">{t.entry_price}</td>
                      <td className="px-3 py-2.5 font-mono text-sm whitespace-nowrap">{t.close_price}</td>
                      <td className={`px-3 py-2.5 font-mono text-sm whitespace-nowrap font-semibold ${t.pnl === null ? "text-gray-500" : t.pnl >= 0 ? "text-buy" : "text-sell"}`}>{fmtUSD(t.pnl, true)}</td>
                      <td className={`px-3 py-2.5 text-sm whitespace-nowrap font-semibold ${pnlPct === null ? "text-gray-500" : pnlPct >= 0 ? "text-buy" : "text-sell"}`}>{fmtPct(pnlPct)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{reasonBadge(t.close_reason)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(t.closed_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function HelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
          <h2 className="text-white font-bold text-lg">How to use this dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-5 text-sm text-gray-300">

          {/* Data freshness callout */}
          <div className="rounded-lg border border-dark-500 overflow-hidden">
            <div className="bg-dark-700 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data freshness — know before you trade</div>
            <div className="divide-y divide-dark-700">
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2"><span className="text-yellow-400 font-bold">Crypto</span><span className="text-xs text-gray-500">Binance</span></div>
                <div className="text-right"><span className="text-green-400 font-medium text-xs">Near real-time</span><div className="text-gray-600 text-xs">Scans refresh every 5 min</div></div>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2"><span className="text-blue-400 font-bold">Stocks</span><span className="text-xs text-gray-500">yfinance</span></div>
                <div className="text-right"><span className="text-yellow-400 font-medium text-xs">~15 min delayed</span><div className="text-gray-600 text-xs">Free data feed limitation</div></div>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2"><span className="text-purple-400 font-bold">Forex / CFDs</span><span className="text-xs text-gray-500">yfinance</span></div>
                <div className="text-right"><span className="text-yellow-400 font-medium text-xs">~15 min delayed</span><div className="text-gray-600 text-xs">Free data feed limitation</div></div>
              </div>
            </div>
          </div>

          {/* Best use cases */}
          <div>
            <p className="text-white font-semibold mb-2">What this app is built for</p>
            <div className="space-y-2">
              <div className="flex gap-2.5"><span className="text-green-400 flex-shrink-0 mt-0.5">✓</span><span><span className="text-white font-medium">Swing trading (1 week+)</span> — the levels, chart defaults, and signal logic are all tuned for multi-day to multi-week holds.</span></div>
              <div className="flex gap-2.5"><span className="text-green-400 flex-shrink-0 mt-0.5">✓</span><span><span className="text-white font-medium">Crypto</span> — near real-time data, scans every 5 min. Best asset class to use this for.</span></div>
              <div className="flex gap-2.5"><span className="text-green-400 flex-shrink-0 mt-0.5">✓</span><span><span className="text-white font-medium">Stocks &amp; Forex swing</span> — 15-min delayed data is fine for week+ holds. Scan after market close, enter next morning.</span></div>
              <div className="flex gap-2.5"><span className="text-red-400 flex-shrink-0 mt-0.5">✗</span><span><span className="text-white font-medium">Stock day trading</span> — 15-min delayed prices make intraday entries unreliable. Don't use this for same-day stock trades.</span></div>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Step 1 — Find a setup</p>
            <p>On the <span className="text-blue-400">Live Scanner</span> tab, look for signals with a high <span className="text-white font-medium">Score</span> (aim for 65+). Filter by asset type or direction using the buttons above the table.</p>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Step 2 — Check the direction</p>
            <div className="space-y-1.5 mt-1">
              <div className="flex items-center gap-2"><span className="text-green-400 font-bold w-10">BUY</span><span>Price likely going up — look to buy/long.</span></div>
              <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-10">SELL</span><span>Price likely going down — look to sell/short.</span></div>
              <div className="flex items-center gap-2"><span className="text-gray-400 font-bold w-10">WAIT</span><span>No clear signal. Stay out for now.</span></div>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Step 3 — Check the daily chart first</p>
            <p>Click any row to open the detail panel. The chart <span className="text-white font-medium">defaults to the 1D (daily) view</span> — this is what matters for a week+ hold. Use the Signal / 4H / 1D / 1W buttons to switch. Always confirm the bigger trend agrees with the signal before acting.</p>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Step 4 — Use the levels</p>
            <div className="bg-dark-700 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between gap-4"><span className="text-gray-400 flex-shrink-0">Entry</span><span className="text-white text-right">Current price — where you open the trade</span></div>
              <div className="flex justify-between gap-4"><span className="text-red-400 flex-shrink-0">Stop Loss</span><span className="text-white text-right">Exit here if wrong — limits your loss (min 3% stocks, 5% crypto)</span></div>
              <div className="flex justify-between gap-4"><span className="text-green-400 flex-shrink-0">Take Profit</span><span className="text-white text-right">Exit here in profit — target is at least 8% stocks, 12% crypto</span></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Risk:reward is always at least 1:2 — you risk 1 to make 2. Levels are wider on longer timeframes to avoid being shaken out.</p>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Step 5 — Run the Backtest</p>
            <p>Inside the signal detail, tap <span className="text-white font-medium">📊 Backtest</span> to see how this signal type has performed historically on the last 60 days of data. Check the win rate — below 45% means the setup hasn't been reliable lately.</p>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Reading the indicators</p>
            <div className="space-y-1.5">
              <div><span className="text-white font-medium">RSI below 35</span> — oversold, potential buy. <span className="text-white font-medium">Above 65</span> — overbought, potential sell.</div>
              <div><span className="text-white font-medium">EMA Bullish</span> — overall trend is up. EMA Bearish — trend is down.</div>
              <div><span className="text-white font-medium">Patterns</span> (e.g. "Bullish Engulfing") — candlestick formations that confirm the direction.</div>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Signal detection timeframes</p>
            <div className="space-y-1 text-gray-300">
              <div><span className="text-white font-medium">15m</span> — entry timing signal. Use the 1D chart to confirm trend, then enter on 15m.</div>
              <div><span className="text-white font-medium">30m</span> — slightly stronger confirmation. Good for entries on swing setups.</div>
              <div><span className="text-white font-medium">1h</span> — most reliable for week+ holds. Fewer signals but higher quality.</div>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Watchlist</p>
            <p>Add any symbol on the <span className="text-blue-400">Watchlist</span> tab — just type the ticker and the app auto-detects whether it's stock, crypto, or forex. Click <span className="text-white font-medium">Scan Watchlist</span> to get signals for your specific symbols only.</p>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-lg p-3 text-yellow-300 text-xs">
            <span className="font-semibold">Remember:</span> This is a technical analysis screener — it knows nothing about news, earnings, or macro events. Always check the news before entering a trade. Never risk money you can't afford to lose.
          </div>

        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("scanner");
  const [signals, setSignals] = useState([]);
  const [lastScan, setLastScan] = useState("");
  const [loading, setLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [timeframe, setTimeframe] = useState("15m");
  const [assetFilter, setAssetFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState("all");
  const [sortCol, setSortCol] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [watchlist, setWatchlist] = useState(() =>
    JSON.parse(localStorage.getItem("trading_watchlist") || "[]")
  );
  const [portfolio, setPortfolio] = useState(() =>
    JSON.parse(localStorage.getItem("paper_portfolio") || "null")
    ?? { balance: 100000, starting_balance: 100000 }
  );
  const [trades, setTrades] = useState(() =>
    JSON.parse(localStorage.getItem("paper_trades") || "[]")
  );
  const [paperTradeSignal, setPaperTradeSignal] = useState(null);

  const wsRef = useRef(null);
  const timeframeRef = useRef(timeframe);
  const tradesRef = useRef(trades);
  const portfolioRef = useRef(portfolio);
  const countdown = useCountdown(lastScan);

  useEffect(() => {
    localStorage.setItem("trading_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => { localStorage.setItem("paper_portfolio", JSON.stringify(portfolio)); }, [portfolio]);
  useEffect(() => { localStorage.setItem("paper_trades", JSON.stringify(trades)); }, [trades]);
  useEffect(() => { tradesRef.current = trades; }, [trades]);
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/signals?timeframe=${timeframe}`);
      const data = await res.json();
      setSignals(data.signals || []);
      setLastScan(data.last_scan || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  const triggerScan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/scan?timeframe=${timeframe}`, { method: "POST" });
      const data = await res.json();
      setSignals(data.signals || []);
      setLastScan(data.last_scan || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_BASE ? `${WS_BASE}/ws` : `ws://${window.location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus("connected");
      ws.onclose = () => {
        setWsStatus("disconnected");
        setTimeout(connect, 5000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "signals" && msg.timeframe === timeframeRef.current) {
          setSignals(msg.data || []);
          if (msg.last_scan) setLastScan(msg.last_scan);
        }
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      const open = tradesRef.current.filter(t => !t.closed_at);
      if (!open.length) return;
      const closures = (await Promise.allSettled(
        open.map(async t => {
          const r = await fetch(`${API_BASE}/api/price/${t.asset_type}/${t.symbol}`);
          const { price } = await r.json();
          const hit = t.direction === "BUY"
            ? (price <= t.stop_loss ? "stop_loss" : price >= t.take_profit ? "take_profit" : null)
            : (price >= t.stop_loss ? "stop_loss" : price <= t.take_profit ? "take_profit" : null);
          return hit ? { id: t.id, price, reason: hit } : null;
        })
      )).filter(r => r.status === "fulfilled" && r.value).map(r => r.value);
      if (!closures.length) return;
      let updatedTrades = tradesRef.current;
      let updatedPortfolio = portfolioRef.current;
      closures.forEach(({ id, price, reason }) => {
        const result = applyCloseTrade(id, price, reason, updatedTrades, updatedPortfolio);
        updatedTrades = result.updatedTrades;
        updatedPortfolio = result.newPortfolio;
      });
      setTrades(updatedTrades);
      setPortfolio(updatedPortfolio);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleOpenTrade = (shares, dollarAmount, customEntry, customSL, customTP) => {
    const overriddenSignal = { ...paperTradeSignal, entry: customEntry, stop_loss: customSL, take_profit: customTP };
    const { newTrade, newPortfolio } = buildOpenTrade(overriddenSignal, shares, dollarAmount, portfolio);
    setTrades(prev => [...prev, newTrade]);
    setPortfolio(newPortfolio);
    setPaperTradeSignal(null);
    setActiveTab("paper");
  };

  const handleManualClose = async (tradeId) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;
    let price = trade.entry_price;
    try {
      const r = await fetch(`${API_BASE}/api/price/${trade.asset_type}/${trade.symbol}`);
      price = (await r.json()).price;
    } catch {}
    const { updatedTrades, newPortfolio } = applyCloseTrade(tradeId, price, "manual", trades, portfolio);
    setTrades(updatedTrades);
    setPortfolio(newPortfolio);
  };

  const handleResetPortfolio = () => {
    setPortfolio({ balance: 100000, starting_balance: 100000 });
    setTrades([]);
  };

  const handleSort = (col) => {
    setSortCol(prev => {
      if (prev === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); return col; }
      setSortDir("desc");
      return col;
    });
  };

  const toggleWatchlist = (signal) => {
    const exists = watchlist.some(w => w.symbol === signal.symbol && w.assetType === signal.asset_type);
    if (exists) {
      setWatchlist(prev => prev.filter(w => !(w.symbol === signal.symbol && w.assetType === signal.asset_type)));
    } else {
      setWatchlist(prev => [...prev, { symbol: signal.symbol, assetType: signal.asset_type, timeframe: signal.timeframe }]);
    }
  };

  const filtered = signals.filter(s => {
    if (assetFilter !== "all" && s.asset_type !== assetFilter) return false;
    if (dirFilter !== "all" && s.direction !== dirFilter) return false;
    return true;
  });

  const buyCount = filtered.filter(s => s.direction === "BUY").length;
  const sellCount = filtered.filter(s => s.direction === "SELL").length;

  return (
    <div className="min-h-screen bg-dark-900 text-gray-200">
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSearch && <SearchModal onResult={(sig) => { setSelectedSignal(sig); }} onClose={() => setShowSearch(false)} />}
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-600 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white">📈 Trading Signals</h1>
            <p className="text-xs text-gray-500 hidden sm:block mt-0.5">US Stocks · Crypto · Forex/CFDs</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 bg-dark-700 border border-dark-600 hover:border-dark-400 rounded-xl text-sm text-gray-400 hover:text-white transition-colors group"
            >
              <Search size={14} className="group-hover:text-blue-400 transition-colors" />
              <span className="hidden sm:inline">Search...</span>
            </button>
            <div className={`flex items-center gap-1 text-xs ${wsStatus === "connected" ? "text-buy" : "text-gray-500"}`}>
              {wsStatus === "connected" ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span className="hidden sm:inline">{wsStatus === "connected" ? "Live" : "Reconnecting..."}</span>
            </div>
            {lastScan && (
              <div className="text-xs text-gray-500 text-right hidden sm:block">
                <div>Last scan: {new Date(lastScan).toLocaleTimeString()}</div>
                {countdown !== null && (
                  <div className={countdown === "0:00" ? "text-blue-400 animate-pulse" : "text-gray-500"}>
                    Next in {countdown === "0:00" ? "scanning..." : countdown}
                  </div>
                )}
              </div>
            )}
            <a
              href="https://paypal.me/ebinstanley19"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
              title="Support this project"
            >☕ Donate</a>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-dark-500 text-gray-400 hover:text-white hover:border-gray-400 text-sm font-bold transition-colors"
              title="How to use"
            >?</button>
            <button
              onClick={triggerScan}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{loading ? "Scanning..." : "Scan Now"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar — desktop only; mobile uses bottom nav */}
      <div className="hidden sm:block bg-dark-800 border-b border-dark-600 px-6">
        <div className="max-w-7xl mx-auto flex gap-0">
          {[
            { id: "scanner", label: "Live Scanner" },
            { id: "watchlist", label: `Watchlist${watchlist.length > 0 ? ` (${watchlist.length})` : ""}` },
            { id: "paper", label: `Paper Trading${trades.filter(t => !t.closed_at).length > 0 ? ` (${trades.filter(t => !t.closed_at).length})` : ""}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "paper" ? (
        <PaperTradePage
          trades={trades}
          portfolio={portfolio}
          onClose={handleManualClose}
          onReset={handleResetPortfolio}
        />
      ) : activeTab === "scanner" ? (
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Showing", value: filtered.length, color: "text-white" },
              { label: "BUY Setups", value: buyCount, color: "text-buy" },
              { label: "SELL Setups", value: sellCount, color: "text-sell" },
              { label: "Avg Score", value: filtered.length ? (filtered.reduce((a, b) => a + b.score, 0) / filtered.length).toFixed(0) + "/100" : "—", color: "text-blue-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
              {TIMEFRAMES.map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${timeframe === tf ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                  {tf}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
              {ASSET_FILTERS.map(f => (
                <button key={f} onClick={() => setAssetFilter(assetFilter === f && f !== "all" ? "all" : f)}
                  className={`px-3 py-1.5 rounded text-sm font-medium capitalize transition-colors ${assetFilter === f ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
              {DIRECTION_FILTERS.map(f => (
                <button key={f} onClick={() => setDirFilter(dirFilter === f && f !== "all" ? "all" : f)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${dirFilter === f ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <SignalTable
            signals={filtered}
            loading={loading}
            emptyMsg="No signals yet — click Scan Now"
            onRowClick={setSelectedSignal}
            selectedSignal={selectedSignal}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
          />

          <p className="text-xs text-gray-600 mt-4 text-center">
            Signals update every 5 minutes. Click any row for full details. This tool is for informational purposes only — not financial advice.
          </p>
        </main>
      ) : (
        <WatchlistPage
          watchlist={watchlist}
          setWatchlist={setWatchlist}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          selectedSignal={selectedSignal}
          setSelectedSignal={setSelectedSignal}
        />
      )}

      <SignalDetail
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
        watchlist={watchlist}
        onToggleWatchlist={toggleWatchlist}
        onPaperTrade={(sig) => { setSelectedSignal(null); setPaperTradeSignal(sig); }}
      />

      {paperTradeSignal && (
        <PaperTradeModal
          signal={paperTradeSignal}
          portfolio={portfolio}
          trades={trades}
          onConfirm={handleOpenTrade}
          onCancel={() => setPaperTradeSignal(null)}
        />
      )}

      {/* Bottom nav — mobile only */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-600 flex z-40">
        {[
          { id: "scanner",   label: "Scanner",   icon: "📊" },
          { id: "watchlist", label: `Watchlist${watchlist.length > 0 ? ` (${watchlist.length})` : ""}`, icon: "⭐" },
          { id: "paper",     label: "Paper",     icon: "📝" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${activeTab === tab.id ? "text-blue-400" : "text-gray-500"}`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowSearch(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium text-gray-500"
        >
          <Search size={18} />
          Search
        </button>
        <a
          href="https://paypal.me/ebinstanley19"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium text-yellow-500"
        >
          <span className="text-lg leading-none">☕</span>
          Donate
        </a>
        <button
          onClick={() => setShowHelp(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium text-gray-500"
        >
          <span className="text-lg leading-none">?</span>
          Help
        </button>
      </nav>

      {/* Spacer so content isn't hidden behind bottom nav on mobile */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
