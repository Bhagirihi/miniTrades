const socket = io();

// Gatekeeper: Redirect to login if not authenticated
fetch("/api/auth-status")
  .then((res) => res.json())
  .then((data) => {
    if (!data.authenticated) {
      window.location.href = "/login.html";
    }
  });

let globalPaperHoldings = [];
let isViewingHistory = false;

function toggleAutoTrade() {
  fetch("/api/paper-toggle", { method: "POST" })
    .then((res) => res.json())
    .then((data) => updateToggleUI(data.active));
}

function updateToggleUI(isActive) {
  const statusBadge = document.getElementById("auto-status");
  statusBadge.innerText = isActive ? "ON" : "OFF";
  statusBadge.className = isActive
    ? "badge bg-success ms-1"
    : "badge bg-secondary ms-1";
}

function resetPaperAccount() {
  if (
    confirm(
      "Are you sure you want to reset your virtual cash and clear all paper trade history?",
    )
  ) {
    fetch("/api/paper-reset", { method: "POST" })
      .then((res) => res.json())
      .then(() => alert("Account Reset Successfully."));
  }
}

function exportToCSV() {
  if (globalPaperHoldings.length === 0) {
    alert("No trade history available to export.");
    return;
  }

  const headers = [
    "SYMBOL",
    "QTY",
    "AVG BUY",
    "BUY TIME",
    "LTP / EXIT",
    "EXIT TIME",
    "P&L",
    "STATUS",
  ];

  const rows = globalPaperHoldings.map((h) => {
    const isActive = h.status === "ACTIVE";
    const displayPrice = isActive ? h.ltp : h.exitPrice;
    const pnl = isActive ? h.qty * h.ltp - h.qty * h.avg : h.pnl;

    return [
      `"${h.symbol}"`,
      h.qty,
      h.avg.toFixed(2),
      `"${h.buyTime || "--"}"`,
      displayPrice.toFixed(2),
      `"${h.exitTime || "--"}"`,
      pnl.toFixed(2),
      `"${h.status}"`,
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const dtStr = new Date()
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .slice(0, 19);
  link.setAttribute("download", `trade_history_${dtStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function fetchDaysForExport() {
  const dropdown = document.getElementById("export-days-dropdown");
  dropdown.innerHTML =
    '<li><span class="dropdown-item text-muted">Loading...</span></li>';

  fetch("/api/paper-history/days")
    .then((res) => res.json())
    .then((days) => {
      if (days.length === 0) {
        dropdown.innerHTML =
          '<li><span class="dropdown-item text-muted">No history found.</span></li>';
        return;
      }

      dropdown.innerHTML = days
        .map(
          (day) =>
            `<li><a class="dropdown-item" href="/api/paper-history/download/${day}" target="_blank"><i class="bi bi-calendar-date me-2"></i> ${day}</a></li>`,
        )
        .join("");
    })
    .catch((err) => {
      dropdown.innerHTML =
        '<li><span class="dropdown-item text-danger">Failed to load.</span></li>';
    });
}

function fetchDaysForView() {
  const dropdown = document.getElementById("view-days-dropdown");
  dropdown.innerHTML =
    '<li><span class="dropdown-item text-muted">Loading...</span></li>';

  fetch("/api/paper-history/days")
    .then((res) => res.json())
    .then((days) => {
      if (days.length === 0) {
        dropdown.innerHTML =
          '<li><span class="dropdown-item text-muted">No history found.</span></li>';
        return;
      }

      let html = `<li><a class="dropdown-item fw-bold text-info" href="#" onclick="viewLiveState(event)"><i class="bi bi-activity me-2"></i> RETURN TO LIVE STATE</a></li>`;
      html += `<li><hr class="dropdown-divider"></li>`;
      html += days
        .map(
          (day) =>
            `<li><a class="dropdown-item" href="#" onclick="viewHistoryDay(event, '${day}')"><i class="bi bi-calendar-date me-2"></i> ${day}</a></li>`,
        )
        .join("");
      dropdown.innerHTML = html;
    })
    .catch((err) => {
      dropdown.innerHTML =
        '<li><span class="dropdown-item text-danger">Failed to load.</span></li>';
    });
}

function viewHistoryDay(e, day) {
  if (e) e.preventDefault();
  isViewingHistory = true;

  document.getElementById("paper-holdings").innerHTML =
    '<tr><td colspan="8" class="text-center py-5 text-muted">Loading history...</td></tr>';

  fetch(`/api/paper-history/view/${day}`)
    .then((res) => res.json())
    .then((data) => renderHistoryTable(data, day))
    .catch((err) => {
      document.getElementById("paper-holdings").innerHTML =
        '<tr><td colspan="8" class="text-center py-5 text-danger">Failed to load history.</td></tr>';
    });
}

function viewLiveState(e) {
  if (e) e.preventDefault();
  isViewingHistory = false;
  document.getElementById("paper-holdings").innerHTML =
    '<tr><td colspan="8" class="text-center py-5 text-muted">Restoring live view...</td></tr>';
  document.getElementById("total-trades").className = "badge bg-secondary";
}

function renderHistoryTable(holdings, day) {
  let realizedPnl = 0;
  let holdingsHtml = "";

  holdings.forEach((h) => {
    const isActive = h.status === "ACTIVE";
    const pnl = h.pnl || 0;
    realizedPnl += pnl;

    const displayPrice = h.exitPrice || h.ltp || h.avg;
    const pnlPct =
      h.avg > 0 ? (((displayPrice - h.avg) / h.avg) * 100).toFixed(2) : "0.00";
    const color = pnl >= 0 ? "text-up" : "text-down";

    let statusBadge = "";
    if (h.status === "ACTIVE")
      statusBadge = `<span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50">ACTIVE</span>`;
    else if (h.status === "TAKE PROFIT")
      statusBadge = `<span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50">TAKE PROFIT</span>`;
    else if (h.status === "STOP LOSS")
      statusBadge = `<span class="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50">STOP LOSS</span>`;
    else if (h.status === "TRAILING STOP")
      statusBadge = `<span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50">TRAILING STOP</span>`;
    else if (h.status === "SELL")
      statusBadge = `<span class="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-50">SOLD</span>`;
    else if (h.status === "SQUARE OFF")
      statusBadge = `<span class="badge bg-info bg-opacity-25 text-info border border-info border-opacity-50">SQUARED OFF</span>`;
    else
      statusBadge = `<span class="badge bg-light text-dark">${h.status}</span>`;

    holdingsHtml += `<tr class="${!isActive ? "opacity-50" : ""}">
            <td class="fw-bold text-white">${h.symbol}</td>
            <td>${h.qty}</td>
            <td>₹${h.avg.toFixed(2)}</td>
            <td class="text-muted">${h.buyTime || "--"}</td>
            <td>₹${displayPrice.toFixed(2)}</td>
            <td class="text-muted">${h.exitTime || "--"}</td>
            <td class="${color} fw-bold">₹${pnl.toFixed(2)} (${pnlPct >= 0 ? "+" : ""}${pnlPct}%)</td>
            <td>${statusBadge}</td>
        </tr>`;
  });

  document.getElementById("paper-holdings").innerHTML =
    holdingsHtml ||
    `<tr><td colspan="8" class="text-center py-5 text-muted">No records found for ${day}.</td></tr>`;

  document.getElementById("total-trades").innerText = `HISTORY: ${day}`;
  document.getElementById("total-trades").className =
    "badge bg-warning text-dark";

  document.getElementById("total-pnl").innerText = `₹${realizedPnl.toFixed(2)}`;
  document.getElementById("total-pnl").className =
    realizedPnl >= 0
      ? "fs-4 fw-bold font-mono text-up"
      : "fs-4 fw-bold font-mono text-down";

  document.getElementById("invested-val").innerText = "--";
  document.getElementById("brokerage-val").innerText = "--";
}

socket.on("paper-state", (data) => {
  globalPaperHoldings = data.paperHoldings;

  // Update Status
  updateToggleUI(data.isAutoPaperTradeActive);

  if (isViewingHistory) return; // Skip updating UI if user is viewing historical data

  // Update Holdings & Calculate Math
  let invested = 0;
  let currentVal = 0;
  let holdingsHtml = "";

  data.paperHoldings.forEach((h) => {
    const isActive = h.status === "ACTIVE";
    if (isActive) {
      invested += h.qty * h.avg;
      currentVal += h.qty * h.ltp;
    }

    const displayPrice = isActive ? h.ltp : h.exitPrice;
    const pnl = isActive ? h.qty * h.ltp - h.qty * h.avg : h.pnl;
    const pnlPct = (((displayPrice - h.avg) / h.avg) * 100).toFixed(2);
    const color = pnl >= 0 ? "text-up" : "text-down";

    let statusBadge = "";
    if (h.status === "ACTIVE")
      statusBadge = `<span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50">ACTIVE</span>`;
    else if (h.status === "TAKE PROFIT")
      statusBadge = `<span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50">TAKE PROFIT</span>`;
    else if (h.status === "STOP LOSS")
      statusBadge = `<span class="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50">STOP LOSS</span>`;
    else if (h.status === "TRAILING STOP")
      statusBadge = `<span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50">TRAILING STOP</span>`;
    else if (h.status === "SELL")
      statusBadge = `<span class="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-50">SOLD</span>`;
    else if (h.status === "SQUARE OFF")
      statusBadge = `<span class="badge bg-info bg-opacity-25 text-info border border-info border-opacity-50">SQUARED OFF</span>`;

    holdingsHtml += `<tr class="${!isActive ? "opacity-50" : ""}">
            <td class="fw-bold text-white">${h.symbol}</td>
            <td>${h.qty}</td>
            <td>₹${h.avg.toFixed(2)}</td>
            <td class="text-muted">${h.buyTime || "--"}</td>
            <td>₹${displayPrice.toFixed(2)}</td>
            <td class="text-muted">${h.exitTime || "--"}</td>
            <td class="${color} fw-bold">₹${pnl.toFixed(2)} (${pnlPct >= 0 ? "+" : ""}${pnlPct}%)</td>
            <td>${statusBadge}</td>
        </tr>`;
  });

  document.getElementById("paper-holdings").innerHTML =
    holdingsHtml ||
    '<tr><td colspan="8" class="text-center py-5 text-muted">No simulated positions yet.</td></tr>';

  // Update Top Math
  const totalAccountValue = data.paperCash + currentVal;
  const totalPnl = totalAccountValue - 100000; // Formula to compute true Net P&L (Unrealized + Realized - Brokerage)

  document.getElementById("total-trades").innerText =
    data.totalPaperTrades || 0;
  document.getElementById("invested-val").innerText = `₹${invested.toFixed(2)}`;
  document.getElementById("brokerage-val").innerText =
    `₹${(data.totalBrokerage || 0).toFixed(2)}`;
  document.getElementById("cash-val").innerText =
    `₹${data.paperCash.toFixed(2)}`;
  document.getElementById("total-pnl").innerText = `₹${totalPnl.toFixed(2)}`;
  document.getElementById("total-pnl").className =
    totalPnl >= 0
      ? "fs-4 fw-bold font-mono text-up"
      : "fs-4 fw-bold font-mono text-down";

  // Update Logs
  document.getElementById("paper-logs").innerHTML =
    data.paperLogs
      .map(
        (l) =>
          `<li class="list-group-item bg-transparent border-subtle border-start-0 border-end-0 border-top-0 py-3 text-white">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="badge ${l.action === "BUY" ? "bg-primary" : l.action === "TAKE PROFIT" || l.action === "TRAILING STOP" ? "bg-success" : l.action === "SQUARE OFF" ? "bg-info text-dark" : "bg-danger"}">${l.action}</span>
              <span class="text-muted small">${l.time}</span>
            </div>
            <div class="d-flex justify-content-between font-mono small">
              <span>${l.qty}x ${l.symbol} @ ₹${l.price.toFixed(2)}</span>
              ${l.action !== "BUY" ? `<span class="${l.pnl >= 0 ? "text-up" : "text-down"} fw-bold">${l.pnl >= 0 ? "+" : ""}₹${l.pnl.toFixed(2)}</span>` : ""}
            </div>
        </li>`,
      )
      .join("") ||
    '<li class="list-group-item bg-transparent text-muted text-center py-4 border-0">Awaiting automated bot trades...</li>';
});

// --- LIVE CLOCK WIDGET ---
const clockWidget = document.createElement("div");
clockWidget.className =
  "position-fixed bottom-0 end-0 m-3 badge bg-dark border border-secondary p-2 fs-6 font-mono shadow text-white";
clockWidget.style.zIndex = "9999";
document.body.appendChild(clockWidget);

let closedOverlay = null;

// Update the clock every second in IST
setInterval(() => {
  const now = new Date();
  clockWidget.innerHTML = `<i class="bi bi-clock me-2 text-info"></i>${now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST`;

  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const day = istDate.getDay();

  // Check if weekend (0 = Sun, 6 = Sat) or outside 9:00 AM - 3:30 PM (IST)
  const isMarketClosed =
    day === 0 ||
    day === 6 ||
    hours < 9 ||
    (hours === 15 && minutes > 30) ||
    hours > 15;

  if (isMarketClosed) {
    if (!closedOverlay) {
      closedOverlay = document.createElement("div");
      closedOverlay.id = "market-closed-overlay";
      closedOverlay.className =
        "position-fixed top-0 start-0 w-100 d-flex flex-column align-items-center";
      closedOverlay.style.zIndex = "9998"; // Keep beneath the 9999 clock widget
      closedOverlay.style.pointerEvents = "none"; // Allows users to still click and scroll through the overlay

      const banner = document.createElement("div");
      banner.className =
        "w-100 bg-danger text-white text-center fw-bold py-2 fs-5 shadow-lg";
      banner.innerHTML =
        "<i class='bi bi-moon-stars-fill me-2'></i> MARKET CLOSE";

      closedOverlay.appendChild(banner);
      document.body.appendChild(closedOverlay);
    }
  } else {
    if (closedOverlay) {
      closedOverlay.remove();
      closedOverlay = null;
    }
  }
}, 1000);
