const API_URL = 'https://api.exchangerate-api.com/v4/latest/TRY';
let previousRates = null;

const ratesContainer = document.getElementById('ratesContainer');
const lastUpdateElement = document.getElementById('lastUpdate');

async function fetchExchangeRates() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        const currentRates = [
            { code: 'USD', name: 'Amerikan Doları', rate: 1 / data.rates.USD },
            { code: 'EUR', name: 'Euro', rate: 1 / data.rates.EUR },
            { code: 'GBP', name: 'İngiliz Sterlini', rate: 1 / data.rates.GBP },
            { code: 'CHF', name: 'İsviçre Frangı', rate: 1 / data.rates.CHF },
            { code: 'JPY', name: '100 Japon Yeni', rate: 100 / data.rates.JPY },
            { code: 'AUD', name: 'Avustralya Doları', rate: 1 / data.rates.AUD }
        ];

        displayRates(currentRates);
        updateLastUpdateTime();
    } catch (error) {
        console.error('Döviz kurları çekilirken hata oluştu:', error);
        ratesContainer.innerHTML = '<p class="error">Döviz kurları yüklenirken bir hata oluştu.</p>';
    }
}

function displayRates(rates) {
    ratesContainer.innerHTML = '';
    
    rates.forEach(rate => {
        const rateCard = document.createElement('div');
        rateCard.className = 'rate-card';
        
        // Japon Yeni için özel format
        const isJPY = rate.code === 'JPY';
        const rateValue = isJPY ? rate.rate.toFixed(2) : rate.rate.toFixed(4);
        
        rateCard.innerHTML = `
            <div class="currency">${rate.code}</div>
            <div class="currency-name">${rate.name}</div>
            <div class="rate-value">${rateValue} ₺</div>
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

// Her 10 saniyede bir kurları güncelle
setInterval(fetchExchangeRates, 10000); 