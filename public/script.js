const socket = io();

let latestData = [];
let currentSignalFilter = "ALL";
let currentSymbolFilter = "";
let sortColumn = null;
let sortDesc = false;
let currentGoal = 5000;
let persistentSignals = {}; // Holds recent signals for intraday persistence

function updateGoal() {
  const val = document.getElementById("daily-goal-input").value;
  currentGoal = parseFloat(val) || 5000;
  renderTable(); // Re-render to update the progress bar and goal math
}

// Event Listeners for Filters
document.getElementById("filter-symbol")?.addEventListener("input", (e) => {
  currentSymbolFilter = e.target.value.toUpperCase();
  renderTable();
});

document.getElementById("filter-signal")?.addEventListener("change", (e) => {
  currentSignalFilter = e.target.value;
  renderTable();
});

function sortBy(column) {
  if (sortColumn === column) sortDesc = !sortDesc;
  else {
    sortColumn = column;
    sortDesc = false;
  }
  renderTable();
}

socket.on("tick", (data) => {
  latestData = data;

  // Update persistent signals for Intraday/longer display
  const now = Date.now();
  latestData.forEach((stock) => {
    if (stock.analysis.signal.includes("STRONG")) {
      persistentSignals[stock.symbol] = {
        ...stock,
        triggeredSignal: stock.analysis.signal,
        triggeredZ: stock.analysis.z,
        timestamp: now,
      };
    }
  });

  // Remove expired signals (e.g. older than 60 minutes)
  for (let sym in persistentSignals) {
    if (now - persistentSignals[sym].timestamp > 60 * 60 * 1000) {
      delete persistentSignals[sym];
    }
  }

  renderTable();
});

function renderTable() {
  const tbody = document.getElementById("portfolio-body");

  // Apply Filters
  let filteredData = latestData.filter((stock) => {
    // Accurately parse qty and filter out "New" items (0 qty) from Active Portfolio
    const qty =
      stock.qty !== undefined
        ? stock.qty
        : stock.quantity !== undefined
          ? stock.quantity
          : 1;
    if (qty === 0) return false;

    const matchesSignal =
      currentSignalFilter === "ALL" ||
      stock.analysis.signal === currentSignalFilter;
    const matchesSymbol = stock.symbol
      .toUpperCase()
      .includes(currentSymbolFilter);
    return matchesSignal && matchesSymbol;
  });

  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">No matching stocks found.</td></tr>`;
    return;
  }

  // Apply Sorting
  if (sortColumn) {
    filteredData.sort((a, b) => {
      let valA, valB;
      if (sortColumn === "symbol") {
        valA = a.symbol;
        valB = b.symbol;
      } else if (sortColumn === "ltp") {
        valA = a.ltp;
        valB = b.ltp;
      } else if (sortColumn === "avg") {
        valA = a.avg;
        valB = b.avg;
      } else if (sortColumn === "pnl") {
        valA = (a.ltp - a.avg) / a.avg;
        valB = (b.ltp - b.avg) / b.avg;
      } else if (sortColumn === "z") {
        valA = parseFloat(a.analysis.z);
        valB = parseFloat(b.analysis.z);
      } else if (sortColumn === "signal") {
        valA = a.analysis.signal;
        valB = b.analysis.signal;
      }

      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }

  let totalUnrealizedPnl = 0;
  let tableHtml = "";

  filteredData.forEach((stock) => {
    // Calculate P&L Percentage
    const pnlPercent = (((stock.ltp - stock.avg) / stock.avg) * 100).toFixed(2);
    const pnlClass = pnlPercent >= 0 ? "text-success" : "text-danger";
    const qty =
      stock.qty !== undefined
        ? stock.qty
        : stock.quantity !== undefined
          ? stock.quantity
          : 1;
    totalUnrealizedPnl += (stock.ltp - stock.avg) * qty; // Tally total P&L

    let row = `
            <tr>
                <td class="fw-bold">${stock.symbol} <span class="badge bg-secondary ms-1">${qty} Qty</span></td>
                <td>₹${stock.ltp.toFixed(2)}</td>
                <td>₹${stock.avg}</td>
                <td class="${pnlClass}">${pnlPercent >= 0 ? "+" : ""}${pnlPercent}%</td>
                <td>${stock.analysis.z}</td>
                <td class="${stock.analysis.color} fw-bold">${stock.analysis.signal}</td>
                <td>
                    <div class="btn-group shadow-sm" role="group">
                        <button class="btn btn-sm btn-buy text-white" onclick="placeOrder('${stock.symbol}', 1, 'BUY')">BUY</button>
                        <button class="btn btn-sm btn-danger" onclick="placeOrder('${stock.symbol}', ${qty}, 'SELL')">SELL</button>
                        <button class="btn btn-sm btn-outline-info" title="Average Down" onclick="calculateAverageBuy('${stock.symbol}', ${stock.ltp}, ${stock.avg}, ${qty})"><i class="bi bi-calculator"></i> AVG</button>
                    </div>
                </td>
            </tr>
        `;

    // If Strong Signal recently triggered, inject tip directly below this row
    const pSignal = persistentSignals[stock.symbol];
    if (pSignal) {
      row += `
        <tr>
          <td colspan="7" class="border-top-0 pt-0 pb-3">
            <div class="alert alert-info py-2 px-3 mb-0 shadow-sm border-info text-dark d-flex align-items-center rounded-3">
              <i class="bi bi-fire text-danger fs-5 me-2"></i>
              <span style="font-size: 0.85rem;"><strong>HOT TIP:</strong> This position triggered a <strong>${pSignal.triggeredSignal}</strong> reversal setup (Z: ${pSignal.triggeredZ}) at ${new Date(pSignal.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}. Consider taking action to boost P&L.</span>
            </div>
          </td>
        </tr>`;
    }

    tableHtml += row;
  });

  tbody.innerHTML = tableHtml; // Update DOM only once to prevent visual flicker

  updateRightSidebar(totalUnrealizedPnl);
}

function updateRightSidebar(totalUnrealizedPnl) {
  // 1. Update Daily Goal & P&L Progress
  document.getElementById("total-pnl").innerText =
    `₹${totalUnrealizedPnl.toFixed(2)}`;
  document.getElementById("total-pnl").className =
    `fw-bold ${totalUnrealizedPnl >= 0 ? "text-success" : "text-danger"}`;

  const goal = currentGoal;
  document.getElementById("profit-progress").style.width =
    `${Math.max(0, Math.min(100, (totalUnrealizedPnl / goal) * 100))}%`;

  const goalStrategy = document.getElementById("goal-strategy");
  if (totalUnrealizedPnl >= goal) {
    goalStrategy.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i> Goal Reached!</span><br><span class="text-light opacity-75">Consider trailing your stop losses to protect profits.</span>`;
  } else {
    const remaining = goal - totalUnrealizedPnl;
    goalStrategy.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i> ₹${remaining.toFixed(2)} remaining.</span><br><span class="text-light opacity-75 d-block mt-2">💡 <strong>Strategy:</strong> To safely clear this, look for a 1% capture by risking ~₹${(remaining * 100).toFixed(0)} capital on strong mean-reversion signals.</span>`;
  }

  // 2. Build Actionable Ideas List (Includes both new and existing holdings)
  const actionableIdeas = document.getElementById("actionable-ideas");
  let ideasHtml = "";

  // Use persistentSignals instead of latestData so tips persist on screen
  Object.values(persistentSignals).forEach((pSignal) => {
    const isNew = pSignal.qty === 0 || pSignal.quantity === 0;
    const action = pSignal.triggeredSignal === "STRONG BUY" ? "ADD" : "DROP";
    const actionColor =
      pSignal.triggeredSignal === "STRONG BUY" ? "text-success" : "text-danger";
    const icon =
      pSignal.triggeredSignal === "STRONG BUY"
        ? "bi-arrow-up-circle-fill"
        : "bi-arrow-down-circle-fill";
    const btnClass =
      pSignal.triggeredSignal === "STRONG BUY"
        ? "btn-outline-success"
        : "btn-outline-danger";
    const btnText = pSignal.triggeredSignal === "STRONG BUY" ? "BUY" : "SELL";
    const qtyToTrade = isNew ? 10 : pSignal.qty || pSignal.quantity || 1; // Suggest buying 10 if new, else sell all holdings
    const timeStr = new Date(pSignal.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    ideasHtml += `
        <li class="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center py-2">
          <div>
            <span class="${actionColor} fw-bold me-2" style="font-size: 0.75rem;"><i class="bi ${icon}"></i> ${action}</span>
            <span class="text-light">${pSignal.symbol}</span>
            ${isNew ? '<span class="badge bg-primary ms-1" style="font-size: 0.6rem;">NEW</span>' : ""}
            <div class="text-secondary mt-1" style="font-size: 0.65rem;"><i class="bi bi-clock"></i> ${timeStr} | Z: ${pSignal.triggeredZ}</div>
          </div>
          <button class="btn btn-sm ${btnClass} py-0 px-2" style="font-size: 0.7rem;" onclick="placeOrder('${pSignal.symbol}', ${qtyToTrade}, '${btnText}')">${btnText}</button>
        </li>
      `;
  });

  if (ideasHtml === "") {
    actionableIdeas.innerHTML = `<li class="list-group-item bg-transparent text-secondary text-center py-3 border-0">No strong signals right now.</li>`;
  } else {
    actionableIdeas.innerHTML = ideasHtml;
  }

  // 3. Update Risk Heatmap (Based on Average Z-Score of Portfolio)
  const avgZ = latestData.length
    ? latestData.reduce((acc, stock) => acc + parseFloat(stock.analysis.z), 0) /
      latestData.length
    : 0;
  const heatmap = document.getElementById("risk-heatmap");
  if (avgZ <= -1) {
    heatmap.className =
      "mt-3 p-3 rounded text-center fw-bold small border border-success bg-success bg-opacity-25 text-success";
    heatmap.innerText = "BULLISH / LOW RISK";
  } else if (avgZ >= 1) {
    heatmap.className =
      "mt-3 p-3 rounded text-center fw-bold small border border-danger bg-danger bg-opacity-25 text-danger";
    heatmap.innerText = "BEARISH / HIGH RISK";
  } else {
    heatmap.className =
      "mt-3 p-3 rounded text-center fw-bold small border border-warning bg-warning bg-opacity-25 text-warning";
    heatmap.innerText = "NEUTRAL / RANGEBOUND";
  }

  document.getElementById("vix-val").innerText = "14.50 (-1.2%)"; // Mocked VIX
  document.getElementById("eod-timer").innerText =
    `${Math.max(0, 15 - new Date().getHours())}h ${Math.max(0, 30 - new Date().getMinutes())}m`;
}

// Add this function to your existing script.js
function calculateAverageBuy(symbol, currentPrice, avgPrice, currentQty) {
  const targetAvg = currentPrice * 1.01; // We want new average to be 1% above LTP

  if (currentPrice >= avgPrice) {
    alert(
      "You are already in profit or at breakeven. No need to average down.",
    );
    return;
  }

  // Formula: New Qty = (Current Qty * (Avg Price - Target Avg)) / (Target Avg - Current Price)
  const requiredQty = Math.ceil(
    (currentQty * (avgPrice - targetAvg)) / (targetAvg - currentPrice),
  );

  if (
    confirm(
      `To bring your average to ₹${targetAvg.toFixed(2)}, you need to buy ${requiredQty} more shares of ${symbol}. Proceed?`,
    )
  ) {
    placeOrder(symbol, requiredQty, "BUY");
  }
}

function placeOrder(symbol, qty, side) {
  console.log(`Sending ${side} order for ${qty} shares of ${symbol}`);
  // This sends the order to your backend which then calls Upstox API
  fetch("/api/place-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, qty, side }),
  })
    .then((res) => res.json())
    .then((data) => alert("Order Placed Successfully!"));
}
