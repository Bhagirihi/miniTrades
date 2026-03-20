const socket = io();

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

socket.on("paper-state", (data) => {
  // Update Status
  updateToggleUI(data.isAutoPaperTradeActive);

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
    const color = pnl >= 0 ? "text-success" : "text-danger";

    let statusBadge = "";
    if (h.status === "ACTIVE")
      statusBadge = `<span class="badge bg-primary">ACTIVE</span>`;
    else if (h.status === "TAKE PROFIT")
      statusBadge = `<span class="badge bg-success">TAKE PROFIT</span>`;
    else if (h.status === "STOP LOSS")
      statusBadge = `<span class="badge bg-danger">STOP LOSS</span>`;
    else if (h.status === "TRAILING STOP")
      statusBadge = `<span class="badge bg-warning text-dark">TRAILING STOP</span>`;
    else if (h.status === "SELL")
      statusBadge = `<span class="badge bg-secondary">SOLD</span>`;
    else if (h.status === "SQUARE OFF")
      statusBadge = `<span class="badge bg-info text-dark">SQUARED OFF</span>`;

    holdingsHtml += `<tr class="${!isActive ? "opacity-50" : ""}">
            <td class="fw-bold text-light">${h.symbol}</td>
            <td>${h.qty}</td>
            <td>₹${h.avg.toFixed(2)}</td>
            <td>₹${displayPrice.toFixed(2)}</td>
            <td class="${color} fw-bold">₹${pnl.toFixed(2)} (${pnlPct >= 0 ? "+" : ""}${pnlPct}%)</td>
            <td>${statusBadge}</td>
        </tr>`;
  });

  document.getElementById("paper-holdings").innerHTML =
    holdingsHtml ||
    '<tr><td colspan="6" class="text-center py-4 text-secondary">No recorded positions.</td></tr>';

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
    totalPnl >= 0 ? "fw-bold text-success" : "fw-bold text-danger";

  // Update Logs
  document.getElementById("paper-logs").innerHTML =
    data.paperLogs
      .map(
        (l) =>
          `<li class="list-group-item bg-transparent border-secondary text-light">
            <span class="text-secondary">#${l.time}</span>
            <span class="${l.action === "BUY" || l.action === "TAKE PROFIT" || l.action === "TRAILING STOP" ? "text-success" : l.action === "SQUARE OFF" ? "text-info" : "text-danger"} fw-bold ms-2">${l.action}</span>
            <span class="ms-2">${l.qty}x ${l.symbol} @ ₹${l.price.toFixed(2)}</span>
            ${l.action !== "BUY" ? `<span class="${l.pnl >= 0 ? "text-success" : "text-danger"} fw-bold ms-2 float-end">${l.pnl >= 0 ? "+" : ""}₹${l.pnl.toFixed(2)}</span>` : ""}
        </li>`,
      )
      .join("") ||
    '<li class="list-group-item bg-transparent text-secondary text-center py-3 border-0">Waiting for automated trades...</li>';
});
