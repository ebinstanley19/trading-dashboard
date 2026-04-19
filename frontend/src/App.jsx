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

const TF_TV = { "15m": "15", "30m": "30", "1h": "60" };

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

function TradingViewChart({ symbol, assetType, timeframe }) {
  const tvSymbol = toTVSymbol(symbol, assetType);
  const interval = TF_TV[timeframe] || "15";
  const src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${interval}&theme=dark&style=1&locale=en&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&calendar=0&hide_volume=0`;
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-dark-600 mb-4">
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
      <td className="hidden sm:table-cell px-4 py-3 text-sm font-mono">{signal.entry}</td>
      <td className="hidden sm:table-cell px-4 py-3 text-sm font-mono text-sell">{signal.stop_loss}</td>
      <td className="hidden sm:table-cell px-4 py-3 text-sm font-mono text-buy">{signal.take_profit}</td>
      <td className="hidden sm:table-cell px-4 py-3 text-sm">
        <span className={signal.rsi < 35 ? "text-buy" : signal.rsi > 65 ? "text-sell" : "text-gray-300"}>
          {signal.rsi}
        </span>
      </td>
      <td className="hidden sm:table-cell px-4 py-3 text-sm">{rr < 0 ? "-" : `${rr.toFixed(1)}:1`}</td>
      <td className="hidden sm:table-cell px-4 py-3 text-xs text-gray-500">{signal.timeframe}</td>
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
    <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-600 bg-dark-700">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors ${col.mobile ? "" : "hidden sm:table-cell"}`}
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

function SignalDetail({ signal, onClose, watchlist, onToggleWatchlist }) {
  if (!signal) return null;
  const inWatchlist = watchlist.some(w => w.symbol === signal.symbol && w.assetType === signal.asset_type);
  const [optionsData, setOptionsData] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    if (signal.asset_type !== "stock" || signal.direction === "WAIT") return;
    setOptionsData(null);
    setOptionsLoading(true);
    fetch(`${API_BASE}/api/options/${signal.symbol}?direction=${signal.direction}&price=${signal.entry}`)
      .then(r => r.json())
      .then(d => { setOptionsData(d.option); setOptionsLoading(false); })
      .catch(() => setOptionsLoading(false));
  }, [signal.symbol, signal.direction, signal.entry]);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 max-w-3xl w-full mx-auto my-auto" onClick={e => e.stopPropagation()}>
        <TradingViewChart symbol={signal.symbol} assetType={signal.asset_type} timeframe={signal.timeframe} />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{signal.symbol}</h2>
            <span className="text-sm text-gray-400 capitalize">{signal.asset_type} · {signal.timeframe}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleWatchlist(signal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inWatchlist ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30" : "bg-dark-600 text-gray-400 hover:text-white border border-dark-500"}`}
            >
              {inWatchlist ? <StarOff size={12} /> : <Star size={12} />}
              {inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
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
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanTime, setScanTime] = useState("");

  const addToWatchlist = () => {
    const sym = addSymbol.trim().toUpperCase();
    if (!sym) return;
    if (watchlist.some(w => w.symbol === sym && w.assetType === addAssetType)) return;
    setWatchlist(prev => [...prev, { symbol: sym, assetType: addAssetType, timeframe: addTimeframe }]);
    setAddSymbol("");
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
            onChange={e => setAddSymbol(e.target.value.toUpperCase())}
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
          <kbd className="hidden sm:block text-xs text-gray-600 bg-dark-700 border border-dark-600 rounded px-1.5 py-0.5 font-mono">Esc</kbd>
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

function HelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
          <h2 className="text-white font-bold text-lg">How to use this dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-5 text-sm text-gray-300">

          <div>
            <p className="text-white font-semibold mb-2">Step 1 — Find a setup</p>
            <p>On the <span className="text-blue-400">Live Scanner</span> tab, look for signals with a high <span className="text-white font-medium">Score</span> (aim for 65+). The higher the score, the more indicators agree.</p>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Step 2 — Check the direction</p>
            <div className="space-y-1.5 mt-1">
              <div className="flex items-center gap-2"><span className="text-green-400 font-bold w-10">BUY</span><span>Price is likely going up. Look to buy/long.</span></div>
              <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-10">SELL</span><span>Price is likely going down. Look to sell/short.</span></div>
              <div className="flex items-center gap-2"><span className="text-gray-400 font-bold w-10">WAIT</span><span>No clear signal. Stay out for now.</span></div>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Step 3 — Click the signal to see the chart</p>
            <p>Click any row to open the detail panel. Check that the chart actually looks like what the signal is saying before you act on it.</p>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Step 4 — Use the levels</p>
            <div className="bg-dark-700 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-400">Entry</span><span className="text-white">The price right now — where you enter the trade</span></div>
              <div className="flex justify-between"><span className="text-red-400">Stop Loss</span><span className="text-white">Exit here if the trade goes wrong — limits your loss</span></div>
              <div className="flex justify-between"><span className="text-green-400">Take Profit</span><span className="text-white">Exit here when in profit — lock in your gains</span></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">The risk:reward is always 1:2 — you risk 1 to potentially make 2.</p>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Reading the indicators</p>
            <div className="space-y-1.5">
              <div><span className="text-white font-medium">RSI below 35</span> — asset is oversold, good time to buy. <span className="text-white font-medium">Above 65</span> — overbought, good time to sell.</div>
              <div><span className="text-white font-medium">EMA Bullish</span> — the overall trend is up. EMA Bearish — trend is down.</div>
              <div><span className="text-white font-medium">Patterns</span> (e.g. "Bullish Engulfing") — candlestick formations that confirm the move.</div>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">Timeframes</p>
            <div className="space-y-1">
              <div><span className="text-white font-medium">15m</span> — short trades, fast in and out (minutes to hours)</div>
              <div><span className="text-white font-medium">30m</span> — medium trades (a few hours)</div>
              <div><span className="text-white font-medium">1h</span> — stronger signals, holds longer (hours to a day)</div>
            </div>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-lg p-3 text-yellow-300 text-xs">
            <span className="font-semibold">Remember:</span> This dashboard shows potential setups based on technical indicators. Always do your own research. Never risk money you can't afford to lose.
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

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowSearch(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const [timeframe, setTimeframe] = useState("15m");
  const [assetFilter, setAssetFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState("all");
  const [sortCol, setSortCol] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [watchlist, setWatchlist] = useState(() =>
    JSON.parse(localStorage.getItem("trading_watchlist") || "[]")
  );
  const wsRef = useRef(null);
  const timeframeRef = useRef(timeframe);
  const countdown = useCountdown(lastScan);

  useEffect(() => {
    localStorage.setItem("trading_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

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

  const buyCount = signals.filter(s => s.direction === "BUY").length;
  const sellCount = signals.filter(s => s.direction === "SELL").length;

  return (
    <div className="min-h-screen bg-dark-900 text-gray-200">
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSearch && <SearchModal onResult={(sig) => { setSelectedSignal(sig); }} onClose={() => setShowSearch(false)} />}
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-600 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">📈 Trading Signal Scanner</h1>
            <p className="text-xs text-gray-500 mt-0.5">US Stocks · Crypto · Forex/CFDs</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 bg-dark-700 border border-dark-600 hover:border-dark-400 rounded-xl text-sm text-gray-400 hover:text-white transition-colors group"
            >
              <Search size={14} className="group-hover:text-blue-400 transition-colors" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden md:inline-flex items-center gap-1 text-xs text-gray-600 bg-dark-600 border border-dark-500 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
            </button>
            <div className={`flex items-center gap-1.5 text-xs ${wsStatus === "connected" ? "text-buy" : "text-gray-500"}`}>
              {wsStatus === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}
              {wsStatus === "connected" ? "Live" : "Reconnecting..."}
            </div>
            {lastScan && (
              <div className="text-xs text-gray-500 text-right">
                <div>Last scan: {new Date(lastScan).toLocaleTimeString()}</div>
                {countdown !== null && (
                  <div className={countdown === "0:00" ? "text-blue-400 animate-pulse" : "text-gray-500"}>
                    Next scan in {countdown === "0:00" ? "scanning..." : countdown}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-dark-500 text-gray-400 hover:text-white hover:border-gray-400 text-sm font-bold transition-colors"
              title="How to use"
            >?</button>
            <button
              onClick={triggerScan}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Scanning..." : "Scan Now"}
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-dark-800 border-b border-dark-600 px-6">
        <div className="max-w-7xl mx-auto flex gap-0">
          {[
            { id: "scanner", label: "Live Scanner" },
            { id: "watchlist", label: `Watchlist${watchlist.length > 0 ? ` (${watchlist.length})` : ""}` },
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

      {activeTab === "scanner" ? (
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Signals", value: signals.length, color: "text-white" },
              { label: "BUY Setups", value: buyCount, color: "text-buy" },
              { label: "SELL Setups", value: sellCount, color: "text-sell" },
              { label: "Avg Score", value: signals.length ? (signals.reduce((a, b) => a + b.score, 0) / signals.length).toFixed(0) + "/100" : "—", color: "text-blue-400" },
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
                <button key={f} onClick={() => setAssetFilter(f)}
                  className={`px-3 py-1.5 rounded text-sm font-medium capitalize transition-colors ${assetFilter === f ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
              {DIRECTION_FILTERS.map(f => (
                <button key={f} onClick={() => setDirFilter(f)}
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
      />
    </div>
  );
}
