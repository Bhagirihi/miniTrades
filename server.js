const express = require("express");
const http = require("http");
const cors = require("cors");
const fs = require("fs");
const { Server } = require("socket.io");
const axios = require("axios");
const path = require("path");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 1000;

// Store all connected socket IDs in a Set
const connectedSocketIds = new Set();

// Static File path
const ordersFilePath = path.join(__dirname, "data", "orders.json");
const authController = require("./controllers/authController"); // 🔹 Import authentication controller

// ✅ Enable CORS & JSON parsing
app.use(
  cors({
    origin: ["*", "https://minitrade.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true, // Allow cookies, authorization headers
  })
);
app.use(express.json());

// ✅ WebSocket Server
const io = new Server(server, {
  cors: {
    origin: ["*", "https://minitrade.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  },
});

/**
 * ✅ Utility Function to Read Orders File
 */
const readOrdersFile = () => {
  return fs.existsSync(ordersFilePath)
    ? JSON.parse(fs.readFileSync(ordersFilePath, "utf-8"))
    : [];
};

/**
 * ✅ Utility Function to Write Orders File
 */
const writeOrdersFile = (orders, res, message) => {
  fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to save orders file." });
    }
    res.json({ message, orders });
  });
};

/**
 * ✅ Fetch NSE session cookie
 */
async function getNseCookie() {
  try {
    console.log("🔄 Fetching NSE Cookie...");
    const response = await axios.get("https://www.nseindia.com", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    return response.headers["set-cookie"].join("; ");
  } catch (error) {
    console.error("❌ Failed to fetch NSE cookie:", error.message);
    return null;
  }
}

/**
 * ✅ Central function to fetch multiple NSE data sources
 */
async function fetchNseData(urls) {
  try {
    const cookieHeader = await getNseCookie();
    if (!cookieHeader) return null;

    console.log("🔄 Fetching NSE Data...");
    const requests = urls.map((url) =>
      axios
        .get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Referer: "https://www.nseindia.com/",
            Cookie: cookieHeader,
          },
        })
        .catch((error) => {
          console.error(`❌ Error fetching ${url}:`, error.message);
          return null;
        })
    );

    const responses = await Promise.all(requests);

    return responses.map((response, index) =>
      response?.data ? { url: urls[index], data: response.data } : null
    );
  } catch (error) {
    console.error("❌ Error fetching NSE data:", error.message);
    return null;
  }
}

/**
 * ✅ Fetch & filter stock data (NIFTY, BANKNIFTY, OI, Calls, Puts)
 */
async function scrapeStockData() {
  const urls = [
    "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050",
    "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20BANK",
    "https://www.nseindia.com/api/live-analysis-oi-spurts-underlyings",
    "https://www.nseindia.com/api/snapshot-derivatives-equity?index=calls-stocks-vol",
    "https://www.nseindia.com/api/snapshot-derivatives-equity?index=puts-stocks-vol",
    "https://www.nseindia.com/api/live-analysis-most-active-securities?index=volume",
  ];

  const fetchedData = await fetchNseData(urls);
  if (!fetchedData) return null;

  // ✅ Extract relevant data
  const nifty50 = fetchedData[0]?.data?.data || [];
  const niftyBank = fetchedData[1]?.data?.data || [];
  const oiData = fetchedData[2]?.data?.data || [];
  const stockCall = fetchedData[3]?.data?.OPTSTK?.data || [];
  const stockPut = fetchedData[4]?.data?.OPTSTK?.data || [];
  const mostActive = fetchedData[5]?.data?.data || [];

  // ✅ Apply filters
  const NIFTY = nifty50.filter((item) => Math.abs(item.pChange) >= 2);
  const BANKNIFTY = niftyBank.filter((item) => Math.abs(item.pChange) >= 2);
  const OIDATA = oiData.filter((item) => item.avgInOI >= 3);
  const STOCKCALL = stockCall.filter((item) => item.pChange >= 1);
  const STOCKPUT = stockPut.filter((item) => item.pChange >= 1);

  // ✅ Merge & filter by common symbols
  const symbolCount = {};
  const symbolMap = {};

  function addStock(stock, type) {
    if (!stock.symbol) return;
    symbolCount[stock.symbol] = (symbolCount[stock.symbol] || 0) + 1;

    if (!symbolMap[stock.symbol]) {
      symbolMap[stock.symbol] = { symbol: stock.symbol, sources: [], FNO: [] };
    }

    Object.assign(symbolMap[stock.symbol], {
      lastPrice: stock.lastPrice || symbolMap[stock.symbol].lastPrice || "",
      pChange: stock.pChange || symbolMap[stock.symbol].pChange || "",
      avgInOI: stock.avgInOI || symbolMap[stock.symbol].avgInOI || "",

      dayHigh: stock.dayHigh || symbolMap[stock.symbol].dayHigh || "",
      dayLow: stock.dayLow || symbolMap[stock.symbol].dayLow || "",
      previousClose:
        stock.previousClose || symbolMap[stock.symbol].previousClose || "",
      yearHigh: stock.yearHigh || symbolMap[stock.symbol].yearHigh || "",
      yearLow: stock.yearLow || symbolMap[stock.symbol].yearLow || "",
      open: stock.open || symbolMap[stock.symbol].open || "",
      perChange30d:
        stock.perChange30d || symbolMap[stock.symbol].perChange30d || "",
      perChange365d:
        stock.perChange365d || symbolMap[stock.symbol].perChange365d || "",
    });

    symbolMap[stock.symbol].sources.push(type);
  }

  function addFnoData(stock) {
    if (!stock.underlying) return;
    symbolCount[stock.underlying] = (symbolCount[stock.underlying] || 0) + 1;

    if (!symbolMap[stock.underlying]) {
      symbolMap[stock.underlying] = {
        symbol: stock.underlying,
        sources: [],
        FNO: [],
      };
    }

    symbolMap[stock.underlying].FNO.push(stock);
  }

  // ✅ Add stocks to symbolMap
  [...NIFTY, ...BANKNIFTY, ...OIDATA, ...mostActive].forEach((stock) =>
    addStock(stock, stock.index || "General")
  );
  [...STOCKCALL, ...STOCKPUT].forEach((stock) => addFnoData(stock));

  // ✅ Keep only stocks appearing in multiple datasets
  return Object.values(symbolMap).filter(
    (stock) => symbolCount[stock.symbol] > 1
  );
}

/**
 * ✅ Fetch & filter index options (NIFTY & BANKNIFTY Calls/Puts)
 */
async function scrapeIndexData() {
  const urls = [
    "https://www.nseindia.com/api/snapshot-derivatives-equity?index=calls-index-vol",
    "https://www.nseindia.com/api/snapshot-derivatives-equity?index=puts-index-vol",
  ];

  const fetchedData = await fetchNseData(urls);
  if (!fetchedData) return null;

  const indexCall = fetchedData[0]?.data?.data || [];
  const indexPut = fetchedData[1]?.data?.data || [];

  return {
    call: indexCall
      .filter((item) => Math.abs(item.pChange) >= 2)
      .sort((a, b) => a.lastPrice - b.lastPrice),
    put: indexPut
      .filter((item) => Math.abs(item.pChange) >= 2)
      .sort((a, b) => a.lastPrice - b.lastPrice),
  };
}

/**
 * ✅ WebSocket Connection
 */
io.on("connection", (socket) => {
  console.log("📡 Client connected:", socket.id);

  // Add the socket ID to the set of connected clients
  connectedSocketIds.add(socket.id);

  setInterval(async () => {
    const StockData = await scrapeStockData();
    const IndexData = await scrapeIndexData();

    if (StockData) {
      io.emit("updateData", StockData);
    }

    if (IndexData) {
      io.emit("updateOptionCalls", IndexData.call);
      io.emit("updateOptionPuts", IndexData.put);
    }
  }, 10000);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    connectedSocketIds.delete(socket.id);
  });
});

/**
 * ✅ API Endpoints
 */

/**
 * ✅ Route to serve connected socket IDs
 */
app.get("/", (req, res) => {
  res.json({
    message: "Connected socket IDs",
    socketIds: [...connectedSocketIds],
  });
});

/**
 * ✅ Authentication Routes
 */
app.post("/reset-password", authController.resetPassword);
app.post("/forgot-password", authController.forgotPassword);
app.post("/register", authController.register);
app.post("/login", authController.login);

/**
 * ✅ Order Management Routes
 */
app.post("/addOrder", (req, res) => {
  let orders = readOrdersFile();
  const newOrder = {
    ...req.body,
    order: orders.length + 1,
    date: new Date().toLocaleString(),
  };
  orders.push(newOrder);
  writeOrdersFile(orders, res, "Order added successfully");
});

app.post("/deleteOrder", (req, res) => {
  let orders = readOrdersFile().filter(
    (order) => order.order !== Number(req.body.orderId)
  );
  writeOrdersFile(orders, res, "Order deleted successfully");
});

app.post("/updateOrder", (req, res) => {
  let orders = readOrdersFile();
  let index = orders.findIndex(
    (order) => order.order === Number(req.body.orderId)
  );
  if (index === -1) return res.status(404).json({ error: "Order not found." });

  orders[index] = { ...orders[index], ...req.body };
  writeOrdersFile(orders, res, "Order updated successfully");
});

app.post("/orderLists", (req, res) => {
  const orders = readOrdersFile();
  const tabId = req.body.tabId;

  let ordersList =
    tabId === "orders-all"
      ? orders
      : orders.filter(
          (order) => order.status === tabId.replace("orders-", "").toUpperCase()
        );

  res.json({ message: "Orders fetched successfully", ordersList });
});

app.post("/orderValues", (req, res) => {
  const orders = readOrdersFile();
  const today = new Date().toLocaleDateString("en-US");

  let filteredOrders = orders.filter((order) => order.date.includes(today));
  let totalInvest = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  let stockList = filteredOrders.map((order) => order.stock);

  res.json({
    message: "Order values fetched successfully",
    data: [{ inOrders: filteredOrders.length, totalInvest, stocks: stockList }],
  });
});

/**
 * ✅ Stock Market API Routes
 */
app.get("/api/stocks", async (req, res) => {
  const data = await scrapeStockData();
  data
    ? res.json({ success: true, data })
    : res
        .status(500)
        .json({ success: false, error: "Failed to fetch stock data" });
});

app.get("/api/index", async (req, res) => {
  const data = await scrapeIndexData();
  data
    ? res.json({ success: true, data })
    : res
        .status(500)
        .json({ success: false, error: "Failed to fetch index data" });
});

/**
 * ✅ Start Server
 */
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
