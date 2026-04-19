import React, { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const TIMEFRAMES = ["15m", "30m", "1h"];
const ASSET_FILTERS = ["all", "stock", "crypto", "forex"];
const DIRECTION_FILTERS = ["all", "BUY", "SELL", "WAIT"];

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

function SignalDetail({ signal, onClose }) {
  if (!signal) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{signal.symbol}</h2>
            <span className="text-sm text-gray-400 capitalize">{signal.asset_type} · {signal.timeframe}</span>
          </div>
          <DirectionBadge direction={signal.direction} />
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

export default function App() {
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
  const wsRef = useRef(null);
  const timeframeRef = useRef(timeframe);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/signals?timeframe=${timeframe}`);
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
      const res = await fetch(`/api/scan?timeframe=${timeframe}`, { method: "POST" });
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
      const ws = new WebSocket(`ws://${window.location.host}/ws`);
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
      if (prev === col) {
        setSortDir(d => d === "asc" ? "desc" : "asc");
        return col;
      }
      setSortDir("desc");
      return col;
    });
  };

  const sorted = [...signals]
    .filter(s => {
      if (assetFilter !== "all" && s.asset_type !== assetFilter) return false;
      if (dirFilter !== "all" && s.direction !== dirFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let av = sortCol === "_rr" ? computeRR(a) : a[sortCol];
      let bv = sortCol === "_rr" ? computeRR(b) : b[sortCol];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const buyCount = signals.filter(s => s.direction === "BUY").length;
  const sellCount = signals.filter(s => s.direction === "SELL").length;

  return (
    <div className="min-h-screen bg-dark-900 text-gray-200">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-600 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">📈 Trading Signal Scanner</h1>
            <p className="text-xs text-gray-500 mt-0.5">US Stocks · Crypto · Forex/CFDs</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 text-xs ${wsStatus === "connected" ? "text-buy" : "text-gray-500"}`}>
              {wsStatus === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}
              {wsStatus === "connected" ? "Live" : "Reconnecting..."}
            </div>
            {lastScan && (
              <span className="text-xs text-gray-500">
                Last scan: {new Date(lastScan).toLocaleTimeString()}
              </span>
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
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${timeframe === tf ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
            {ASSET_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setAssetFilter(f)}
                className={`px-3 py-1.5 rounded text-sm font-medium capitalize transition-colors ${assetFilter === f ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-dark-800 border border-dark-600 rounded-lg p-1">
            {DIRECTION_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setDirFilter(f)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${dirFilter === f ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Signal Table */}
        <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600 bg-dark-700">
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
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
                      {loading ? "Scanning markets..." : "No signals yet — click Scan Now"}
                    </td>
                  </tr>
                ) : (
                  sorted.map((s, i) => (
                    <SignalRow
                      key={`${s.symbol}-${i}`}
                      signal={s}
                      onClick={setSelectedSignal}
                      selected={selectedSignal?.symbol === s.symbol}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-4 text-center">
          Signals update every 5 minutes. Click any row for full details. This tool is for informational purposes only — not financial advice.
        </p>
      </main>

      <SignalDetail signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
    </div>
  );
}
