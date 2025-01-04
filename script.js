const API_URL = 'https://api.exchangerate-api.com/v4/latest/TRY';
let exchangeRates = [];

const ratesContainer = document.getElementById('ratesContainer');
const lastUpdateElement = document.getElementById('lastUpdate');

async function fetchExchangeRates() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // TL karşısındaki değerleri hesapla
        const rates = [
            { code: 'USD', name: 'Amerikan Doları', rate: 1 / data.rates.USD },
            { code: 'EUR', name: 'Euro', rate: 1 / data.rates.EUR },
            { code: 'GBP', name: 'İngiliz Sterlini', rate: 1 / data.rates.GBP },
            { code: 'CHF', name: 'İsviçre Frangı', rate: 1 / data.rates.CHF },
            { code: 'JPY', name: 'Japon Yeni', rate: 1 / data.rates.JPY },
            { code: 'AUD', name: 'Avustralya Doları', rate: 1 / data.rates.AUD },
            { code: 'CAD', name: 'Kanada Doları', rate: 1 / data.rates.CAD },
            { code: 'KWD', name: 'Kuveyt Dinarı', rate: 1 / data.rates.KWD }
        ];
        
        displayRates(rates);
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
        
        rateCard.innerHTML = `
            <div class="currency">${rate.code}</div>
            <div class="currency-name">${rate.name}</div>
            <div class="rates">
                <div class="value">
                    <span class="rate-value">${rate.rate.toFixed(4)} ₺</span>
                </div>
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

// Her 1 dakikada bir kurları güncelle
setInterval(fetchExchangeRates, 60 * 1000); 