// Daftar list koin
const COINS = [
  { id: "bitcoin", symbol: "BTC", nama:"Bitcoin" },
  { id: "ethereum", symbol:"ETH", nama:"Ethereum" },
  { id: "binancecoin", symbol:"BNB", nama:"Binance Coin" },
  { id: "solana", symbol:"SOL", nama:"Solana" }
];

let state = {
  modal: 0,
  sisaModal: 0,
  portofolio: [], // {symbol, amount}
};
let hargaSekarang = {}; // { symbol: harga dalam rupiah }
let chartObj = null;

window.onload = () => {
  // Isi tabel market dan grafik
  isiTableKoin();
  isiPilihanTrade();
  isiPilihanChart();
  ambilHargaLive();
  inisialisasiChart();
  // load portofolio dari localStorage jika ada
  loadState();
};

// MODAL AWAL
function setModal() {
  let nominal = Math.floor(Number(document.getElementById('modal-input').value || 0));
  if(nominal < 1 || nominal > 1_000_000_000) {
    document.getElementById('modal-alert').textContent="Isi 1-1.000.000.000";
    return;
  }
  state.modal = nominal;
  state.sisaModal = nominal;
  state.portofolio = [];
  saveState();
  syncUI();
  document.getElementById('modal-alert').textContent = "Modal disimpan!";
}

// Ambil harga terkini CoinGecko
function ambilHargaLive() {
  let ids = COINS.map(k=>k.id).join(',');
  fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr`)
    .then(r=>r.json()).then(d=>{
      COINS.forEach(k=>{
        hargaSekarang[k.symbol] = d[k.id].idr;
      });
      updateMarketTable();
      updatePortfolioTable();
    });
}

// Tabel market
function isiTableKoin() {
  let tbody = document.querySelector("#crypto-table tbody");
  tbody.innerHTML = '';
  COINS.forEach(k => {
    let tr = document.createElement('tr');
    tr.innerHTML = `<td>${k.symbol}</td><td id="tp_${k.symbol}">-</td><td>&nbsp;</td>`;
    tbody.appendChild(tr);
  });
}

// Pilihan trade
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
// Pilihan chart
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

// Update market prices
function updateMarketTable() {
  COINS.forEach(k=>{
    let el = document.getElementById(`tp_${k.symbol}`);
    if(el) el.textContent = hargaSekarang[k.symbol]?.toLocaleString('id-ID') || '-';
  });
}

// Portofolio
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

// Simulasi trade
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

// Grafik harga historis
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

// LocalStorage: menyimpan portofolio agar jika refresh tidak hilang
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
// Sinkronisasi tampilan
function syncUI() {
  if(state.modal > 0){
    document.getElementById('input-modal-section').style.display = 'none';
    updatePortfolioTable();
  }
  ambilHargaLive();
                          }
