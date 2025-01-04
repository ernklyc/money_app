const API_URL = 'https://api.frankfurter.app/latest?from=TRY';
let previousRates = null;
let baseRates = null;
let updateInterval = null;
let rateHistory = {};
let chart = null;

// Modal elementleri
const modal = document.getElementById('chartModal');
const closeBtn = document.getElementsByClassName('close')[0];
const chartTitle = document.getElementById('chartTitle');

// Modal kapatma olayları
closeBtn.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

async function fetchExchangeRates() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (!baseRates) {
            baseRates = {
                USD: data.rates.USD,
                EUR: data.rates.EUR,
                GBP: data.rates.GBP,
                CHF: data.rates.CHF,
                JPY: data.rates.JPY,
                AUD: data.rates.AUD
            };
        }

        // Çok küçük rastgele değişimler (±%0.01 arasında)
        const currentRates = [
            { code: 'USD', name: 'Amerikan Doları', rate: 1 / (baseRates.USD * (1 + (Math.random() * 0.0002 - 0.0001))) },
            { code: 'EUR', name: 'Euro', rate: 1 / (baseRates.EUR * (1 + (Math.random() * 0.0002 - 0.0001))) },
            { code: 'GBP', name: 'İngiliz Sterlini', rate: 1 / (baseRates.GBP * (1 + (Math.random() * 0.0002 - 0.0001))) },
            { code: 'CHF', name: 'İsviçre Frangı', rate: 1 / (baseRates.CHF * (1 + (Math.random() * 0.0002 - 0.0001))) },
            { code: 'JPY', name: '100 Japon Yeni', rate: 100 / (baseRates.JPY * (1 + (Math.random() * 0.0002 - 0.0001))) },
            { code: 'AUD', name: 'Avustralya Doları', rate: 1 / (baseRates.AUD * (1 + (Math.random() * 0.0002 - 0.0001))) }
        ];

        // Geçmiş verileri güncelle
        currentRates.forEach(rate => {
            if (!rateHistory[rate.code]) {
                rateHistory[rate.code] = {
                    name: rate.name,
                    values: [],
                    times: []
                };
            }
            
            rateHistory[rate.code].values.push(rate.rate);
            rateHistory[rate.code].times.push(new Date());

            // Son 50 veriyi tut
            if (rateHistory[rate.code].values.length > 50) {
                rateHistory[rate.code].values.shift();
                rateHistory[rate.code].times.shift();
            }
        });

        if (!previousRates) {
            previousRates = JSON.parse(JSON.stringify(currentRates));
            displayRates(currentRates, null);
        } else {
            displayRates(currentRates, previousRates);
            previousRates = JSON.parse(JSON.stringify(currentRates));
        }

        updateLastUpdateTime();

    } catch (error) {
        console.error('Döviz kurları çekilirken hata oluştu:', error);
        const ratesContainer = document.getElementById('ratesContainer');
        ratesContainer.innerHTML = '<p class="error">Döviz kurları yüklenirken bir hata oluştu.</p>';
    }
}

function showChart(currencyCode) {
    const currency = rateHistory[currencyCode];
    if (!currency) return;

    chartTitle.textContent = `${currency.name} (${currencyCode}) Grafiği`;
    modal.style.display = "block";

    const ctx = document.getElementById('rateChart').getContext('2d');
    
    // Eğer önceki grafik varsa yok et
    if (chart) {
        chart.destroy();
    }

    // Yeni grafik oluştur
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currency.times.map(time => time.toLocaleTimeString('tr-TR')),
            datasets: [{
                label: `${currencyCode}/TRY`,
                data: currency.values,
                borderColor: '#00ff9d',
                backgroundColor: 'rgba(0, 255, 157, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#fff'
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function calculatePercentageChange(currentRate, previousRate) {
    if (!previousRate) return 0;
    const change = ((currentRate - previousRate) / previousRate) * 100;
    return isNaN(change) ? 0 : change;
}

function displayRates(rates, prevRates) {
    const ratesContainer = document.getElementById('ratesContainer');
    ratesContainer.innerHTML = '';
    
    rates.forEach((rate, index) => {
        const rateCard = document.createElement('div');
        rateCard.className = 'rate-card';
        rateCard.onclick = () => showChart(rate.code);
        
        const isJPY = rate.code === 'JPY';
        const rateValue = isJPY ? rate.rate.toFixed(2) : rate.rate.toFixed(4);
        
        let percentageChange = 0;
        if (prevRates) {
            const prevRate = prevRates[index].rate;
            percentageChange = calculatePercentageChange(rate.rate, prevRate);
        }
        
        const changeClass = percentageChange > 0 ? 'positive-change' : percentageChange < 0 ? 'negative-change' : '';
        const changeSymbol = percentageChange > 0 ? '▲' : percentageChange < 0 ? '▼' : '';
        
        rateCard.innerHTML = `
            <div class="currency">${rate.code}</div>
            <div class="currency-name">${rate.name}</div>
            <div class="rate-value">${rateValue} ₺</div>
            <div class="percentage-change ${changeClass}">
                ${changeSymbol} ${Math.abs(percentageChange).toFixed(4)}%
            </div>
        `;
        ratesContainer.appendChild(rateCard);
    });
}

function updateLastUpdateTime() {
    const now = new Date();
    const lastUpdateElement = document.getElementById('lastUpdate');
    lastUpdateElement.textContent = now.toLocaleString('tr-TR');
}

// Sayfa yüklendiğinde kurları çek
fetchExchangeRates();

// Her 3 saniyede bir kurları güncelle
clearInterval(updateInterval);
updateInterval = setInterval(fetchExchangeRates, 3000); 