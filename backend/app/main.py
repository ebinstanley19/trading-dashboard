import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .scanner import run_scan, get_cached_signals, scan_watchlist_symbols, _scan_asset
from .data_feeds import fetch_stock_price, fetch_crypto_price, fetch_forex_price, fetch_options_suggestion, backtest_symbol

load_dotenv()

limiter = Limiter(key_func=get_remote_address)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT = os.getenv("TELEGRAM_CHAT_ID", "")
SCAN_INTERVAL = 300  # seconds between 15m scans; 30m runs every 2nd tick, 1h every 6th


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_background_scanner())
    yield
    task.cancel()


app = FastAPI(title="Trading Signal Dashboard", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ws_clients: list[WebSocket] = []


async def _background_scanner():
    tick = 0
    while True:
        try:
            timeframes_to_scan = ["15m"]
            if tick % 2 == 0:
                timeframes_to_scan.append("30m")
            if tick % 6 == 0:
                timeframes_to_scan.append("1h")

            for tf in timeframes_to_scan:
                signals = await run_scan(tf, TELEGRAM_TOKEN, TELEGRAM_CHAT)
                _, scan_time = get_cached_signals(tf)
                await _broadcast({"type": "signals", "timeframe": tf, "data": signals, "last_scan": scan_time})
        except Exception as e:
            print(f"Scanner error: {e}")
        tick += 1
        await asyncio.sleep(SCAN_INTERVAL)


async def _broadcast(message: dict):
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok"}


@app.get("/api/signals")
@limiter.limit("30/minute")
async def get_signals(request: Request, timeframe: str = "15m"):
    signals, scan_time = get_cached_signals(timeframe)
    if not signals:
        signals = await run_scan(timeframe, TELEGRAM_TOKEN, TELEGRAM_CHAT)
        _, scan_time = get_cached_signals(timeframe)
    return {"signals": signals, "last_scan": scan_time}


@app.post("/api/scan")
@limiter.limit("2/minute")
async def trigger_scan(request: Request, timeframe: str = "15m"):
    signals = await run_scan(timeframe, TELEGRAM_TOKEN, TELEGRAM_CHAT)
    _, scan_time = get_cached_signals(timeframe)
    return {"signals": signals, "last_scan": scan_time}


@app.get("/api/price/{asset_type}/{symbol}")
@limiter.limit("20/minute")
async def get_price(request: Request, asset_type: str, symbol: str):
    if asset_type == "stock":
        price = await fetch_stock_price(symbol)
    elif asset_type == "crypto":
        price = await fetch_crypto_price(symbol)
    else:
        price = await fetch_forex_price(symbol)
    return {"symbol": symbol, "price": price}


@app.post("/api/scan/symbol")
@limiter.limit("10/minute")
async def scan_single(request: Request, symbol: str, asset_type: str, timeframe: str = "15m"):
    from dataclasses import asdict
    signal = await _scan_asset(symbol.upper(), asset_type, timeframe)
    return {"signal": asdict(signal) if signal else None}


@app.get("/api/options/{symbol}")
@limiter.limit("5/minute")
async def get_options(request: Request, symbol: str, direction: str = "BUY", price: float = 0):
    result = await fetch_options_suggestion(symbol.upper(), direction, price)
    return {"option": result}


@app.get("/api/backtest/{symbol}")
@limiter.limit("5/minute")
async def get_backtest(request: Request, symbol: str, asset_type: str = "stock",
                       timeframe: str = "15m", min_score: float = 60, lookahead: int = 4):
    result = await backtest_symbol(symbol.upper(), asset_type, timeframe, min_score, lookahead)
    return {"backtest": result}


@app.post("/api/scan/watchlist")
@limiter.limit("5/minute")
async def scan_watchlist_endpoint(request: Request, body: dict):
    signals = await scan_watchlist_symbols(body.get("symbols", []), body.get("timeframe", "15m"))
    return {"signals": signals, "scan_time": datetime.now(timezone.utc).isoformat()}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.append(websocket)
    try:
        # Push all cached timeframes immediately on connect
        for tf in ["15m", "30m", "1h"]:
            signals, scan_time = get_cached_signals(tf)
            if signals:
                await websocket.send_json({"type": "signals", "timeframe": tf, "data": signals, "last_scan": scan_time})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)
