let lastPrice = {};
let maxRows = 10;

function generatePrice(symbol) {
  if (!lastPrice[symbol]) lastPrice[symbol] = 50000 + Math.random() * 200;
  const newPrice = lastPrice[symbol] + (Math.random() * 200 - 100);
  lastPrice[symbol] = newPrice;
  return newPrice.toFixed(2);
}

function generateAdvice(oldPrice, newPrice) {
  const diff = newPrice - oldPrice;

  if (diff > 50) {
    return ["JUAL", "Naik signifikan"];
  } else if (diff < -50) {
    return ["BELI", "Turun signifikan"];
  } else {
    return ["Tahan", "Pergerakan normal"];
  }
}

function updateTable() {
  const tableBody = document.querySelector("#advice-table tbody");
  const symbol = document.getElementById("coin-selector").value;

  const oldPrice = lastPrice[symbol] || 0;
  const newPrice = parseFloat(generatePrice(symbol));
  const [advice, reason] = generateAdvice(oldPrice, newPrice);

  const time = new Date().toLocaleTimeString();

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${time}</td>
    <td>${symbol}</td>
    <td>${newPrice}</td>
    <td><strong>${advice}</strong></td>
    <td>${reason}</td>
  `;

  tableBody.insertBefore(row, tableBody.firstChild);

  if (tableBody.rows.length > maxRows) {
    tableBody.removeChild(tableBody.lastChild);
  }
}

// Update every 1 minute
setInterval(updateTable, 60000);
updateTable();
