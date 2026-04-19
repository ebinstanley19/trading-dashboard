import React, { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown, Search, Star, StarOff, X, Plus } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const WS_BASE = API_BASE.replace(/^https/, "wss").replace(/^http/, "ws");
const SCAN_INTERVAL_SEC = 300;

const TIMEFRAMES = ["15m", "30m", "1h"];
const ASSET_FILTERS = ["all", "stock", "crypto", "forex"];
const ASSET_TYPES = ["stock", "crypto", "forex"];
const DIRECTION_FILTERS = ["all", "BUY", "SELL", "WAIT"];

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
  { label: "Symbol",      key: "symbol" },
  { label: "Signal",      key: "direction" },
  { label: "Score",       key: "score" },
  { label: "Entry",       key: "entry" },
  { label: "Stop Loss",   key: "stop_loss" },
  { label: "Take Profit", key: "take_profit" },
  { label: "RSI",         key: "rsi" },
  { label: "R:R",         key: "_rr" },
  { label: "TF",          key: "timeframe" },
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
      <td className="px-4 py-3 text-sm font-mono">{signal.entry}</td>
      <td className="px-4 py-3 text-sm font-mono text-sell">{signal.stop_loss}</td>
      <td className="px-4 py-3 text-sm font-mono text-buy">{signal.take_profit}</td>
      <td className="px-4 py-3 text-sm">
        <span className={signal.rsi < 35 ? "text-buy" : signal.rsi > 65 ? "text-sell" : "text-gray-300"}>
          {signal.rsi}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">{rr < 0 ? "-" : `${rr.toFixed(1)}:1`}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{signal.timeframe}</td>
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
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors"
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

function SearchBar({ onResult }) {
  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState("stock");
  const [timeframe, setTimeframe] = useState("15m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/scan/symbol?symbol=${sym}&asset_type=${assetType}&timeframe=${timeframe}`, { method: "POST" });
      const data = await res.json();
      if (data.signal) {
        onResult(data.signal);
        setSymbol("");
      } else {
        setError("No data found for this symbol");
      }
    } catch (e) {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-dark-700 border border-dark-500 rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
        <Search size={14} className="ml-3 text-gray-500 flex-shrink-0" />
        <input
          value={symbol}
          onChange={e => { setSymbol(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Symbol..."
          className="bg-transparent px-2 py-2 text-sm text-white placeholder-gray-500 focus:outline-none w-32"
        />
        <select
          value={assetType}
          onChange={e => setAssetType(e.target.value)}
          className="bg-dark-600 border-l border-dark-500 px-2 py-2 text-xs text-gray-300 focus:outline-none"
        >
          {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={timeframe}
          onChange={e => setTimeframe(e.target.value)}
          className="bg-dark-600 border-l border-dark-500 px-2 py-2 text-xs text-gray-300 focus:outline-none"
        >
          {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <button
        onClick={search}
        disabled={loading || !symbol.trim()}
        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
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
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-600 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">📈 Trading Signal Scanner</h1>
            <p className="text-xs text-gray-500 mt-0.5">US Stocks · Crypto · Forex/CFDs</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar onResult={setSelectedSignal} />
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Signals", value: signals.length, color: "text-white" },
              { label: "BUY Setups", value: buyCount, color: "text-buy" },
              { label: "SELL Setups", value: sellCount, color: "text-sell" },
              { label: "Avg Score", value: signals.length ? (signals.reduce((a, b) => a + b.score, 0) / signals.length).toFixed(0) + "/100" : "-", color: "text-blue-400" },
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
