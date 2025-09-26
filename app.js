const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});


document.querySelectorAll('.stock-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-8px) scale(1.02)';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0) scale(1)';
  });
});

// Minimal sparkline-style charts per stock card
const chartInstances = [];
function initCharts() {
  document.querySelectorAll('.stock-card').forEach(card => {
    const canvas = card.querySelector('canvas.stock-chart');
    const priceEl = card.querySelector('.stock-price-large');
    if (!canvas || !priceEl) return;

    const initialPrice = parseFloat(priceEl.textContent.replace('₹', '')) || 100;
    
    const initialData = [initialPrice];
    for (let i = 1; i < 20; i++) {
      const prev = initialData[i - 1];
      const step = (Math.random() - 0.5) * 4; // +/- 2 range
      initialData.push(Math.max(0, prev + step));
    }

    const chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: initialData.map((_, i) => i),
        datasets: [{
          data: initialData,
          borderColor: 'rgba(123, 179, 217, 1)',
          backgroundColor: 'rgba(123, 179, 217, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { display: false }, y: { display: false } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: false
      } 
    });

    chartInstances.push({ card, chart, priceEl });
  });
}

initCharts();

let refreshTimerId = null;
async function refreshApiCards() {
  const cards = Array.from(document.querySelectorAll('.stock-card[data-source="api"]'));
  if (cards.length === 0) return;
  for (const card of cards) {
    const symbol = card.getAttribute('data-symbol');
    if (!symbol) continue;
    const priceEl = card.querySelector('.stock-price-large');
    const changeEl = card.querySelector('.stock-change');
    const ci = chartInstances.find(ci => ci.card === card);
    const { quote } = await fetchStock(symbol);
    if (!quote || !quote['05. price']) continue;
    const price = parseFloat(quote['05. price']);
    const changePercentRaw = quote['10. change percent'] || '0%';
    const changePercent = parseFloat(String(changePercentRaw).replace('%','')) || 0;
    if (priceEl) priceEl.textContent = `₹${price.toFixed(2)}`;
    if (changeEl) {
      changeEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
      changeEl.classList.toggle('positive', changePercent >= 0);
      changeEl.classList.toggle('negative', changePercent < 0);
    }
    if (ci && ci.chart) {
      const dataset = ci.chart.data.datasets[0].data;
      dataset.push(price);
      if (dataset.length > 40) dataset.shift();
      ci.chart.data.labels = dataset.map((_, i) => i);
      ci.chart.update();
    }
  }
}

const apiKey = "U51F5GGAMQPAGNYX "; 

const allStocks = [
  "TCS.BSE", "INFY.BSE", "WIPRO.BSE", "HCLTECH.BSE", "TECHM.BSE",
  "HDFCBANK.BSE", "ICICIBANK.BSE", "KOTAKBANK.BSE", "RELIANCE.BSE", "ONGC.BSE",
  "SUNPHARMA.BSE", "CIPLA.BSE", "MARUTI.BSE", "TATAMOTORS.BSE", "TATASTEEL.BSE"
];

const sectorStocks = {
  "Tech": ["TCS.BSE", "INFY.BSE", "WIPRO.BSE", "HCLTECH.BSE", "TECHM.BSE"],
  "Finance": ["HDFCBANK.BSE", "ICICIBANK.BSE", "KOTAKBANK.BSE"],
  "Energy": ["RELIANCE.BSE", "ONGC.BSE"],
  "Healthcare": ["SUNPHARMA.BSE", "CIPLA.BSE"],
  "Automobile": ["MARUTI.BSE", "TATAMOTORS.BSE"],
  "Metals": ["TATASTEEL.BSE"]
};

const sectorSelect = document.getElementById("sectorSelect");
Object.keys(sectorStocks).forEach(sector => {
  const opt = document.createElement("option");
  opt.value = sector;
  opt.textContent = sector;
  sectorSelect.appendChild(opt);
});

async function fetchStock(symbol) {
  if (!apiKey) {
    console.warn("No API key set. Add your Alpha Vantage key in apiKey variable.");
    return {};
  }
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data["Global Quote"] || {};
  } catch (err) {
    console.error("Error fetching stock:", err);
    return {};
  }
}

async function renderStockCard(symbol) {
  const container = document.getElementById("stocks-container");
  const { quote } = await (async () => {
    const q = await fetchStock(symbol);
    return { quote: q };
  })();

  const price = quote && quote["05. price"] ? parseFloat(quote["05. price"]) : (Math.random() * 2000 + 500);
  const changePercentRaw = quote && quote["10. change percent"] ? quote["10. change percent"] : ((Math.random() - 0.5) * 5).toFixed(2) + "%";
  const changePercent = parseFloat(changePercentRaw.replace("%","")) || 0;

  const card = document.createElement("div");
  card.className = "stock-card";
  card.setAttribute("data-symbol", symbol);
  card.setAttribute("data-source", "api");
  card.innerHTML = `
    <div class="stock-header">
      <div class="stock-info">
        <div class="stock-logo">${symbol[0]}</div>
        <div class="stock-name">${symbol}</div>
        <div class="stock-description">Live market data</div>
      </div>
    </div>
    <div class="stock-price-large">₹${price.toFixed(2)}</div>
    <div class="stock-change ${changePercent >= 0 ? "positive" : "negative"}">
      ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%
    </div>
    <div class="chart-placeholder">
      <canvas class="stock-chart"></canvas>
    </div>
  `;
  container.appendChild(card);
  initCharts();
}

async function loadSectorStocks() {
  const sector = sectorSelect.value;
  const container = document.getElementById("stocks-container");
  container.innerHTML = ""; // clear old stocks
  if (!sector || !sectorStocks[sector]) return;
  for (const symbol of sectorStocks[sector]) {
    await renderStockCard(symbol);
  }
  document.getElementById("foundCount").textContent = `📊 ${sectorStocks[sector].length} stocks found`;
}

async function searchStock(symbol) {
  const apiKey = ""; 
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data["Global Quote"] || !data["Global Quote"]["05. price"]) {
      document.getElementById("stocks-container").innerHTML = `
        <div class="alert alert-danger mt-3">
          Stock <b>${symbol}</b> not found. Please check the symbol.
        </div>`;
      return;
    }

    const stock = data["Global Quote"];

    // Build card dynamically
    document.getElementById("stocks-container").innerHTML = `
      <div class="stock-card">
        <div class="stock-header">
          <div class="stock-info">
            <div class="stock-name">${symbol}</div>
            <div class="stock-description">Live Market Data</div>
          </div>
          <div class="stock-price-large">₹${stock["05. price"]}</div>
        </div>
        <div class="stock-meta">
          <span class="sector-tag">N/A</span>
          <span class="market-cap">Volume: ${stock["06. volume"]}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error fetching stock:", error);
  }
}

let stockChart = null; // for Chart.js instance reuse

// Example dummy stock data (replace with API data)
const stockDetails = {
  "TCS.BSE": {
    name: "Tata Consultancy Services",
    sector: "IT",
    price: 3645,
    change: "+1.8%",
    volume: "1.2M",
    marketCap: "13.5T",
    peRatio: "28.5",
    week52: "3100 - 3800",
    history: Array.from({ length: 30 }, () => 3400 + Math.random() * 300)
  },
  "RELIANCE.BSE": {
    name: "Reliance Industries",
    sector: "Energy",
    price: 2540,
    change: "-0.5%",
    volume: "2.8M",
    marketCap: "17.3T",
    peRatio: "23.1",
    week52: "2200 - 2700",
    history: Array.from({ length: 30 }, () => 2400 + Math.random() * 200)
  },
  "INFY.BSE": {
    name: "Infosys Ltd",
    sector: "IT",
    price: 1480,
    change: "+0.9%",
    volume: "3.1M",
    marketCap: "6.2T",
    peRatio: "26.7",
    week52: "1250 - 1550",
    history: Array.from({ length: 30 }, () => 1400 + Math.random() * 100)
  },
  "HDFCBANK.BSE": {
    name: "HDFC Bank",
    sector: "Banking",
    price: 1620,
    change: "-0.4%",
    volume: "4.6M",
    marketCap: "9.8T",
    peRatio: "22.5",
    week52: "1450 - 1750",
    history: Array.from({ length: 30 }, () => 1600 + Math.random() * 80)
  },
  "ICICIBANK.BSE": {
    name: "ICICI Bank",
    sector: "Banking",
    price: 980,
    change: "+0.3%",
    volume: "5.2M",
    marketCap: "6.5T",
    peRatio: "21.9",
    week52: "850 - 1050",
    history: Array.from({ length: 30 }, () => 950 + Math.random() * 70)
  }
};

// When a stock card is clicked
function showStockDetails(symbol) {
  const data = stockDetails[symbol];
  if (!data) {
    alert(`Stock ${symbol} does not exist in records.`);
    return;
  }

  // Fill modal fields
  document.getElementById("detailsSymbol").textContent = symbol;
  document.getElementById("detailsPrice").textContent = data.price;
  document.getElementById("detailsSector").textContent = data.sector;
  document.getElementById("detailsChange").textContent = data.change;
  document.getElementById("detailsVolume").textContent = data.volume;
  document.getElementById("detailsMarketCap").textContent = data.marketCap;
  document.getElementById("detailsPERatio").textContent = data.peRatio;
  document.getElementById("details52Week").textContent = data.week52;
  document.getElementById("detailsLastUpdate").textContent = new Date().toLocaleString();

  // Chart.js
  const ctx = document.getElementById("detailsChart").getContext("2d");
  if (stockChart) stockChart.destroy(); // destroy old chart before making new
  stockChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: data.history.length }, (_, i) => `Day ${i + 1}`),
      datasets: [{
        label: `${symbol} Price`,
        data: data.history,
        borderColor: "#7bb3d9",
        backgroundColor: "rgba(123, 179, 217, 0.3)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { ticks: { color: "#fff" } }
      }
    }
  });

  // Open modal
  const modal = new bootstrap.Modal(document.getElementById("stockDetailsModal"));
  modal.show();
}

// Example: Add stock cards dynamically
function renderStocks() {
  const container = document.getElementById("stocks-container");
  container.innerHTML = "";
  Object.keys(stockDetails).forEach(symbol => {
    const stock = stockDetails[symbol];
    const card = document.createElement("div");
    card.className = "stock-card";
    card.innerHTML = `
      <div class="stock-header">
        <div class="stock-info">
          <div class="stock-name">${stock.name}</div>
          <div class="stock-description">${symbol} | ${stock.sector}</div>
        </div>
        <div class="stock-price-large">₹${stock.price}</div>
      </div>
      <div class="stock-meta">
        <span class="sector-tag">${stock.sector}</span>
        <span class="market-cap">${stock.marketCap}</span>
      </div>
    `;
    card.addEventListener("click", () => showStockDetails(symbol));
    container.appendChild(card);
  });
}

// Call it on page load
renderStocks();

function showSuggestions() {
  const input = document.getElementById("stockInput").value.trim().toUpperCase();
  const suggestionsDiv = document.getElementById("suggestions");
  if (!input) {
    suggestionsDiv.innerHTML = "";
    return;
  }
  const matches = allStocks.filter(symbol => symbol.includes(input));
  if (matches.length === 0) {
    suggestionsDiv.innerHTML = "<div class='text-muted p-2'>No matches found.</div>";
    return;
  }
  suggestionsDiv.innerHTML = matches.map(symbol =>
    `<div class="suggestion-item" style="cursor:pointer; padding:6px;" onclick="selectSuggestion('${symbol}')">${symbol}</div>`
  ).join("");
}

function selectSuggestion(symbol) {
  document.getElementById("stockInput").value = symbol;
  document.getElementById("suggestions").innerHTML = "";
  // Optionally, trigger search
  searchStock(symbol);
}

let watchlist = [];

document.addEventListener("DOMContentLoaded", function() {
  const addBtn = document.getElementById("addToWatchlist");
  if (addBtn) {
    addBtn.onclick = function() {
      const symbol = document.getElementById("detailsSymbol").textContent;
      if (!watchlist.includes(symbol)) {
        watchlist.push(symbol);
        renderWatchlist();
        showWatchlistMessage("Successfully added to watchlist!", "success");
      } else {
        showWatchlistMessage("Already in watchlist.", "info");
      }
    };
  }
});

function showWatchlistMessage(message, type) {
  let msgDiv = document.getElementById("watchlist-msg");
  if (!msgDiv) {
    msgDiv = document.createElement("div");
    msgDiv.id = "watchlist-msg";
    msgDiv.style.position = "fixed";
    msgDiv.style.top = "20px";
    msgDiv.style.right = "20px";
    msgDiv.style.zIndex = "3000";
    document.body.appendChild(msgDiv);
  }
  msgDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { msgDiv.innerHTML = ""; }, 2000);
}

function renderWatchlist() {
  const container = document.getElementById("watchlist-container");
  container.innerHTML = "";
  watchlist.forEach(symbol => {
    const data = stockDetails[symbol];
    if (!data) return;
    const card = document.createElement("div");
    card.className = "stock-card";
    card.innerHTML = `
      <div class="stock-header">
        <div class="stock-info">
          <div class="stock-name">${data.name}</div>
          <div class="stock-description">${symbol} | ${data.sector}</div>
        </div>
        <div class="stock-price-large">₹${data.price}</div>
      </div>
      <div class="stock-meta">
        <span class="sector-tag">${data.sector}</span>
        <span class="market-cap">${data.marketCap}</span>
      </div>
    `;
    container.appendChild(card);
  });
}



