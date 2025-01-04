const API_URL = 'https://api.frankfurter.app/latest?from=TRY';
let previousRates = null;
let baseRates = null;
let updateInterval = null;
let rateHistory = {};
let chart = null;
let currentCurrency = null;

// Para birimleri ve sembolleri
const CURRENCIES = {
    USD: { name: 'Amerikan Doları', symbol: '$' },
    EUR: { name: 'Euro', symbol: '€' },
    JPY: { name: 'Japon Yeni', symbol: '¥' },
    GBP: { name: 'İngiliz Sterlini', symbol: '£' },
    CNY: { name: 'Çin Renminbi', symbol: '¥' },
    AUD: { name: 'Avustralya Doları', symbol: 'A$' },
    CAD: { name: 'Kanada Doları', symbol: 'C$' },
    CHF: { name: 'İsviçre Frangı', symbol: 'CHF' },
    HKD: { name: 'Hong Kong Doları', symbol: 'HK$' },
    SGD: { name: 'Singapur Doları', symbol: 'S$' },
    SEK: { name: 'İsveç Kronu', symbol: 'kr' },
    KRW: { name: 'Güney Kore Wonu', symbol: '₩' },
    NOK: { name: 'Norveç Kronu', symbol: 'kr' },
    NZD: { name: 'Yeni Zelanda Doları', symbol: 'NZ$' },
    INR: { name: 'Hindistan Rupisi', symbol: '₹' },
    MXN: { name: 'Meksika Pesosu', symbol: '$' },
    TWD: { name: 'Yeni Tayvan Doları', symbol: 'NT$' },
    ZAR: { name: 'Güney Afrika Randı', symbol: 'R' },
    BRL: { name: 'Brezilya Reali', symbol: 'R$' },
    DKK: { name: 'Danimarka Kronu', symbol: 'kr' }
};

// Modal elementleri
const modal = document.getElementById('chartModal');
const closeBtn = document.getElementsByClassName('close')[0];
const chartTitle = document.getElementById('chartTitle');
const timeButtons = document.querySelectorAll('.time-btn');

// Zaman aralığı butonları için olay dinleyicileri
timeButtons.forEach(button => {
    button.addEventListener('click', () => {
        timeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        if (currentCurrency) {
            updateChartData(currentCurrency, button.dataset.range);
        }
    });
});

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
            baseRates = { ...data.rates };
        }

        // Tüm para birimleri için kurları hesapla
        const currentRates = Object.entries(CURRENCIES).map(([code, info]) => ({
            code,
            name: info.name,
            symbol: info.symbol,
            rate: code === 'JPY' ? 
                100 / (data.rates[code] * (1 + (Math.random() * 0.001 - 0.0005))) :
                1 / (data.rates[code] * (1 + (Math.random() * 0.001 - 0.0005)))
        }));

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

async function fetchHistoricalData(currencyCode, timeRange) {
    const endDate = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
        case '1G':
            startDate.setDate(endDate.getDate() - 1);
            break;
        case '1H':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case '1A':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
        case '1Y':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        case '5Y':
            startDate.setFullYear(endDate.getFullYear() - 5);
            break;
        default:
            startDate.setDate(endDate.getDate() - 1);
    }

    // Tarihleri formatla
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    try {
        // Frankfurter API'den tarihsel verileri çek
        const response = await fetch(`https://api.frankfurter.app/${formatDate(startDate)}..${formatDate(endDate)}?from=TRY&to=${currencyCode}`);
        const data = await response.json();
        
        // Verileri düzenle
        const dates = Object.keys(data.rates).map(date => new Date(date));
        const values = Object.values(data.rates).map(rate => 1 / rate[currencyCode]);

        return { dates, values };
    } catch (error) {
        console.error('Tarihsel veriler çekilirken hata oluştu:', error);
        return { dates: [], values: [] };
    }
}

async function updateChartData(currencyCode, timeRange) {
    const data = await fetchHistoricalData(currencyCode, timeRange);
    
    const timeFormat = {
        '1G': { hour: '2-digit', minute: '2-digit' },
        '1H': { month: 'short', day: 'numeric' },
        '1A': { month: 'short', day: 'numeric' },
        '1Y': { year: 'numeric', month: 'short' },
        '5Y': { year: 'numeric', month: 'short' }
    };

    chart.data.labels = data.dates.map(date => 
        date.toLocaleDateString('tr-TR', timeFormat[timeRange])
    );
    chart.data.datasets[0].data = data.values;
    chart.update();
}

async function showChart(currencyCode) {
    currentCurrency = currencyCode;
    const currency = rateHistory[currencyCode];
    if (!currency) return;

    chartTitle.textContent = `${currency.name} (${currencyCode}) Grafiği`;
    modal.style.display = "block";

    const ctx = document.getElementById('rateChart').getContext('2d');
    
    // Eğer önceki grafik varsa yok et
    if (chart) {
        chart.destroy();
    }

    // Aktif zaman aralığını bul
    const activeTimeRange = document.querySelector('.time-btn.active').dataset.range;
    const data = await fetchHistoricalData(currencyCode, activeTimeRange);

    // Yeni grafik oluştur
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates.map(date => date.toLocaleTimeString('tr-TR')),
            datasets: [{
                label: `${currencyCode}/TRY`,
                data: data.values,
                borderColor: '#27F583',
                backgroundColor: 'rgba(39, 245, 131, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#27F583',
                pointBorderColor: '#1A0B2E',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(26, 11, 46, 0.95)',
                    titleFont: {
                        size: 12,
                        weight: 'normal',
                        family: "'Poppins', sans-serif"
                    },
                    bodyFont: {
                        size: 14,
                        weight: 'bold',
                        family: "'Poppins', sans-serif"
                    },
                    padding: 15,
                    cornerRadius: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(4)} ₺`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(39, 245, 131, 0.05)',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        font: {
                            size: 12,
                            family: "'Poppins', sans-serif"
                        },
                        padding: 10,
                        maxTicksLimit: 6
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(39, 245, 131, 0.05)',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        font: {
                            size: 12,
                            family: "'Poppins', sans-serif"
                        },
                        maxRotation: 0,
                        maxTicksLimit: 8,
                        padding: 10
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            elements: {
                line: {
                    borderCapStyle: 'round',
                    borderJoinStyle: 'round'
                }
            }
        }
    });
}

function calculatePercentageChange(currentRate, previousRate) {
    if (!previousRate || previousRate === 0) return 0;
    const change = ((currentRate - previousRate) / previousRate) * 100;
    return Math.min(Math.max(change, -99.99), 99.99); // Değişimi ±%99.99 ile sınırla
}

function displayRates(rates, prevRates) {
    const ratesContainer = document.getElementById('ratesContainer');
    const oldInputValues = {};
    const searchInput = document.getElementById('searchInput');
    const searchText = searchInput.value.toLowerCase().trim();
    
    // Mevcut input değerlerini kaydet
    document.querySelectorAll('.calc-input').forEach(input => {
        const currencyCode = input.getAttribute('data-currency');
        if (input.value) {
            oldInputValues[currencyCode] = input.value;
        }
    });
    
    // Varsa eski "sonuç bulunamadı" mesajını kaldır
    const oldNoResultsMsg = document.getElementById('noResultsMsg');
    if (oldNoResultsMsg) {
        oldNoResultsMsg.remove();
    }
    
    ratesContainer.innerHTML = '';
    let visibleCardCount = 0;
    
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
        
        const oldValue = oldInputValues[rate.code] || '';
        const oldResult = oldValue ? `${oldValue} ${rate.code} (${rate.symbol}) = ${(oldValue * rate.rate).toFixed(2)}₺` : '';
        
        rateCard.innerHTML = `
            <div class="currency">${rate.code} <span class="currency-symbol">${rate.symbol}</span></div>
            <div class="currency-name">${rate.name}</div>
            <div class="rate-value">${rateValue} ₺</div>
            <div class="percentage-change ${changeClass}">
                ${changeSymbol} ${Math.abs(percentageChange).toFixed(4)}%
            </div>
            <div class="calculator">
                <div class="input-wrapper">
                    <input type="number" class="calc-input" placeholder="Miktar girin" 
                        onkeyup="calculateExchange(this, ${rate.rate}, '${rate.code}', '${rate.symbol}')"
                        onclick="event.stopPropagation()"
                        data-currency="${rate.code}"
                        data-symbol="${rate.symbol}"
                        data-rate="${rate.rate}"
                        value="${oldValue}">
                    <div class="number-spinner">
                        <button class="spinner-button" onclick="event.stopPropagation(); adjustValue(this, 1)">+</button>
                        <button class="spinner-button" onclick="event.stopPropagation(); adjustValue(this, -1)">-</button>
                    </div>
                </div>
                <div class="calc-result" style="opacity: ${oldValue ? '1' : '0'}">${oldResult}</div>
            </div>
        `;
        ratesContainer.appendChild(rateCard);
        
        // Arama filtresini uygula
        if (searchText) {
            const currencyCode = rate.code.toLowerCase();
            const currencyName = rate.name.toLowerCase();
            if (!currencyCode.includes(searchText) && !currencyName.includes(searchText)) {
                rateCard.style.display = 'none';
            } else {
                rateCard.style.display = 'block';
                highlightText(rateCard, searchText);
                visibleCardCount++;
            }
        } else {
            visibleCardCount++;
        }
    });
    
    // Arama sonucu yoksa mesajı göster
    if (searchText && visibleCardCount === 0) {
        const noResultsMsg = createNoResultsMessage();
        noResultsMsg.style.display = 'block';
        noResultsMsg.style.animation = 'fadeIn 0.3s ease forwards';
        ratesContainer.appendChild(noResultsMsg);
    }
}

function adjustValue(button, change) {
    const input = button.closest('.calculator').querySelector('.calc-input');
    let value = parseFloat(input.value) || 0;
    value += change;
    if (value < 0) value = 0;
    input.value = value;
    
    // Değişikliği hesapla ve göster
    const rate = parseFloat(input.getAttribute('data-rate'));
    const code = input.getAttribute('data-currency');
    const symbol = input.getAttribute('data-symbol');
    calculateExchange(input, rate, code, symbol);
}

function calculateExchange(input, rate, code, symbol) {
    const value = input.value;
    const resultDiv = input.parentElement.parentElement.querySelector('.calc-result');
    
    if (value && value > 0) {
        const formattedValue = parseFloat(value).toLocaleString('tr-TR', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        });
        const result = (value * rate).toLocaleString('tr-TR', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
        resultDiv.textContent = `${formattedValue} ${code} (${symbol}) = ${result}₺`;
        resultDiv.style.opacity = '1';
        resultDiv.style.color = '#27F583';
    } else {
        resultDiv.style.opacity = '0';
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const lastUpdateElement = document.getElementById('lastUpdate');
    lastUpdateElement.textContent = now.toLocaleString('tr-TR');
}

// Arama fonksiyonu
function filterCurrencies(searchText) {
    const rateCards = document.querySelectorAll('.rate-card');
    const searchLower = searchText.toLowerCase().trim();
    let hasResults = false;
    
    rateCards.forEach(card => {
        const currencyCode = card.querySelector('.currency').textContent.toLowerCase();
        const currencyName = card.querySelector('.currency-name').textContent.toLowerCase();
        
        if (currencyCode.includes(searchLower) || currencyName.includes(searchLower)) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.3s ease forwards';
            hasResults = true;
            
            if (searchText) {
                highlightText(card, searchLower);
            } else {
                removeHighlights(card);
            }
        } else {
            card.style.display = 'none';
            card.style.animation = 'fadeOut 0.3s ease forwards';
        }
    });
    
    // Arama sonucu yoksa bilgi mesajı göster
    const noResultsMsg = document.getElementById('noResultsMsg') || createNoResultsMessage();
    if (!hasResults && searchText) {
        noResultsMsg.style.display = 'block';
        noResultsMsg.style.animation = 'fadeIn 0.3s ease forwards';
    } else {
        noResultsMsg.style.display = 'none';
    }
}

// Sonuç bulunamadı mesajı oluştur
function createNoResultsMessage() {
    const msg = document.createElement('div');
    msg.id = 'noResultsMsg';
    msg.style.cssText = `
        text-align: center;
        padding: 40px;
        color: rgba(255, 255, 255, 0.6);
        font-size: 1.1em;
        display: none;
    `;
    msg.textContent = 'Aradığınız para birimi bulunamadı.';
    document.querySelector('.rates-container').appendChild(msg);
    return msg;
}

// Metni vurgulama fonksiyonu
function highlightText(card, searchText) {
    const currencyEl = card.querySelector('.currency');
    const nameEl = card.querySelector('.currency-name');
    
    if (!currencyEl.hasAttribute('data-original')) {
        currencyEl.setAttribute('data-original', currencyEl.innerHTML);
        nameEl.setAttribute('data-original', nameEl.textContent);
    }
    
    const currencyHtml = currencyEl.getAttribute('data-original');
    const nameText = nameEl.getAttribute('data-original');
    
    const highlightedCurrency = currencyHtml.replace(
        new RegExp(searchText, 'gi'),
        match => `<span class="highlight">${match}</span>`
    );
    
    const highlightedName = nameText.replace(
        new RegExp(searchText, 'gi'),
        match => `<span class="highlight">${match}</span>`
    );
    
    currencyEl.innerHTML = highlightedCurrency;
    nameEl.innerHTML = highlightedName;
}

// Vurguları kaldırma fonksiyonu
function removeHighlights(card) {
    const currencyEl = card.querySelector('.currency');
    const nameEl = card.querySelector('.currency-name');
    
    if (currencyEl.hasAttribute('data-original')) {
        currencyEl.innerHTML = currencyEl.getAttribute('data-original');
        nameEl.innerHTML = nameEl.getAttribute('data-original');
    }
}

// Animasyonlar için stil ekle
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(10px); }
    }
    
    .highlight {
        background: rgba(39, 245, 131, 0.15);
        color: #27F583;
        padding: 2px 4px;
        border-radius: 4px;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

// Sayfa yüklendiğinde kurları çek
fetchExchangeRates();

// Her 3 saniyede bir kurları güncelle
clearInterval(updateInterval);
updateInterval = setInterval(fetchExchangeRates, 3000); 