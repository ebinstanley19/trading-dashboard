import asyncio
import aiohttp
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from .signal_engine import analyze

# Top 50 most active US stocks to scan
TOP_US_STOCKS = [
    "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "AMD", "PLTR",
    "INTC", "BAC", "F", "SOFI", "RIVN", "LCID", "NIO", "SNAP", "UBER",
    "LYFT", "HOOD", "COIN", "MARA", "RIOT", "CLSK", "MSTR", "GME", "AMC",
    "SPY", "QQQ", "IWM", "XLF", "ARKK", "BABA", "JD", "PDD", "XPEV",
    "LI", "NFLX", "DIS", "PYPL", "XYZ", "SHOP", "ZM", "RBLX", "DKNG",
    "PENN", "ABNB", "DASH", "SPOT", "TWLO",
]

# Top 20 crypto pairs (Binance format)
TOP_CRYPTO = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "MATICUSDT",
    "LINKUSDT", "UNIUSDT", "ATOMUSDT", "LTCUSDT", "ETCUSDT",
    "XLMUSDT", "ALGOUSDT", "NEARUSDT", "FTMUSDT", "ARBUSDT",
]

# Forex/CFD symbols (display names) mapped to yfinance tickers
TOP_FOREX = [
    "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD",
    "USDCHF", "NZDUSD", "GBPJPY", "EURJPY", "EURGBP",
    "XAUUSD", "XAGUSD", "US30", "US500", "NAS100", "GER40",
    "USOIL", "UKOIL",
]

_FOREX_YF_MAP = {
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "AUDUSD": "AUDUSD=X",
    "USDCAD": "USDCAD=X",
    "USDCHF": "USDCHF=X",
    "NZDUSD": "NZDUSD=X",
    "GBPJPY": "GBPJPY=X",
    "EURJPY": "EURJPY=X",
    "EURGBP": "EURGBP=X",
    "XAUUSD": "GC=F",
    "XAGUSD": "SI=F",
    "US30": "^DJI",
    "US500": "^GSPC",
    "NAS100": "^NDX",
    "GER40": "^GDAXI",
    "USOIL": "CL=F",
    "UKOIL": "BZ=F",
}

_BINANCE_SEM: tuple | None = None  # (loop, semaphore) — recreated if loop changes
_YF_SEM: tuple | None = None


def _binance_sem() -> asyncio.Semaphore:
    global _BINANCE_SEM
    loop = asyncio.get_event_loop()
    if _BINANCE_SEM is None or _BINANCE_SEM[0] is not loop:
        _BINANCE_SEM = (loop, asyncio.Semaphore(5))  # max 5 concurrent Binance requests
    return _BINANCE_SEM[1]


def _yf_sem() -> asyncio.Semaphore:
    global _YF_SEM
    loop = asyncio.get_event_loop()
    if _YF_SEM is None or _YF_SEM[0] is not loop:
        _YF_SEM = (loop, asyncio.Semaphore(5))  # max 5 concurrent yfinance threads
    return _YF_SEM[1]


_TF_MAP_YF = {
    "15m": ("5d", "15m"),
    "30m": ("5d", "30m"),
    "1h": ("30d", "60m"),
}

_TF_MAP_BINANCE = {
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
}


def _normalize_yf_df(df: pd.DataFrame) -> pd.DataFrame | None:
    if df.empty:
        return None
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[0].lower() for col in df.columns]
    else:
        df.columns = [c.lower() for c in df.columns]
    if "adj close" in df.columns:
        df = df.rename(columns={"adj close": "close"})
    if "volume" not in df.columns:
        df["volume"] = 0.0
    cols = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
    df = df[cols].dropna()
    return df if len(df) >= 50 else None


async def fetch_stock_candles(symbol: str, timeframe: str = "15m") -> pd.DataFrame | None:
    period, interval = _TF_MAP_YF.get(timeframe, ("5d", "15m"))
    try:
        async with _yf_sem():
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(
                None,
                lambda: yf.download(symbol, period=period, interval=interval, progress=False, auto_adjust=True),
            )
        return _normalize_yf_df(df)
    except Exception:
        return None


async def fetch_forex_candles(symbol: str, timeframe: str = "15m") -> pd.DataFrame | None:
    yf_symbol = _FOREX_YF_MAP.get(symbol)
    if not yf_symbol:
        return None
    period, interval = _TF_MAP_YF.get(timeframe, ("5d", "15m"))
    try:
        async with _yf_sem():
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(
                None,
                lambda: yf.download(yf_symbol, period=period, interval=interval, progress=False, auto_adjust=True),
            )
        return _normalize_yf_df(df)
    except Exception:
        return None


async def fetch_crypto_candles(symbol: str, timeframe: str = "15m") -> pd.DataFrame | None:
    interval = _TF_MAP_BINANCE.get(timeframe, "15m")
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit=200"
    try:
        async with _binance_sem():
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    data = await resp.json()
        rows = []
        for k in data:
            rows.append({
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5]),
                "time": datetime.fromtimestamp(k[0] / 1000, tz=timezone.utc),
            })
        df = pd.DataFrame(rows).set_index("time")
        return df if len(df) >= 50 else None
    except Exception:
        return None


async def fetch_crypto_price(symbol: str) -> float | None:
    url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}"
    try:
        async with _binance_sem():
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    data = await resp.json()
        return float(data["price"])
    except Exception:
        return None


async def fetch_stock_price(symbol: str) -> float | None:
    try:
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, lambda: yf.Ticker(symbol))
        info = await loop.run_in_executor(None, lambda: ticker.fast_info)
        return float(info.last_price)
    except Exception:
        return None


async def fetch_forex_price(symbol: str) -> float | None:
    yf_symbol = _FOREX_YF_MAP.get(symbol)
    if not yf_symbol:
        return None
    try:
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, lambda: yf.Ticker(yf_symbol))
        info = await loop.run_in_executor(None, lambda: ticker.fast_info)
        return float(info.last_price)
    except Exception:
        return None


async def fetch_options_suggestion(symbol: str, direction: str, current_price: float) -> dict | None:
    """Suggest a call (BUY) or put (SELL) option ~21 DTE for a US stock."""
    try:
        loop = asyncio.get_event_loop()
        async with _yf_sem():
            ticker = await loop.run_in_executor(None, lambda: yf.Ticker(symbol))
            expirations = await loop.run_in_executor(None, lambda: ticker.options)

        if not expirations:
            return None

        today = datetime.now(timezone.utc).date()
        best_expiry = min(
            (e for e in expirations if (datetime.strptime(e, "%Y-%m-%d").date() - today).days >= 7),
            key=lambda e: abs((datetime.strptime(e, "%Y-%m-%d").date() - today).days - 21),
            default=None,
        )
        if not best_expiry:
            return None

        dte = (datetime.strptime(best_expiry, "%Y-%m-%d").date() - today).days

        # Earnings date check
        earnings_date = None
        try:
            cal = await loop.run_in_executor(None, lambda: ticker.calendar)
            ed_list = cal.get("Earnings Date", []) if isinstance(cal, dict) else []
            earnings_date = str(ed_list[0].date()) if ed_list else None
        except Exception:
            pass

        # Historical volatility (30-day annualised)
        hv = None
        try:
            async with _yf_sem():
                hist = await loop.run_in_executor(None, lambda: yf.download(
                    symbol, period="60d", interval="1d", progress=False, auto_adjust=True))
            if not hist.empty and len(hist) >= 10:
                closes = hist["Close"].squeeze().dropna()
                log_ret = np.log(closes / closes.shift(1)).dropna()
                hv = float(log_ret.tail(30).std() * (252 ** 0.5))
        except Exception:
            pass

        async with _yf_sem():
            chain = await loop.run_in_executor(None, lambda: ticker.option_chain(best_expiry))

        if direction == "BUY":
            df = chain.calls
            target = current_price * 1.02
            df = df[(df["strike"] >= current_price * 0.97) & (df["strike"] <= current_price * 1.08)]
            opt_type = "CALL"
        else:
            df = chain.puts
            target = current_price * 0.98
            df = df[(df["strike"] >= current_price * 0.92) & (df["strike"] <= current_price * 1.03)]
            opt_type = "PUT"

        df = df[df["ask"] > 0]
        if df.empty:
            return None

        best = df.iloc[(df["strike"] - target).abs().argsort().iloc[0]]

        def safe(val):
            return None if pd.isna(val) else val

        bid = safe(best.get("bid"))
        ask = safe(best.get("ask"))
        iv = safe(best.get("impliedVolatility"))
        mid = round((float(bid) + float(ask)) / 2, 2) if bid is not None and ask is not None else None

        # IV vs HV classification
        iv_vs_hv = "NORMAL"
        if iv is not None and hv and hv > 0:
            r = float(iv) / hv
            if r > 1.3:
                iv_vs_hv = "HIGH"
            elif r < 0.8:
                iv_vs_hv = "LOW"

        # Earnings within expiry window?
        earnings_warning = False
        if earnings_date:
            try:
                ed = datetime.strptime(earnings_date, "%Y-%m-%d").date()
                earnings_warning = today <= ed <= datetime.strptime(best_expiry, "%Y-%m-%d").date()
            except Exception:
                pass

        return {
            "type": opt_type,
            "strike": float(best["strike"]),
            "expiry": best_expiry,
            "dte": dte,
            "bid": round(float(bid), 2) if bid is not None else None,
            "ask": round(float(ask), 2) if ask is not None else None,
            "mid": mid,
            "cost_per_contract": round(mid * 100, 2) if mid else None,
            "iv": round(float(iv) * 100, 1) if iv is not None else None,
            "hv": round(hv * 100, 1) if hv is not None else None,
            "iv_vs_hv": iv_vs_hv,
            "earnings_date": earnings_date,
            "earnings_warning": earnings_warning,
            "volume": int(safe(best.get("volume")) or 0),
            "open_interest": int(safe(best.get("openInterest")) or 0),
            "contract": str(best.get("contractSymbol", "")),
        }
    except Exception:
        return None


_TF_MAP_YF_BT = {"15m": ("60d", "15m"), "30m": ("60d", "30m"), "1h": ("730d", "60m")}


async def fetch_stock_candles_backtest(symbol: str, timeframe: str = "15m") -> pd.DataFrame | None:
    period, interval = _TF_MAP_YF_BT.get(timeframe, ("60d", "15m"))
    try:
        async with _yf_sem():
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(
                None,
                lambda: yf.download(symbol, period=period, interval=interval, progress=False, auto_adjust=True),
            )
        if df is None or df.empty:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0].lower() for col in df.columns]
        else:
            df.columns = [c.lower() for c in df.columns]
        if "adj close" in df.columns:
            df = df.rename(columns={"adj close": "close"})
        if "volume" not in df.columns:
            df["volume"] = 0.0
        cols = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
        return df[cols].dropna()
    except Exception:
        return None


async def fetch_crypto_candles_backtest(symbol: str, timeframe: str = "15m") -> pd.DataFrame | None:
    interval = _TF_MAP_BINANCE.get(timeframe, "15m")
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit=1000"
    try:
        async with _binance_sem():
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    data = await resp.json()
        rows = [
            {"open": float(k[1]), "high": float(k[2]), "low": float(k[3]),
             "close": float(k[4]), "volume": float(k[5]),
             "time": datetime.fromtimestamp(k[0] / 1000, tz=timezone.utc)}
            for k in data
        ]
        return pd.DataFrame(rows).set_index("time") if rows else None
    except Exception:
        return None


def _backtest_sync(df: pd.DataFrame, symbol: str, asset_type: str,
                   timeframe: str, min_score: float, lookahead: int) -> dict:
    wins, win_pcts, loss_pcts, signals_fired = 0, [], [], 0
    total = len(df)
    for i in range(50, total - lookahead):
        sig = analyze(symbol, df.iloc[i - 50:i].copy(), asset_type, timeframe)
        if not sig or sig.direction == "WAIT" or sig.score < min_score:
            continue
        signals_fired += 1
        entry = df["close"].iloc[i - 1]
        future = df["close"].iloc[i - 1 + lookahead]
        if entry == 0:
            continue
        pct = abs((future - entry) / entry * 100)
        won = future > entry if sig.direction == "BUY" else future < entry
        (win_pcts if won else loss_pcts).append(pct)
        if won:
            wins += 1
    tf_min = {"15m": 15, "30m": 30, "1h": 60}.get(timeframe, 15)
    return {
        "symbol": symbol,
        "asset_type": asset_type,
        "timeframe": timeframe,
        "min_score": min_score,
        "lookahead": lookahead,
        "lookahead_label": f"{lookahead} bars ({lookahead * tf_min} min)",
        "signal_count": signals_fired,
        "win_rate": round(wins / signals_fired * 100, 1) if signals_fired else None,
        "avg_win_pct": round(sum(win_pcts) / len(win_pcts), 2) if win_pcts else 0.0,
        "avg_loss_pct": round(sum(loss_pcts) / len(loss_pcts), 2) if loss_pcts else 0.0,
        "bars_analyzed": total - 50 - lookahead,
    }


async def backtest_symbol(symbol: str, asset_type: str, timeframe: str = "15m",
                          min_score: float = 60, lookahead: int = 4) -> dict | None:
    if asset_type == "forex":
        return {"error": "Backtesting not supported for forex"}
    fetch = fetch_stock_candles_backtest if asset_type == "stock" else fetch_crypto_candles_backtest
    df = await fetch(symbol, timeframe)
    if df is None or len(df) < 54:
        return None
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _backtest_sync, df, symbol, asset_type, timeframe, min_score, lookahead)


# Aliases kept for any external callers
fetch_ctrader_candles = fetch_forex_candles
fetch_ctrader_price = fetch_forex_price
