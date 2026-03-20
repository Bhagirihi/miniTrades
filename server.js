require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { SMA, SD, EMA, RSI } = require("technicalindicators");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let myPortfolio = []; // Global state to hold your real Upstox portfolio

// --- PAPER TRADING STATE ---
let paperCash = 100000; // ₹1,000,000 starting virtual cash
let paperHoldings = [];
let paperLogs = [];
let isAutoPaperTradeActive = false;
let totalPaperTrades = 0;
let totalBrokerage = 0;

const DATA_DIR = process.env.DATA_DIR || __dirname;
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

// --- STRATEGY LOGIC ---
function analyzeMarket(prices) {
  if (prices.length < 20) return { signal: "SCANNING", color: "text-gray" };

  const period = 20;
  const sma = SMA.calculate({ period, values: prices }).pop();
  const sd = SD.calculate({ period, values: prices }).pop();
  const lastPrice = prices[prices.length - 1];

  const zScore = (lastPrice - sma) / sd;

  // High Probability Mean Reversion Thresholds
  if (zScore < -2.5)
    return {
      signal: "STRONG BUY",
      color: "text-success",
      z: zScore.toFixed(2),
    };
  if (zScore > 2.5)
    return {
      signal: "STRONG SELL",
      color: "text-danger",
      z: zScore.toFixed(2),
    };
  return { signal: "NEUTRAL", color: "text-warning", z: zScore.toFixed(2) };
}

// --- INTRADAY INDICES STRATEGY (EMA + RSI + SUPERTREND) ---
function analyzeIntradayIndices(prices) {
  if (prices.length < 21)
    return { signal: "SCANNING", color: "text-secondary", z: "WAIT" };

  const lastPrice = prices[prices.length - 1];
  const ema9 = EMA.calculate({ period: 9, values: prices }).pop() || lastPrice;
  const ema21 =
    EMA.calculate({ period: 21, values: prices }).pop() || lastPrice;
  const rsi = RSI.calculate({ period: 14, values: prices }).pop() || 50;

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
  if (ema9 > ema21 && rsi > 55 && superTrend === "BULLISH") {
    return {
      signal: "STRONG BUY",
      color: "text-success",
      z: `RSI ${rsi.toFixed(0)}`,
    };
  }
  if (ema9 < ema21 && rsi < 45 && superTrend === "BEARISH") {
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

// --- UPSTOX API HANDLERS ---
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
        // Seed fake history around the real last price to keep Z-Score running for now
        history: Array.from(
          { length: 25 },
          () => (h.last_price || 100) + (Math.random() * 10 - 5),
        ),
      }));
      console.log(`✅ Loaded ${myPortfolio.length} real holdings from Upstox!`);
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

// --- UPSTOX AUTH ROUTES ---
app.get("/login", (req, res) => {
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

    await updatePortfolio(); // Fetch holdings immediately after auth
    res.send(
      "<h1>Authenticated! Redirecting to Terminal...</h1><script>setTimeout(() => window.location.href = '/', 1500);</script>",
    );
  } catch (e) {
    res.status(500).send("Auth Failed");
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

// --- REAL-TIME EMITTER ---
let tickCounter = 0; // Tracks time for smooth price simulation
io.on("connection", (socket) => {
  setInterval(async () => {
    tickCounter++;
    let dataToProcess = [];

    if (myPortfolio.length > 0) {
      // Simulate realistic smooth market cycles using a sine wave
      dataToProcess = myPortfolio.map((stock, index) => {
        const trend = Math.sin(tickCounter / 10 + index) * 2; // Smooth up/down wave
        const noise = Math.random() * 0.5 - 0.25; // Tiny bit of random noise
        const newLtp = stock.ltp + trend + noise;

        stock.ltp = newLtp;
        stock.history.shift(); // remove oldest price
        stock.history.push(newLtp); // add newest price
        return stock;
      });
    } else {
      // Fallback Mock Data if not logged in or portfolio is empty
      dataToProcess = [
        {
          symbol: "RELIANCE",
          qty: 10,
          ltp: 2450 + Math.sin(tickCounter / 10) * 15,
          avg: 2440,
          history: Array.from(
            { length: 25 },
            (_, i) => 2450 + Math.sin((tickCounter - 25 + i) / 10) * 15,
          ),
        },
        {
          symbol: "NIFTY_FUT",
          qty: 1,
          ltp: 22100 - Math.sin(tickCounter / 10) * 30,
          avg: 22150,
          history: Array.from(
            { length: 25 },
            (_, i) => 22100 - Math.sin((tickCounter - 25 + i) / 10) * 30,
          ),
        },
        {
          symbol: "BANKNIFTY_FUT",
          qty: 1,
          ltp: 46000 - Math.sin(tickCounter / 10) * 50,
          avg: 46150,
          history: Array.from(
            { length: 25 },
            (_, i) => 46000 - Math.sin((tickCounter - 25 + i) / 10) * 50,
          ),
        },
      ];
    }

    // Inject new non-portfolio opportunities to test the "Shares to Add" widget
    const screenerStocks = [
      {
        symbol: "HDFCBANK",
        qty: 0,
        ltp: 1450 + Math.sin(tickCounter / 8) * 15,
        avg: 0,
        history: Array.from(
          { length: 25 },
          (_, i) => 1450 + Math.sin((tickCounter - 25 + i) / 8) * 15,
        ),
      },
      {
        symbol: "TCS",
        qty: 0,
        ltp: 3900 - Math.sin(tickCounter / 12) * 20,
        avg: 0,
        history: Array.from(
          { length: 25 },
          (_, i) => 3900 - Math.sin((tickCounter - 25 + i) / 12) * 20,
        ),
      },
    ];
    dataToProcess = [...dataToProcess, ...screenerStocks];

    const processed = dataToProcess.map((s) => {
      const isIndex = s.symbol.includes("NIFTY");
      return {
        ...s,
        analysis: isIndex
          ? analyzeIntradayIndices(s.history)
          : analyzeMarket(s.history),
      };
    });

    // --- AUTO PAPER TRADER LOGIC ---
    let paperStateChanged = false;
    if (isAutoPaperTradeActive) {
      const now = new Date();
      // Force the time evaluation to use Indian Standard Time (IST)
      const istString = now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      const istDate = new Date(istString);
      const hours = istDate.getHours();
      const minutes = istDate.getMinutes();
      const isSquareOffTime = (hours === 15 && minutes >= 25) || hours > 15;

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

          paperLogs.unshift({
            time: new Date().toLocaleTimeString(),
            action: "SQUARE OFF",
            symbol: stock.symbol,
            qty: exists.qty,
            price: stock.ltp,
            pnl,
          });
          paperStateChanged = true;
          totalPaperTrades++;
          return; // Exit iteration
        }

        // 1. Check Stop-Loss, Trailing Stop-Loss (0.5% from High), and Take-Profit (1.5%)
        if (exists) {
          exists.highPrice = Math.max(
            exists.highPrice || exists.avg,
            stock.ltp,
          );
          const pnlPct = (stock.ltp - exists.avg) / exists.avg;
          const dropFromHigh =
            (exists.highPrice - stock.ltp) / exists.highPrice;

          let closeReason = null;
          if (pnlPct >= 0.015) closeReason = "TAKE PROFIT";
          else if (dropFromHigh >= 0.005)
            closeReason = pnlPct > 0 ? "TRAILING STOP" : "STOP LOSS";

          if (closeReason) {
            const revenue = exists.qty * stock.ltp;
            const brokerage = Math.min(20, revenue * 0.0005); // Upstox Intraday Brokerage Calc
            totalBrokerage += brokerage;
            const pnl = revenue - exists.qty * exists.avg - brokerage;
            paperCash += revenue - brokerage;

            exists.status = closeReason;
            exists.exitPrice = stock.ltp;
            exists.pnl = pnl;

            paperLogs.unshift({
              time: new Date().toLocaleTimeString(),
              action: closeReason,
              symbol: stock.symbol,
              qty: exists.qty,
              price: stock.ltp,
              pnl,
            });
            paperStateChanged = true;
            totalPaperTrades++;
            return; // Exit iteration
          }
        }

        // 2. Standard Strategy Signals
        if (stock.analysis.signal === "STRONG BUY" && !isSquareOffTime) {
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
                  });
                }
                paperLogs.unshift({
                  time: new Date().toLocaleTimeString(),
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
        } else if (stock.analysis.signal === "STRONG SELL") {
          if (exists) {
            const revenue = exists.qty * stock.ltp;
            const brokerage = Math.min(20, revenue * 0.0005);
            totalBrokerage += brokerage;
            const pnl = revenue - exists.qty * exists.avg - brokerage;
            paperCash += revenue - brokerage;

            exists.status = "SELL";
            exists.exitPrice = stock.ltp;
            exists.pnl = pnl;

            paperLogs.unshift({
              time: new Date().toLocaleTimeString(),
              action: "SELL",
              symbol: stock.symbol,
              qty: exists.qty,
              price: stock.ltp,
              pnl,
            });
            paperStateChanged = true;
            totalPaperTrades++;
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

    // Update live LTP for active paper holdings to calculate unrealized P&L
    paperHoldings.forEach((ph) => {
      if (ph.status === "ACTIVE") {
        const live = processed.find((p) => p.symbol === ph.symbol);
        if (live) ph.ltp = live.ltp;
      }
    });

    socket.emit("tick", processed);
    socket.emit("paper-state", {
      paperCash,
      paperHoldings,
      paperLogs,
      isAutoPaperTradeActive,
      totalPaperTrades,
      totalBrokerage,
    });
  }, 1000);
});

// Fetch portfolio immediately on startup if we have a saved token
if (process.env.ACCESS_TOKEN) {
  updatePortfolio();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🔥 Server live at port ${PORT}`));
