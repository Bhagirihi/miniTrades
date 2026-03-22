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

function toggleAlgoTrade() {
  if (
    confirm(
      "🚨 WARNING: You are enabling LIVE algorithmic trading.\nThe bot will automatically execute REAL Market orders with your actual Upstox capital (Max ₹5,000 per trade).\n\nAre you sure you want to proceed?",
    )
  ) {
    fetch("/api/algo-toggle", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        const badge = document.getElementById("algo-status");
        badge.innerText = data.active ? "ON" : "OFF";
        badge.className = data.active
          ? "badge bg-success ms-1"
          : "badge bg-secondary ms-1";
        if (data.active)
          alert("LIVE ALGO ENGAGED. Monitor execution logs in your terminal.");
      });
  }
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

// Listen for live funds update from Upstox
socket.on("upstox-funds", (funds) => {
  let fundsEl = document.getElementById("upstox-funds-val");
  if (fundsEl) {
    fundsEl.innerText = `₹${funds.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
});

function updatePortfolioSummary(invested, current, totalReturn, todayReturn) {
  const totalReturnPct = invested > 0 ? (totalReturn / invested) * 100 : 0;
  const totalReturnSign = totalReturn >= 0 ? "+" : "";
  const todayReturnSign = todayReturn >= 0 ? "+" : "";

  document.getElementById("summary-invested").innerText =
    `₹${invested.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("summary-current").innerText =
    `₹${current.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const trEl = document.getElementById("summary-total-return");
  if (trEl) {
    trEl.innerText = `${totalReturnSign}₹${Math.abs(totalReturn).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${totalReturnSign}${totalReturnPct.toFixed(2)}%)`;
    trEl.className = `fs-4 fw-bold font-mono ${totalReturn >= 0 ? "text-up" : "text-down"}`;
  }

  const tdEl = document.getElementById("summary-today-return");
  if (tdEl) {
    tdEl.innerText = `${todayReturnSign}₹${Math.abs(todayReturn).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    tdEl.className = `fs-4 fw-bold font-mono ${todayReturn >= 0 ? "text-up" : "text-down"}`;
  }
}

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

  // Calculate Portfolio-wide summary data
  let totalInvested = 0;
  let totalCurrent = 0;
  let totalReturn = 0;
  let todayReturn = 0;

  latestData.forEach((stock) => {
    const qty =
      stock.qty !== undefined
        ? stock.qty
        : stock.quantity !== undefined
          ? stock.quantity
          : 1;
    if (qty > 0) {
      const invested = qty * stock.avg;
      const current = qty * stock.ltp;
      const closePrice = stock.close || stock.avg || stock.ltp;
      totalInvested += invested;
      totalCurrent += current;
      totalReturn += current - invested;
      todayReturn += qty * (stock.ltp - closePrice);
    }
  });

  // Render new dashboard stats
  updatePortfolioSummary(totalInvested, totalCurrent, totalReturn, todayReturn);

  let totalUnrealizedPnl = 0;
  let tableHtml = "";

  filteredData.forEach((stock) => {
    // Calculate P&L Percentage
    const pnlPercent = (((stock.ltp - stock.avg) / stock.avg) * 100).toFixed(2);
    const pnlClass = pnlPercent >= 0 ? "text-up" : "text-down";
    const qty =
      stock.qty !== undefined
        ? stock.qty
        : stock.quantity !== undefined
          ? stock.quantity
          : 1;
    totalUnrealizedPnl += (stock.ltp - stock.avg) * qty; // Tally total P&L

    let row = `
            <tr>
                <td class="fw-bold text-white">${stock.symbol} <span class="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25 ms-2">${qty} Qty</span></td>
                <td>₹${stock.ltp.toFixed(2)}</td>
                <td>₹${stock.avg}</td>
                <td class="${pnlClass}">${pnlPercent >= 0 ? "+" : ""}${pnlPercent}%</td>
                <td>${stock.analysis.z}</td>
                <td class="${stock.analysis.color.replace("text-success", "text-up").replace("text-danger", "text-down")} fw-bold">${stock.analysis.signal}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-success font-mono" onclick="placeOrder('${stock.symbol}', 1, 'BUY')">B</button>
                        <button class="btn btn-sm btn-outline-danger font-mono" onclick="placeOrder('${stock.symbol}', ${qty}, 'SELL')">S</button>
                        <button class="btn btn-sm btn-outline-info font-mono" title="Average Down" onclick="calculateAverageBuy('${stock.symbol}', ${stock.ltp}, ${stock.avg}, ${qty})"><i class="bi bi-calculator"></i></button>
                    </div>
                </td>
            </tr>
        `;

    // If Strong Signal recently triggered, inject tip directly below this row
    const pSignal = persistentSignals[stock.symbol];
    if (pSignal) {
      row += `
        <tr>
          <td colspan="7" class="border-top-0 pt-0 pb-4">
            <div class="bg-primary bg-opacity-10 border border-primary border-opacity-25 text-white py-2 px-3 mb-0 d-flex align-items-center rounded">
              <i class="bi bi-lightning-charge-fill text-warning fs-5 me-2"></i>
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
    `fs-5 fw-bold font-mono ${totalUnrealizedPnl >= 0 ? "text-up" : "text-down"}`;

  const goal = currentGoal;
  document.getElementById("profit-progress").style.width =
    `${Math.max(0, Math.min(100, (totalUnrealizedPnl / goal) * 100))}%`;

  const goalStrategy = document.getElementById("goal-strategy");
  if (totalUnrealizedPnl >= goal) {
    goalStrategy.innerHTML = `<span class="text-up"><i class="bi bi-check-circle-fill me-1"></i> Target Reached!</span><br><span class="text-muted mt-1 d-block">Consider trailing your stops.</span>`;
  } else {
    const remaining = goal - totalUnrealizedPnl;
    goalStrategy.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i> ₹${remaining.toFixed(2)} away.</span><br><span class="text-muted d-block mt-2">💡 Need 1% capture on ~₹${(remaining * 100).toFixed(0)} capital.</span>`;
  }

  // 2. Build Actionable Ideas List (Includes both new and existing holdings)
  const actionableIdeas = document.getElementById("actionable-ideas");
  let ideasHtml = "";

  // Use persistentSignals instead of latestData so tips persist on screen
  Object.values(persistentSignals).forEach((pSignal) => {
    const isNew = pSignal.qty === 0 || pSignal.quantity === 0;
    const action = pSignal.triggeredSignal === "STRONG BUY" ? "ADD" : "DROP";
    const actionColor =
      pSignal.triggeredSignal === "STRONG BUY" ? "text-up" : "text-down";
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
        <li class="list-group-item bg-transparent border-subtle border-start-0 border-end-0 border-top-0 d-flex justify-content-between align-items-center py-3">
          <div>
            <span class="${actionColor} fw-bold me-2" style="font-size: 0.75rem;"><i class="bi ${icon}"></i> ${action}</span>
            <span class="text-white">${pSignal.symbol}</span>
            ${isNew ? '<span class="badge bg-primary bg-opacity-25 text-primary ms-1 border border-primary border-opacity-25" style="font-size: 0.6rem;">NEW</span>' : ""}
            <div class="text-muted mt-1 font-sans" style="font-size: 0.65rem;"><i class="bi bi-clock"></i> ${timeStr} • Z: ${pSignal.triggeredZ}</div>
          </div>
          <button class="btn btn-sm ${btnClass} py-0 px-2" style="font-size: 0.7rem;" onclick="placeOrder('${pSignal.symbol}', ${qtyToTrade}, '${btnText}')">${btnText}</button>
        </li>
      `;
  });

  if (ideasHtml === "") {
    actionableIdeas.innerHTML = `<li class="list-group-item bg-transparent text-muted text-center py-4 border-0">No setups detected.</li>`;
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
      "mt-2 p-3 rounded text-center fw-bold small border border-success bg-success bg-opacity-10 text-up";
    heatmap.innerText = "BULLISH / LOW RISK";
  } else if (avgZ >= 1) {
    heatmap.className =
      "mt-2 p-3 rounded text-center fw-bold small border border-danger bg-danger bg-opacity-10 text-down";
    heatmap.innerText = "BEARISH / HIGH RISK";
  } else {
    heatmap.className =
      "mt-2 p-3 rounded text-center fw-bold small border border-warning bg-warning bg-opacity-10 text-warning";
    heatmap.innerText = "NEUTRAL / RANGEBOUND";
  }
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
