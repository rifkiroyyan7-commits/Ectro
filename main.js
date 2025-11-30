// ============ Konfigurasi koin =============
const COINS = [
  { id: "bitcoin", symbol: "BTC", nama:"Bitcoin" },
  { id: "ethereum", symbol:"ETH", nama:"Ethereum" },
  { id: "binancecoin", symbol:"BNB", nama:"Binance Coin" },
  { id: "solana", symbol:"SOL", nama:"Solana" }
];

// ============ State utama =============
let state = {
  modal: 0,
  sisaModal: 0,
  portofolio: [], // {symbol, amount}
};
let hargaSekarang = {};        // harga saat ini {symbol: harga}
let harga1MenitLalu = {};      // harga 1 menit lalu {symbol: harga}
let chartObj = null;

// ============ Saat halaman selesai load ============
window.onload = () => {
  isiTableKoin();
  isiPilihanTrade();
  isiPilihanChart();
  ambilHargaLive();
  inisialisasiChart();
  loadState();

  // Setiap 1 menit update harga+perubahan, ramah API
  setInterval(() => {
    COINS.forEach(c=>{
      harga1MenitLalu[c.symbol] = hargaSekarang[c.symbol];
    });
    ambilHargaLive();
  }, 60 * 1000);
};

// ============ Modal Awal ============
function setModal() {
  let nominal = Math.floor(Number(document.getElementById('modal-input').value || 0));
  if(nominal < 1 || nominal > 1_000_000_000) {
    document.getElementById('modal-alert').textContent = "Isi 1-1.000.000.000";
    return;
  }
  state.modal = nominal;
  state.sisaModal = nominal;
  state.portofolio = [];
  saveState();
  syncUI();
  document.getElementById('modal-alert').textContent = "Modal disimpan!";
}

// ============ Harga Crypto Live ============
function ambilHargaLive() {
  let ids = COINS.map(k=>k.id).join(',');
  fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr`)
    .then(r=>r.json()).then(d=>{
      COINS.forEach(k=>{
        hargaSekarang[k.symbol] = d[k.id].idr;
      });
      // 1x setup harga1MenitLalu (saat awal buka web)
      COINS.forEach(c=>{
        if(harga1MenitLalu[c.symbol] === undefined) harga1MenitLalu[c.symbol] = hargaSekarang[c.symbol];
      });
      updateMarketTable();
      updatePortfolioTable();
    });
}

// ============ Isi tabel market dengan tombol dan perubahan harga ============
function isiTableKoin() {
  let tbody = document.querySelector("#crypto-table tbody");
  tbody.innerHTML = '';
  COINS.forEach(k => {
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${k.symbol}</td>
      <td id="tp_${k.symbol}">-</td>
      <td id="chg_${k.symbol}">-</td>
      <td>
        <button onclick="isiFormTrade('${k.symbol}','buy')">Beli</button>
        <button onclick="isiFormTrade('${k.symbol}','sell')">Jual</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ============ Pilihan trade di form bawah ============
function isiPilihanTrade() {
  let sel = document.getElementById("trade-coin");
  sel.innerHTML = '';
  COINS.forEach(k=>{
    let opt = document.createElement('option');
    opt.value = k.symbol;
    opt.textContent = `${k.symbol} - ${k.nama}`;
    sel.appendChild(opt);
  });
}

// ============ Pilihan grafik ============
function isiPilihanChart() {
  let sel = document.getElementById("chart-coin");
  sel.innerHTML = '';
  COINS.forEach(k=>{
    let opt = document.createElement('option');
    opt.value = k.symbol;
    opt.textContent = `${k.symbol} - ${k.nama}`;
    sel.appendChild(opt);
  });
  sel.onchange = renderChartForSelected;
}

// ============ Update tabel market (harga+perubahan+warna) ============
function updateMarketTable() {
  COINS.forEach(k=>{
    // Harga sekarang
    let el = document.getElementById(`tp_${k.symbol}`);
    if(el) el.textContent = hargaSekarang[k.symbol]?.toLocaleString('id-ID') || '-';
    // Perubahan persentase 1 menit
    let chgCell = document.getElementById(`chg_${k.symbol}`);
    let prev = harga1MenitLalu[k.symbol];
    let now = hargaSekarang[k.symbol];
    if(prev && now){
      let chg = ((now - prev)/prev)*100;
      chg = isFinite(chg) ? chg : 0;
      let color = chg > 0 ? 'limegreen' : (chg < 0 ? 'red' : '#fff');
      let prefix = chg > 0 ? '+' : '';
      chgCell.innerHTML = `<span style="color:${color};">${prefix}${chg.toFixed(2)}%</span>`;
    } else {
      chgCell.innerHTML = "-";
    }
  });
}

// ============ Isi form trade otomatis (klik tombol di tabel) ============
function isiFormTrade(symbol, tipe) {
  document.getElementById('trade-coin').value = symbol;
  document.getElementById('trade-type').value = tipe;
  document.getElementById('trade-amount').focus();
}

// ============ Update portofolio ============
function updatePortfolioTable() {
  if(state.modal <= 0) return;
  document.getElementById('portfolio-section').style.display = 'block';
  document.getElementById('trade-section').style.display = 'block';
  let tbody = document.querySelector("#portfolio-table tbody");
  tbody.innerHTML = '';
  let total = 0;
  COINS.forEach(k=>{
    let holding = state.portofolio.find(p=>p.symbol==k.symbol);
    let jum = holding ? holding.amount : 0;
    let nilai = jum * (hargaSekarang[k.symbol] || 0);
    total += nilai;
    tbody.innerHTML += `<tr><td>${k.symbol}</td><td>${jum}</td><td>${(hargaSekarang[k.symbol]||'-').toLocaleString('id-ID')}</td><td>${Math.round(nilai).toLocaleString('id-ID')}</td></tr>`;
  });
  let sisa = state.sisaModal;
  let row = `<tr style="font-weight:bold"><td colspan="3">Sisa Rupiah</td><td>${Math.round(sisa).toLocaleString('id-ID')}</td></tr>
  <tr style="font-weight:bold; color:#00ffd6"><td colspan="3">Total Nilai Portofolio</td><td>${Math.round(total+sisa).toLocaleString('id-ID')}</td></tr>`;
  tbody.innerHTML += row;
  document.getElementById('balance').textContent = `Modal Awal: Rp ${state.modal.toLocaleString('id-ID')}`;
}

// ============ Simulasi Trade ============
function simTrade() {
  let symbol = document.getElementById('trade-coin').value;
  let amount = parseFloat(document.getElementById('trade-amount').value || '0');
  let ttype = document.getElementById('trade-type').value;
  let harga = hargaSekarang[symbol] || 0;
  let idx = state.portofolio.findIndex(x=>x.symbol===symbol);
  if(amount<=0 || !harga) {
    document.getElementById('trade-alert').textContent = "Jumlah tidak valid!";
    return;
  }
  if(ttype==='buy'){
    let cost = amount*harga;
    if(cost > state.sisaModal) {
      document.getElementById('trade-alert').textContent = "Saldo rupiah kurang!";
      return;
    }
    if(idx>=0) state.portofolio[idx].amount += amount;
    else state.portofolio.push({symbol, amount});
    state.sisaModal -= cost;
  } else if(ttype==='sell'){
    if(idx<0 || state.portofolio[idx].amount<amount){
      document.getElementById('trade-alert').textContent = "Aset anda kurang!";
      return;
    }
    state.portofolio[idx].amount -= amount;
    state.sisaModal += amount*harga;
    if(state.portofolio[idx].amount<=0) state.portofolio.splice(idx,1);
  }
  saveState();
  updatePortfolioTable();
  document.getElementById('trade-alert').textContent = 'Transaksi berhasil!';
}

// ============ Grafik harga historis ============
function inisialisasiChart() {
  const ctx = document.getElementById('crypto-chart').getContext('2d');
  chartObj = new Chart(ctx, {
    type:'line',
    data: {
      labels: [],
      datasets: [{
        label: "Harga (Rp)",
        data: [],
        fill: false,
        borderColor: '#00ffd6',
        backgroundColor:'#008877',
        tension: 0.1,
      }]
    },
    options: {
      scales:{x:{display:true}, y:{display:true,beginAtZero:false}},
      plugins:{legend:{display:false}}
    }
  });
  renderChartForSelected();
}

function renderChartForSelected() {
  let symbol = document.getElementById('chart-coin').value;
  let coin = COINS.find(k=>k.symbol==symbol);
  if(!coin) return;
  fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=idr&days=365`)
    .then(r=>r.json())
    .then(d=>{
      let labels = d.prices.map(p=> (new Date(p[0])).toLocaleDateString());
      let data = d.prices.map(p=> Math.round(p[1]));
      chartObj.data.labels = labels;
      chartObj.data.datasets[0].data = data;
      chartObj.data.datasets[0].label = `${coin.symbol} 1 Tahun (Rp)`;
      chartObj.update();
    });
}

// ============ LocalStorage data ============
function saveState() {
  localStorage.setItem('ectro_state', JSON.stringify(state));
}
function loadState() {
  try {
    let d = JSON.parse(localStorage.getItem('ectro_state'));
    if(!d) return;
    state = d;
    syncUI();
  }catch{}
}

// ============ Sinkronisasi UI ============
function syncUI() {
  if(state.modal > 0){
    document.getElementById('input-modal-section').style.display = 'none';
    updatePortfolioTable();
  } else {
    document.getElementById('input-modal-section').style.display = 'block';
    document.getElementById('portfolio-section').style.display = 'none';
    document.getElementById('trade-section').style.display = 'none';
    document.querySelector("#portfolio-table tbody").innerHTML = '';
    document.getElementById('balance').textContent = '';
  }
  ambilHargaLive();
}

// ============ RESET Modal/Akun ============
function resetModal() {
  // Hapus data portofolio di localStorage & JS
  localStorage.removeItem('ectro_state');
  state = {
    modal: 0,
    sisaModal: 0,
    portofolio: [],
  };
  // Tampilkan form input modal awal, sembunyikan portofolio dan trade
  document.getElementById('input-modal-section').style.display = 'block';
  document.getElementById('portfolio-section').style.display = 'none';
  document.getElementById('trade-section').style.display = 'none';
  // Bersihkan portofolio table dan balance
  document.querySelector("#portfolio-table tbody").innerHTML = '';
  document.getElementById('balance').textContent = '';
  // Bersihkan input/alert
  document.getElementById('modal-input').value = '';
  document.getElementById('modal-alert').textContent = '';
  document.getElementById('trade-alert').textContent = '';
  // Reset dropdown grafik ke coin pertama
  document.getElementById('chart-coin').selectedIndex = 0;
  // Render ulang grafik dengan default koin
  renderChartForSelected();
  // Perbarui harga market (supaya tabel market tetap jalan)
  ambilHargaLive();
                }

// --- AUTO TRADING BTC --- //
let autoBTC = false;             // status tombol otomatis
let lastBuyPrice = null;         // harga terakhir saat beli otomatis

// fungsi cek auto trading, dipanggil tiap update harga
function autoTradeBTC(currentPrice) {
  if (!autoBTC) return;

  // jika belum pernah beli sebelumnya -> tunggu harga turun 0.2%
  if (lastBuyPrice === null) {
    // ambil harga awal sebagai basis pertama
    lastBuyPrice = currentPrice;
    console.log("Auto Mode Activated - Basis harga awal diset:", lastBuyPrice);
    return;
  }

  // hitung perubahan persen
  const changePercent = ((currentPrice - lastBuyPrice) / lastBuyPrice) * 100;

  // auto buy
  if (changePercent <= -0.2) {
    // beli semua sesuai sisa modal
    console.log("AUTO BUY BTC =", currentPrice);
    simTradeAuto("BTC", "buy");
    lastBuyPrice = currentPrice;
  }

  // auto sell di +0.2% profit
  if (changePercent >= 0.2) {
    console.log("AUTO SELL BTC =", currentPrice);
    simTradeAuto("BTC", "sell");
    lastBuyPrice = currentPrice;
  }
}

// fungsi trading otomatis (beli semua saldo rupiah / jual semua koin)
function simTradeAuto(coin, type) {
  if (type === "buy") {
    let saldo = userBalance; // saldo uang
    if (saldo <= 0) return;
    let price = cryptoPrices[coin]; // harga koin sekarang
    let amount = saldo / price;     // beli semua pakai saldo
    executeTrade(coin, amount, "buy");
  } 
  else if (type === "sell") {
    let amount = portfolio[coin] || 0;
    if (amount <= 0) return;
    executeTrade(coin, amount, "sell");
  }
}
      

