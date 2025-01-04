const API_URL = 'https://api.frankfurter.app/latest?from=TRY';
let previousRates = null;
let baseRates = null;

const ratesContainer = document.getElementById('ratesContainer');
const lastUpdateElement = document.getElementById('lastUpdate');

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

        // Rastgele değişim ekle (±%0.05 arasında)
        const currentRates = [
            { code: 'USD', name: 'Amerikan Doları', rate: 1 / (baseRates.USD * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'EUR', name: 'Euro', rate: 1 / (baseRates.EUR * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'GBP', name: 'İngiliz Sterlini', rate: 1 / (baseRates.GBP * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'CHF', name: 'İsviçre Frangı', rate: 1 / (baseRates.CHF * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'JPY', name: '100 Japon Yeni', rate: 100 / (baseRates.JPY * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'AUD', name: 'Avustralya Doları', rate: 1 / (baseRates.AUD * (1 + (Math.random() * 0.001 - 0.0005))) }
        ];

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
        ratesContainer.innerHTML = '<p class="error">Döviz kurları yüklenirken bir hata oluştu.</p>';
    }
}

function calculatePercentageChange(currentRate, previousRate) {
    if (!previousRate) return 0;
    const change = ((currentRate - previousRate) / previousRate) * 100;
    return isNaN(change) ? 0 : change;
}

function displayRates(rates, prevRates) {
    ratesContainer.innerHTML = '';
    
    rates.forEach((rate, index) => {
        const rateCard = document.createElement('div');
        rateCard.className = 'rate-card';
        
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
    lastUpdateElement.textContent = now.toLocaleString('tr-TR');
}

// Sayfa yüklendiğinde kurları çek
fetchExchangeRates();

// Her 1 saniyede bir kurları güncelle
setInterval(fetchExchangeRates, 1000); 