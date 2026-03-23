require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { SMA, SD, EMA, RSI, MACD } = require("technicalindicators");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { DateTime } = require("luxon");
const WebSocket = require("ws");
const protobuf = require("protobufjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let myPortfolio = []; // Global state to hold your real Upstox portfolio
let upstoxAvailableFunds = 0; // Holds your live Upstox funds

// --- PAPER TRADING STATE ---
let paperCash = 100000; // ₹1,000,000 starting virtual cash
let paperHoldings = [];
let paperLogs = [];
let isAutoPaperTradeActive = false;
let totalPaperTrades = 0;
let totalBrokerage = 0;

// --- ALGO TRADING STATE ---
let isAlgoTradeActive = false;
let algoHoldings = []; // Tracks only what the bot buys
let pendingOrders = new Set(); // Prevents duplicate order spamming
const ALGO_RISK_PER_TRADE = 5000; // Maximum real ₹ to risk per trade

// --- LIVE DATA FEED STATE ---
let marketWs = null;
let protobufRoot = null;

const PROTO_PATH = path.join(__dirname, "MarketDataFeed.proto");
if (fs.existsSync(PROTO_PATH)) {
  protobuf.load(PROTO_PATH, (err, root) => {
    if (!err) {
      protobufRoot = root;
      console.log("✅ Upstox Protobuf schema loaded for Live WebSockets.");
    }
  });
}

let DATA_DIR = process.env.DATA_DIR || __dirname;

// Ensure the data directory exists before attempting to write files
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (error) {
    console.warn(
      `⚠️ Could not create DATA_DIR at ${DATA_DIR}. Falling back to project root.`,
    );
    DATA_DIR = __dirname;
  }
}

const PAPER_STATE_FILE = path.join(DATA_DIR, "paper-state.json");
const TOKEN_FILE = path.join(DATA_DIR, "upstox-token.json");

// Load existing state if available
if (fs.existsSync(PAPER_STATE_FILE)) {
  try {
    const savedState = JSON.parse(fs.readFileSync(PAPER_STATE_FILE, "utf8"));
    paperCash =
      savedState.paperCash !== undefined ? savedState.paperCash : 100000;
    paperHoldings = (savedState.paperHoldings || []).map((h) => ({
      ...h,
      status: h.status || "ACTIVE",
      highPrice: h.highPrice || h.ltp || h.avg,
    }));
    paperLogs = savedState.paperLogs || [];
    isAutoPaperTradeActive = savedState.isAutoPaperTradeActive || false;
    totalPaperTrades = savedState.totalPaperTrades || 0;
    totalBrokerage = savedState.totalBrokerage || 0;
    console.log(
      `✅ Loaded Paper Trading state from disk (${paperHoldings.length} holdings).`,
    );
  } catch (e) {
    console.error("❌ Failed to parse paper-state.json:", e);
  }
}

// Load existing token if available
if (fs.existsSync(TOKEN_FILE)) {
  try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    if (tokenData.access_token) {
      process.env.ACCESS_TOKEN = tokenData.access_token;
      console.log("✅ Loaded saved Upstox access token from disk.");
    }
  } catch (e) {
    console.error("❌ Failed to parse upstox-token.json:", e);
  }
}

function savePaperState() {
  fs.writeFileSync(
    PAPER_STATE_FILE,
    JSON.stringify(
      {
        paperCash,
        paperHoldings,
        paperLogs,
        isAutoPaperTradeActive,
        totalPaperTrades,
        totalBrokerage,
      },
      null,
      2,
    ),
  );
}

function getISTDateTime() {
  return DateTime.now()
    .setZone("Asia/Kolkata")
    .toFormat("dd/MM/yyyy, hh:mm:ss a");
}

let lastEodDumpDate = null;
function saveEodPaperTradeDump() {
  const istDate = DateTime.now().setZone("Asia/Kolkata");
  const datetimeStr = istDate.toFormat("yyyy-MM-dd_HH-mm-ss");
  const historyDir = path.join(DATA_DIR, "history");
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
  const filePath = path.join(historyDir, `paperTrade_${datetimeStr}.csv`);

  const headers =
    "SYMBOL,QTY,AVG BUY,BUY TIME,LTP / EXIT,EXIT TIME,P&L,STATUS\n";
  const rows = paperHoldings
    .map((h) => {
      const displayPrice = h.exitPrice || h.ltp;
      const pnl = h.pnl || h.qty * h.ltp - h.qty * h.avg;
      return `"${h.symbol}",${h.qty},${h.avg.toFixed(2)},"${h.buyTime || "--"}",${displayPrice.toFixed(2)},"${h.exitTime || "--"}",${pnl.toFixed(2)},"${h.status}"`;
    })
    .join("\n");
  fs.writeFileSync(filePath, headers + rows);
}

// --- STRATEGY LOGIC ---
function analyzeMarket(prices) {
  if (prices.length < 50) return { signal: "SCANNING", color: "text-gray" };

  const period = 20;
  const sma20 = SMA.calculate({ period, values: prices }).pop();
  const sd = SD.calculate({ period, values: prices }).pop();
  const sma50 = SMA.calculate({ period: 50, values: prices }).pop();
  const lastPrice = prices[prices.length - 1];

  const zScore = (lastPrice - sma20) / sd;

  // High Probability Mean Reversion Thresholds
  if (zScore < -2.5 && lastPrice > sma50)
    return {
      signal: "STRONG BUY",
      color: "text-success",
      z: zScore.toFixed(2),
    };
  if (zScore > 2.5 && lastPrice < sma50)
    return {
      signal: "STRONG SELL",
      color: "text-danger",
      z: zScore.toFixed(2),
    };
  return { signal: "NEUTRAL", color: "text-warning", z: zScore.toFixed(2) };
}

// --- INTRADAY INDICES STRATEGY (EMA + RSI + SUPERTREND) ---
function analyzeIntradayIndices(prices) {
  if (prices.length < 50)
    return { signal: "SCANNING", color: "text-secondary", z: "WAIT" };

  const lastPrice = prices[prices.length - 1];
  const ema9 = EMA.calculate({ period: 9, values: prices }).pop() || lastPrice;
  const ema21 =
    EMA.calculate({ period: 21, values: prices }).pop() || lastPrice;
  const rsi = RSI.calculate({ period: 14, values: prices }).pop() || 50;

  // MACD (12, 26, 9)
  const macdInput = {
    values: prices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  };
  const macdResult = MACD.calculate(macdInput);
  const currentMacd =
    macdResult.length > 0
      ? macdResult[macdResult.length - 1]
      : { histogram: 0 };
  const prevMacd =
    macdResult.length > 1
      ? macdResult[macdResult.length - 2]
      : { histogram: 0 };

  const isMacdBullish =
    currentMacd.histogram > 0 && currentMacd.histogram > prevMacd.histogram;
  const isMacdBearish =
    currentMacd.histogram < 0 && currentMacd.histogram < prevMacd.histogram;

  // Pseudo-SuperTrend (Volatility Bands using SD)
  const period = 10;
  const multiplier = 3;
  const sma = SMA.calculate({ period, values: prices }).pop() || lastPrice;
  const sd = SD.calculate({ period, values: prices }).pop() || 0;
  const upperBand = sma + multiplier * sd;
  const lowerBand = sma - multiplier * sd;

  let superTrend = "NEUTRAL";
  if (lastPrice > lowerBand + sd) superTrend = "BULLISH";
  if (lastPrice < upperBand - sd) superTrend = "BEARISH";

  // Strategy Execution Logic
  if (ema9 > ema21 && rsi > 55 && superTrend === "BULLISH" && isMacdBullish) {
    return {
      signal: "STRONG BUY",
      color: "text-success",
      z: `RSI ${rsi.toFixed(0)}`,
    };
  }
  if (ema9 < ema21 && rsi < 45 && superTrend === "BEARISH" && isMacdBearish) {
    return {
      signal: "STRONG SELL",
      color: "text-danger",
      z: `RSI ${rsi.toFixed(0)}`,
    };
  }
  return {
    signal: "NEUTRAL",
    color: "text-warning",
    z: `RSI ${rsi.toFixed(0)}`,
  };
}

// --- FETCH LIVE FUNDS ---
async function updateFunds() {
  if (!process.env.ACCESS_TOKEN) return;
  try {
    const response = await axios.get(
      "https://api.upstox.com/v2/user/get-funds-and-margin",
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          Accept: "application/json",
        },
      },
    );
    if (response.data && response.data.data && response.data.data.equity) {
      upstoxAvailableFunds = response.data.data.equity.available_margin;
    }
  } catch (error) {
    console.error("❌ Failed to fetch Upstox funds:", error.message);
  }
}

// --- UPSTOX API HANDLERS ---
async function initMarketFeed() {
  if (!process.env.ACCESS_TOKEN) return;
  if (!protobufRoot) {
    console.warn(
      "⚠️ MarketDataFeed.proto not found. Skipping live WebSockets.",
    );
    return;
  }

  try {
    const authRes = await axios.get(
      "https://api.upstox.com/v2/feed/market-data-feed/authorize",
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          Accept: "application/json",
        },
      },
    );

    const wsUrl = authRes.data.data.authorized_redirect_uri;
    if (marketWs) marketWs.close(); // Close existing connection if any

    marketWs = new WebSocket(wsUrl);

    marketWs.on("open", () => {
      console.log("🟢 Live Market Data WebSocket Connected!");
      const instrumentKeys = myPortfolio.map((s) => s.instrument_token);

      if (instrumentKeys.length > 0) {
        const subRequest = {
          guid: "trade_bot_" + Date.now(),
          method: "sub",
          data: { mode: "full", instrumentKeys: instrumentKeys },
        };
        marketWs.send(Buffer.from(JSON.stringify(subRequest)));
      }
    });

    marketWs.on("message", (data) => {
      try {
        const FeedResponse = protobufRoot.lookupType(
          "com.upstox.marketdatafeeder.rpc.proto.FeedResponse",
        );
        const decoded = FeedResponse.decode(data);
        const feeds = decoded.feeds || {};

        for (const [instrument, feed] of Object.entries(feeds)) {
          // Extract exact Last Traded Price (LTP) from the Protobuf Full Feed
          if (feed.ff && feed.ff.marketFF && feed.ff.marketFF.ltpc) {
            const ltp = feed.ff.marketFF.ltpc.ltp;
            const stock = myPortfolio.find(
              (s) => s.instrument_token === instrument,
            );
            if (stock && ltp) stock.ltp = ltp; // Instantly patch the live memory
          }
        }
      } catch (err) {
        /* Silently ignore malformed binary packets */
      }
    });

    marketWs.on("close", () => {
      console.log("🔴 Market WebSocket closed. Reconnecting in 5s...");
      setTimeout(initMarketFeed, 5000);
    });
  } catch (error) {
    console.error("❌ Failed to authorize Market Feed:", error.message);
  }
}

async function updatePortfolio() {
  if (!process.env.ACCESS_TOKEN) return;
  try {
    const response = await axios.get(
      "https://api.upstox.com/v2/portfolio/long-term-holdings",
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          Accept: "application/json",
        },
      },
    );
    if (response.data && response.data.data) {
      myPortfolio = response.data.data.map((h) => ({
        symbol: h.tradingsymbol || h.instrument_token,
        instrument_token: h.instrument_token,
        qty: h.quantity,
        avg: h.average_price,
        ltp: h.last_price || h.close_price || 0,
        close: h.close_price || h.last_price || 0,
        // Seed fake history around the real last price to keep Z-Score running for now
        history: Array.from(
          { length: 60 },
          () => (h.last_price || 100) + (Math.random() * 10 - 5),
        ),
      }));
      console.log(`✅ Loaded ${myPortfolio.length} real holdings from Upstox!`);
      initMarketFeed(); // Subscribe to real-time feed for these holdings
    }
  } catch (error) {
    console.error("❌ Failed to fetch Upstox holdings:", error.message);
    if (error.response && error.response.status === 401) {
      console.error("⚠️ Token expired. Please click 'RE-AUTH' in the UI.");
      process.env.ACCESS_TOKEN = ""; // Clear memory
      if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE); // Delete expired file
    }
  }
}

// --- AUTH STATUS CHECK ---
app.get("/api/auth-status", (req, res) => {
  res.json({ authenticated: !!process.env.ACCESS_TOKEN });
});

// --- UPSTOX AUTH ROUTES ---
app.get("/auth/upstox", (req, res) => {
  const url = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${process.env.API_KEY}&redirect_uri=${process.env.REDIRECT_URI}`;
  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const resp = await axios.post(
      "https://api.upstox.com/v2/login/authorization/token",
      new URLSearchParams({
        code,
        client_id: process.env.API_KEY,
        client_secret: process.env.API_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    );
    process.env.ACCESS_TOKEN = resp.data.access_token;

    // Save token to disk so it survives server restarts
    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify({ access_token: resp.data.access_token }, null, 2),
    );

    // Fetch holdings and funds immediately after auth
    await updatePortfolio();
    await updateFunds();

    res.send(
      "<h1>Authenticated! Redirecting to Terminal...</h1><script>setTimeout(() => window.location.href = '/', 1500);</script>",
    );
  } catch (e) {
    // Extract the exact error message from the Upstox API response
    const errorMessage =
      e.response && e.response.data
        ? JSON.stringify(e.response.data)
        : e.message;

    console.error("❌ Upstox Auth Error:", errorMessage);
    res
      .status(500)
      .send(
        `<h1>Auth Failed</h1><p style="color:red; font-family:monospace;">${errorMessage}</p><br><a href="/">Go Back</a>`,
      );
  }
});

app.post("/api/place-order", async (req, res) => {
  const { symbol, qty, side } = req.body;

  // Upstox API Order Placement
  const url = "https://api.upstox.com/v2/order/place";
  const orderData = {
    quantity: qty,
    product: "I", // 'I' for Intraday, 'D' for Delivery
    validity: "DAY",
    price: 0,
    tag: "MeanReversionBot",
    instrument_token: symbol,
    order_type: "MARKET",
    transaction_type: side,
  };

  try {
    const response = await axios.post(url, orderData, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    res.json({ status: "success", data: response.data });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/paper-toggle", (req, res) => {
  isAutoPaperTradeActive = !isAutoPaperTradeActive;
  savePaperState();
  res.json({ active: isAutoPaperTradeActive });
});

app.post("/api/paper-reset", (req, res) => {
  paperCash = 100000;
  paperHoldings = [];
  paperLogs = [];
  isAutoPaperTradeActive = false;
  totalPaperTrades = 0;
  totalBrokerage = 0;
  savePaperState();
  res.json({ status: "success" });
});

app.get("/api/paper-history/days", (req, res) => {
  const historyDir = path.join(DATA_DIR, "history");
  if (!fs.existsSync(historyDir)) {
    return res.json([]);
  }
  try {
    const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".csv"));
    const days = files.map((f) => f.replace(".csv", ""));
    // Sort dates in descending order (newest first)
    res.json(days.sort().reverse());
  } catch (err) {
    res.json([]);
  }
});

app.get("/api/paper-history/download/:day", (req, res) => {
  const { day } = req.params;
  const filePath = path.join(DATA_DIR, "history", `${day}.csv`);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

app.get("/api/paper-history/view/:day", (req, res) => {
  const { day } = req.params;
  const filePath = path.join(DATA_DIR, "history", `${day}.csv`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return res.json([]);

    const data = lines.slice(1).map((line) => {
      const values = [];
      let inQuotes = false;
      let currentVal = "";
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === "," && !inQuotes) {
          values.push(currentVal);
          currentVal = "";
        } else currentVal += char;
      }
      values.push(currentVal);

      return {
        symbol: (values[0] || "").replace(/^"|"$/g, ""),
        qty: parseInt(values[1] || 0, 10),
        avg: parseFloat(values[2] || 0),
        buyTime: (values[3] || "").replace(/^"|"$/g, ""),
        exitPrice: parseFloat(values[4] || 0),
        exitTime: (values[5] || "").replace(/^"|"$/g, ""),
        pnl: parseFloat(values[6] || 0),
        status: (values[7] || "").replace(/^"|"$/g, ""),
      };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to parse CSV" });
  }
});

app.post("/api/algo-toggle", (req, res) => {
  isAlgoTradeActive = !isAlgoTradeActive;
  res.json({ active: isAlgoTradeActive });
});

async function executeLiveAlgoOrder(symbol, qty, side) {
  if (!process.env.ACCESS_TOKEN) return false;
  const url = "https://api.upstox.com/v2/order/place";
  const orderData = {
    quantity: qty,
    product: "I", // 'I' ensures Upstox automatically closes it if server crashes
    validity: "DAY",
    price: 0,
    tag: "AlgoBot",
    instrument_token: symbol,
    order_type: "MARKET",
    transaction_type: side,
  };

  try {
    await axios.post(url, orderData, {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    console.log(`🚀 ALGO EXECUTION: ${side} ${qty}x ${symbol}`);
    return true;
  } catch (error) {
    console.error(
      `❌ ALGO ERROR (${symbol}):`,
      error.response ? error.response.data : error.message,
    );
    return false;
  }
}

// --- REAL-TIME EMITTER ---
let tickCounter = 0; // Tracks time for smooth price simulation
setInterval(async () => {
  tickCounter++;

  // --- MARKET TIME MANAGEMENT (IST) ---
  const istDate = DateTime.now().setZone("Asia/Kolkata");
  const hours = istDate.hour;
  const minutes = istDate.minute;

  // Scanner Display Window: 9:00 AM to 3:30 PM
  const isDisplayWindow =
    hours >= 9 && (hours < 15 || (hours === 15 && minutes <= 30));

  let dataToProcess = [];

  if (myPortfolio.length > 0) {
    if (isDisplayWindow) {
      // Update technical history with the actual real-time LTP from WebSocket
      myPortfolio.forEach((stock) => {
        stock.history.shift();
        stock.history.push(stock.ltp);
      });
    }
    dataToProcess = myPortfolio;
  }

  const processed = dataToProcess.map((s) => {
    const isIndex = s.symbol.includes("NIFTY");
    return {
      ...s,
      analysis: isIndex
        ? analyzeIntradayIndices(s.history)
        : analyzeMarket(s.history),
    };
  });

  // Market Hours: 9:30 AM to 3:30 PM
  const isMarketOpen =
    (hours > 9 || (hours === 9 && minutes >= 30)) &&
    (hours < 15 || (hours === 15 && minutes <= 30));
  // Auto Square-off at 3:15 PM to avoid Upstox Intraday auto-square off penalties
  const isSquareOffTime = (hours === 15 && minutes >= 15) || hours > 15;

  // --- AUTO PAPER TRADER LOGIC ---
  let paperStateChanged = false;
  if (isAutoPaperTradeActive) {
    processed.forEach((stock) => {
      const exists = paperHoldings.find(
        (h) => h.symbol === stock.symbol && h.status === "ACTIVE",
      );

      // 0. Auto Square-Off at 3:25 PM
      if (exists && isSquareOffTime) {
        const revenue = exists.qty * stock.ltp;
        const brokerage = Math.min(20, revenue * 0.0005);
        totalBrokerage += brokerage;
        const pnl = revenue - exists.qty * exists.avg - brokerage;
        paperCash += revenue - brokerage;

        exists.status = "SQUARE OFF";
        exists.exitPrice = stock.ltp;
        exists.pnl = pnl;
        exists.exitTime = getISTDateTime();

        paperLogs.unshift({
          time: getISTDateTime(),
          action: "SQUARE OFF",
          symbol: stock.symbol,
          qty: exists.qty,
          price: stock.ltp,
          pnl,
        });
        paperStateChanged = true;
        totalPaperTrades++;
        saveClosedHoldingToDayCSV(exists);
        return; // Exit iteration
      }

      // 1. Check Stop-Loss, Trailing Stop-Loss (0.5% from High), and Take-Profit (1.5%)
      if (exists) {
        exists.highPrice = Math.max(exists.highPrice || exists.avg, stock.ltp);
        const pnlPct = (stock.ltp - exists.avg) / exists.avg;
        const dropFromHigh = (exists.highPrice - stock.ltp) / exists.highPrice;

        let closeReason = null;
        if (pnlPct >= 0.025) closeReason = "TAKE PROFIT";
        else if (pnlPct <= -0.015) closeReason = "STOP LOSS";
        else if (pnlPct > 0 && dropFromHigh >= 0.01)
          closeReason = "TRAILING STOP";

        if (closeReason) {
          const revenue = exists.qty * stock.ltp;
          const brokerage = Math.min(20, revenue * 0.0005); // Upstox Intraday Brokerage Calc
          totalBrokerage += brokerage;
          const pnl = revenue - exists.qty * exists.avg - brokerage;
          paperCash += revenue - brokerage;

          exists.status = closeReason;
          exists.exitPrice = stock.ltp;
          exists.pnl = pnl;
          exists.exitTime = getISTDateTime();

          paperLogs.unshift({
            time: getISTDateTime(),
            action: closeReason,
            symbol: stock.symbol,
            qty: exists.qty,
            price: stock.ltp,
            pnl,
          });
          paperStateChanged = true;
          totalPaperTrades++;
          saveClosedHoldingToDayCSV(exists);
          return; // Exit iteration
        }
      }

      // 2. Standard Strategy Signals
      if (
        stock.analysis.signal === "STRONG BUY" &&
        isMarketOpen &&
        !isSquareOffTime
      ) {
        // Buy if it's new, OR average down if price dropped at least 1% below current average
        if (!exists || stock.ltp < exists.avg * 0.99) {
          const riskAmount = paperCash * 0.1; // Risk 10% of available cash per trade
          if (riskAmount >= stock.ltp && stock.ltp > 0) {
            const qty = Math.floor(riskAmount / stock.ltp);
            if (qty > 0) {
              const cost = qty * stock.ltp;
              const brokerage = Math.min(20, cost * 0.0005);
              totalBrokerage += brokerage;
              paperCash -= cost + brokerage;

              if (exists) {
                const totalCost = exists.qty * exists.avg + cost;
                exists.qty += qty;
                exists.avg = totalCost / exists.qty;
                exists.ltp = stock.ltp;
                exists.highPrice = Math.max(
                  exists.highPrice || exists.avg,
                  stock.ltp,
                );
              } else {
                paperHoldings.unshift({
                  symbol: stock.symbol,
                  qty,
                  avg: stock.ltp,
                  ltp: stock.ltp,
                  highPrice: stock.ltp,
                  status: "ACTIVE",
                  buyTime: getISTDateTime(),
                });
              }
              paperLogs.unshift({
                time: getISTDateTime(),
                action: "BUY",
                symbol: stock.symbol,
                qty,
                price: stock.ltp,
                pnl: 0,
              });
              paperStateChanged = true;
              totalPaperTrades++;
            }
          }
        }
      } else if (
        stock.analysis.signal === "STRONG SELL" &&
        isMarketOpen &&
        !isSquareOffTime
      ) {
        if (exists) {
          const revenue = exists.qty * stock.ltp;
          const brokerage = Math.min(20, revenue * 0.0005);
          totalBrokerage += brokerage;
          const pnl = revenue - exists.qty * exists.avg - brokerage;
          paperCash += revenue - brokerage;

          exists.status = "SELL";
          exists.exitPrice = stock.ltp;
          exists.pnl = pnl;
          exists.exitTime = getISTDateTime();

          paperLogs.unshift({
            time: getISTDateTime(),
            action: "SELL",
            symbol: stock.symbol,
            qty: exists.qty,
            price: stock.ltp,
            pnl,
          });
          paperStateChanged = true;
          totalPaperTrades++;
          saveClosedHoldingToDayCSV(exists);
        }
      }
    });

    if (paperLogs.length > 50) paperLogs = paperLogs.slice(0, 50); // Keep log short
    if (paperHoldings.length > 50) {
      const active = paperHoldings.filter((h) => h.status === "ACTIVE");
      const closed = paperHoldings
        .filter((h) => h.status !== "ACTIVE")
        .slice(0, 50);
      paperHoldings = [...active, ...closed]; // Clean old history to save memory
    }
    if (paperStateChanged) savePaperState();
  }

  // --- EOD PAPER TRADE DUMP ---
  const istDumpDate = DateTime.now().setZone("Asia/Kolkata");
  if (istDumpDate.hour === 15 && istDumpDate.minute >= 30) {
    const todayStr = istDumpDate.toFormat("yyyy-MM-dd");
    if (lastEodDumpDate !== todayStr && paperHoldings.length > 0) {
      saveEodPaperTradeDump();
      lastEodDumpDate = todayStr;
    }
  }

  // --- LIVE ALGO TRADER LOGIC ---
  if (isAlgoTradeActive && process.env.ACCESS_TOKEN) {
    for (const stock of processed) {
      if (pendingOrders.has(stock.symbol)) continue; // Lock prevents rapid-fire duplicate orders

      const existsIndex = algoHoldings.findIndex(
        (h) => h.symbol === stock.symbol,
      );
      const exists = algoHoldings[existsIndex];
      const token = stock.instrument_token || stock.symbol;

      // 0. Auto Square-Off or Safety Exits
      if (exists) {
        exists.highPrice = Math.max(exists.highPrice || exists.avg, stock.ltp);
        const pnlPct = (stock.ltp - exists.avg) / exists.avg;
        const dropFromHigh = (exists.highPrice - stock.ltp) / exists.highPrice;

        let shouldSell = isSquareOffTime; // Always sell at 3:15 PM
        if (!shouldSell) {
          if (pnlPct >= 0.025)
            shouldSell = true; // Take Profit
          else if (pnlPct <= -0.015)
            shouldSell = true; // Stop Loss
          else if (pnlPct > 0 && dropFromHigh >= 0.01)
            shouldSell = true; // Trailing Stop
          else if (stock.analysis.signal === "STRONG SELL") shouldSell = true; // Strategy
        }

        if (shouldSell) {
          pendingOrders.add(stock.symbol);
          executeLiveAlgoOrder(token, exists.qty, "SELL").then((success) => {
            if (success) algoHoldings.splice(existsIndex, 1);
            pendingOrders.delete(stock.symbol);
          });
        }
      } else if (
        stock.analysis.signal === "STRONG BUY" &&
        isMarketOpen &&
        !isSquareOffTime
      ) {
        const qty = Math.floor(ALGO_RISK_PER_TRADE / stock.ltp);
        if (qty > 0) {
          pendingOrders.add(stock.symbol);
          executeLiveAlgoOrder(token, qty, "BUY").then((success) => {
            if (success)
              algoHoldings.push({
                symbol: stock.symbol,
                qty,
                avg: stock.ltp,
                ltp: stock.ltp,
                highPrice: stock.ltp,
              });
            pendingOrders.delete(stock.symbol);
          });
        }
      }
    }
  }

  // Update live LTP for active paper holdings to calculate unrealized P&L
  paperHoldings.forEach((ph) => {
    if (ph.status === "ACTIVE") {
      const live = processed.find((p) => p.symbol === ph.symbol);
      if (live) ph.ltp = live.ltp;
    }
  });

  io.emit("tick", processed);
  io.emit("upstox-funds", upstoxAvailableFunds);
  io.emit("paper-state", {
    paperCash,
    paperHoldings,
    paperLogs,
    isAutoPaperTradeActive,
    totalPaperTrades,
    totalBrokerage,
  });
}, 1000);

io.on("connection", (socket) => {
  console.log("💻 Client connected to Live Terminal UI");
});

// Fetch portfolio immediately on startup if we have a saved token
if (process.env.ACCESS_TOKEN) {
  updatePortfolio();
  updateFunds();

  // Keep funds updated every 60 seconds to avoid API rate limits
  setInterval(updateFunds, 60000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🔥 Server live at port ${PORT}`));
