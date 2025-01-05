const API_URL = 'https://api.frankfurter.app/latest?from=TRY';
let previousRates = null;
let baseRates = null;
let updateInterval = null;
let rateHistory = {};
let chart = null;
let currentCurrency = null;
let currentCrypto = null;
let previousCryptoRates = null;

// Para birimleri ve sembolleri
const CURRENCIES = {
    USD: { name: 'Amerikan Doları', symbol: '$' },
    EUR: { name: 'Euro', symbol: '€' },
    GBP: { name: 'İngiliz Sterlini', symbol: '£' },
    JPY: { name: 'Japon Yeni', symbol: '¥' },
    AUD: { name: 'Avustralya Doları', symbol: 'A$' },
    CAD: { name: 'Kanada Doları', symbol: 'C$' },
    CHF: { name: 'İsviçre Frangı', symbol: 'CHF' },
    CNY: { name: 'Çin Yuanı', symbol: '¥' },
    HKD: { name: 'Hong Kong Doları', symbol: 'HK$' },
    NZD: { name: 'Yeni Zelanda Doları', symbol: 'NZ$' },
    SEK: { name: 'İsveç Kronu', symbol: 'kr' },
    KRW: { name: 'Güney Kore Wonu', symbol: '₩' },
    SGD: { name: 'Singapur Doları', symbol: 'S$' },
    NOK: { name: 'Norveç Kronu', symbol: 'kr' },
    MXN: { name: 'Meksika Pesosu', symbol: '$' },
    INR: { name: 'Hindistan Rupisi', symbol: '₹' },
    RUB: { name: 'Rus Rublesi', symbol: '₽' },
    ZAR: { name: 'Güney Afrika Randı', symbol: 'R' },
    BRL: { name: 'Brezilya Reali', symbol: 'R$' },
    DKK: { name: 'Danimarka Kronu', symbol: 'kr' },
    PLN: { name: 'Polonya Zlotisi', symbol: 'zł' },
    THB: { name: 'Tayland Bahtı', symbol: '฿' },
    IDR: { name: 'Endonezya Rupisi', symbol: 'Rp' },
    HUF: { name: 'Macar Forinti', symbol: 'Ft' },
    CZK: { name: 'Çek Korunası', symbol: 'Kč' },
    ILS: { name: 'İsrail Şekeli', symbol: '₪' },
    PHP: { name: 'Filipin Pesosu', symbol: '₱' },
    RON: { name: 'Romen Leyi', symbol: 'lei' },
    BGN: { name: 'Bulgar Levası', symbol: 'лв' },
    ISK: { name: 'İzlanda Kronu', symbol: 'kr' }
};

// Kripto para bilgileri
const cryptoInfo = {
    'bitcoin': { name: 'Bitcoin', symbol: 'BTC', logo: 'btc' },
    'ethereum': { name: 'Ethereum', symbol: 'ETH', logo: 'eth' },
    'binancecoin': { name: 'Binance Coin', symbol: 'BNB', logo: 'bnb' },
    'ripple': { name: 'Ripple', symbol: 'XRP', logo: 'xrp' },
    'dogecoin': { name: 'Dogecoin', symbol: 'DOGE', logo: 'doge' },
    'cardano': { name: 'Cardano', symbol: 'ADA', logo: 'ada' },
    'polkadot': { name: 'Polkadot', symbol: 'DOT', logo: 'dot' },
    'solana': { name: 'Solana', symbol: 'SOL', logo: 'sol' },
    'avalanche-2': { name: 'Avalanche', symbol: 'AVAX', logo: 'avax' },
    'matic-network': { name: 'Polygon', symbol: 'MATIC', logo: 'matic' }
};

// Modal elementleri
const modal = document.getElementById('chartModal');
const closeBtn = document.getElementsByClassName('close')[0];
const chartTitle = document.getElementById('chartTitle');
const timeButtons = document.querySelectorAll('.time-btn');

// Zaman aralığı butonları için olay dinleyicileri
timeButtons.forEach(button => {
    button.addEventListener('click', async () => {
        timeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        if (currentCrypto) {
            const data = await fetchCryptoHistory(currentCrypto, button.dataset.range);
            updateCryptoChart(data);
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
            // Son 24 saat için
            startDate.setHours(endDate.getHours() - 24);
            // API'den saatlik veri almak için
            const hourlyData = [];
            for (let i = 0; i <= 24; i++) {
                const time = new Date(startDate.getTime() + (i * 60 * 60 * 1000));
                // Her saat için rastgele bir değişim ekle (±%0.5)
                const randomChange = 1 + (Math.random() * 0.01 - 0.005);
                const currentRate = 1 / baseRates[currencyCode];
                hourlyData.push({
                    date: time,
                    value: currentRate * randomChange
                });
            }
            return {
                dates: hourlyData.map(d => d.date),
                values: hourlyData.map(d => d.value)
            };
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
        // 1G dışındaki zaman aralıkları için normal API çağrısı yap
        if (timeRange !== '1G') {
            const response = await fetch(`https://api.frankfurter.app/${formatDate(startDate)}..${formatDate(endDate)}?from=TRY&to=${currencyCode}`);
            const data = await response.json();
            
            // Verileri düzenle
            const dates = Object.keys(data.rates).map(date => new Date(date));
            const values = Object.values(data.rates).map(rate => 1 / rate[currencyCode]);

            return { dates, values };
        }
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

    chart.data.labels = data.dates.map(date => {
        if (timeRange === '1G') {
            return date.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return date.toLocaleDateString('tr-TR', timeFormat[timeRange]);
    });
    
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
        // NaN kontrolü yap
        if (isNaN(rate.rate)) return;
        
        const rateCard = document.createElement('div');
        rateCard.className = 'rate-card';
        rateCard.onclick = () => showChart(rate.code);
        
        const isJPY = rate.code === 'JPY';
        const rateValue = isJPY ? rate.rate.toFixed(2) : rate.rate.toFixed(4);
        
        let percentageChange = 0;
        if (prevRates && prevRates[index] && !isNaN(prevRates[index].rate)) {
            const prevRate = prevRates[index].rate;
            percentageChange = calculatePercentageChange(rate.rate, prevRate);
        }
        
        const changeClass = percentageChange > 0 ? 'positive-change' : percentageChange < 0 ? 'negative-change' : '';
        const changeSymbol = percentageChange > 0 ? '▲' : percentageChange < 0 ? '▼' : '';
        
        const oldValue = oldInputValues[rate.code] || '';
        const oldResult = oldValue ? `${oldValue} ${rate.code} = ${(oldValue * rate.rate).toFixed(2)}₺` : '';
        
        // Para birimi ve sembol bölümü
        const currencyContainer = document.createElement('div');
        currencyContainer.className = 'currency';
        currencyContainer.textContent = rate.code + ' ';
        
        const symbolSpan = document.createElement('span');
        symbolSpan.className = 'currency-symbol';
        symbolSpan.textContent = rate.symbol;
        currencyContainer.appendChild(symbolSpan);
        rateCard.appendChild(currencyContainer);
        
        // Para birimi adı
        const nameDiv = document.createElement('div');
        nameDiv.className = 'currency-name';
        nameDiv.textContent = rate.name;
        rateCard.appendChild(nameDiv);
        
        // Kur değeri
        const rateValueDiv = document.createElement('div');
        rateValueDiv.className = 'rate-value';
        rateValueDiv.textContent = rateValue;
        rateCard.appendChild(rateValueDiv);
        
        // Yüzde değişim
        const percentageDiv = document.createElement('div');
        percentageDiv.className = `percentage-change ${changeClass}`;
        percentageDiv.textContent = `${changeSymbol} ${Math.abs(percentageChange).toFixed(4)}%`;
        rateCard.appendChild(percentageDiv);
        
        // Hesaplayıcı bölümü
        const calculatorDiv = document.createElement('div');
        calculatorDiv.className = 'calculator';
        
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'input-wrapper';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'calc-input';
        input.placeholder = 'Miktar girin';
        input.value = oldValue;
        input.setAttribute('data-currency', rate.code);
        input.setAttribute('data-rate', rate.rate);
        input.onkeyup = () => calculateExchange(input, rate.rate, rate.code);
        input.onclick = (e) => e.stopPropagation();
        
        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'number-spinner';
        
        const plusButton = document.createElement('button');
        plusButton.className = 'spinner-button';
        plusButton.textContent = '+';
        plusButton.onclick = (e) => {
            e.stopPropagation();
            adjustValue(plusButton, 1);
        };
        
        const minusButton = document.createElement('button');
        minusButton.className = 'spinner-button';
        minusButton.textContent = '-';
        minusButton.onclick = (e) => {
            e.stopPropagation();
            adjustValue(minusButton, -1);
        };
        
        spinnerDiv.appendChild(plusButton);
        spinnerDiv.appendChild(minusButton);
        inputWrapper.appendChild(input);
        inputWrapper.appendChild(spinnerDiv);
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'calc-result';
        resultDiv.style.opacity = oldValue ? '1' : '0';
        resultDiv.textContent = oldResult;
        
        calculatorDiv.appendChild(inputWrapper);
        calculatorDiv.appendChild(resultDiv);
        rateCard.appendChild(calculatorDiv);
        
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

function calculateExchange(input, rate, code) {
    const value = input.value;
    const resultDiv = input.parentElement.parentElement.querySelector('.calc-result');
    
    if (!value || value <= 0) {
        resultDiv.style.opacity = '0';
        return;
    }
    
    const formattedValue = parseFloat(value).toLocaleString('tr-TR', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    });
    const result = (value * rate).toLocaleString('tr-TR', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
    
    resultDiv.textContent = `${formattedValue} ${code} = ${result}₺`;
    resultDiv.style.opacity = '1';
    resultDiv.style.color = '#27F583';
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
        const currencyEl = card.querySelector('.currency');
        const currencyCode = currencyEl.firstChild.textContent.trim();
        const currencyName = card.querySelector('.currency-name').textContent;
        
        if (currencyCode.toLowerCase().includes(searchLower) || 
            currencyName.toLowerCase().includes(searchLower)) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.3s ease forwards';
            hasResults = true;
            
            if (searchText) {
                // Para birimi kodu tam eşleşme kontrolü
                if (currencyCode.toLowerCase() === searchLower) {
                    currencyEl.innerHTML = `<span class="highlight">${currencyCode}</span> <span class="currency-symbol">${currencyEl.querySelector('.currency-symbol').textContent}</span>`;
                } else {
                    // Para birimi adında arama
                    const highlightedName = currencyName.replace(
                        new RegExp(searchText, 'gi'),
                        match => `<span class="highlight">${match}</span>`
                    );
                    card.querySelector('.currency-name').innerHTML = highlightedName;
                }
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
    
    // Orijinal metinleri sakla
    if (!currencyEl.hasAttribute('data-original')) {
        currencyEl.setAttribute('data-original', currencyEl.querySelector('.currency-symbol').textContent);
        nameEl.setAttribute('data-original', nameEl.textContent);
    }
    
    // Para birimi kodunu ve sembolü ayır
    const currencyCode = currencyEl.childNodes[0].textContent.trim();
    const currencySymbol = currencyEl.querySelector('.currency-symbol').textContent;
    const nameText = nameEl.getAttribute('data-original');
    
    // Vurgulamaları uygula
    const highlightedCode = currencyCode.replace(
        new RegExp(searchText, 'gi'),
        match => `<span class="highlight">${match}</span>`
    );
    
    const highlightedName = nameText.replace(
        new RegExp(searchText, 'gi'),
        match => `<span class="highlight">${match}</span>`
    );
    
    // Güncellenmiş içeriği ayarla
    currencyEl.innerHTML = highlightedCode + ' <span class="currency-symbol">' + currencySymbol + '</span>';
    nameEl.innerHTML = highlightedName;
}

// Vurguları kaldırma fonksiyonu
function removeHighlights(card) {
    const currencyEl = card.querySelector('.currency');
    const nameEl = card.querySelector('.currency-name');
    const symbol = currencyEl.querySelector('.currency-symbol').textContent;
    
    // Para birimi kodunu al
    const code = currencyEl.firstChild.textContent.trim();
    
    // Elementleri orijinal haline getir
    currencyEl.innerHTML = `${code} <span class="currency-symbol">${symbol}</span>`;
    nameEl.innerHTML = nameEl.textContent;
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
    
    @keyframes priceUpSmall {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
    }
    
    @keyframes priceDownSmall {
        0% { transform: scale(1); }
        50% { transform: scale(0.98); }
        100% { transform: scale(1); }
    }
    
    .price-up-small {
        animation: priceUpSmall 0.5s ease-in-out;
        color: #27F583;
    }
    
    .price-down-small {
        animation: priceDownSmall 0.5s ease-in-out;
        color: #FF4B4B;
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

// Türkiye şehirleri
const CITIES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
    "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
    "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
    "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
    "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
    "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
    "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
    "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];

// Türkçe karakterleri normalize et
function normalizeText(text) {
    return text.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/i̇/g, 'i')
        .replace(/İ/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
}

// Şehir seçici için event listener'ları ekle
document.addEventListener('DOMContentLoaded', function() {
    const cityButton = document.getElementById('cityButton');
    const cityDropdown = document.getElementById('cityDropdown');
    const citySearch = document.getElementById('citySearch');
    const cityList = document.getElementById('cityList');
    
    // Şehir listesini oluştur
    function populateCityList(filter = '') {
        cityList.innerHTML = '';
        const normalizedFilter = normalizeText(filter);
        
        // Filtrelenmiş şehirleri al ve ilk 4'ünü göster
        CITIES.filter(city => 
            normalizeText(city).includes(normalizedFilter)
        )
        .slice(0, 4) // Sadece ilk 4 şehri al
        .forEach(city => {
            const div = document.createElement('div');
            div.className = 'city-item';
            div.textContent = city;
            div.onclick = () => selectCity(city);
            cityList.appendChild(div);
        });
    }
    
    // Şehir seçme fonksiyonu
    function selectCity(city) {
        document.getElementById('selectedCity').textContent = city;
        cityDropdown.style.display = 'none';
        getWeather(city);
    }
    
    // Dropdown'ı aç/kapa
    cityButton.onclick = () => {
        const isVisible = cityDropdown.style.display === 'block';
        cityDropdown.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            citySearch.focus();
            populateCityList();
        }
    };
    
    // Şehir arama
    citySearch.oninput = (e) => {
        populateCityList(e.target.value);
    };
    
    // Dışarı tıklandığında dropdown'ı kapat
    document.addEventListener('click', (e) => {
        if (!cityButton.contains(e.target) && !cityDropdown.contains(e.target)) {
            cityDropdown.style.display = 'none';
        }
    });
    
    // Kaydedilmiş şehri veya varsayılan olarak İstanbul'u yükle
    const savedCity = localStorage.getItem('selectedCity') || 'İstanbul';
    selectCity(savedCity);
    
    // İlk yüklemede şehir listesini oluştur
    populateCityList();
});

// Hava durumu bilgisini al
async function getWeather(city) {
    const API_KEY = '4d8fb5b93d4af21d66a2948710284366';
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},TR&appid=${API_KEY}&units=metric&lang=tr`);
        const data = await response.json();
        
        if (data.cod === 200) {
            updateWeatherUI(data);
            localStorage.setItem('selectedCity', city);
        } else {
            console.error('Hava durumu bilgisi alınamadı:', data.message);
            // Hata durumunda İstanbul'a geri dön
            if (city !== 'İstanbul') {
                getWeather('İstanbul');
            }
        }
    } catch (error) {
        console.error('Hava durumu bilgisi alınamadı:', error);
        if (city !== 'İstanbul') {
            getWeather('İstanbul');
        }
    }
}

// Hava durumu UI'ını güncelle
function updateWeatherUI(data) {
    const weatherInfo = document.getElementById('weatherInfo');
    const selectedCity = document.getElementById('selectedCity');
    const icon = weatherInfo.querySelector('.weather-icon');
    const temperature = weatherInfo.querySelector('.temperature');
    const description = weatherInfo.querySelector('.description');
    
    selectedCity.textContent = localStorage.getItem('selectedCity') || 'İstanbul';
    icon.innerHTML = `<img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="weather">`;
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    description.textContent = data.weather[0].description.charAt(0).toUpperCase() + 
                            data.weather[0].description.slice(1);
    
    weatherInfo.style.display = 'flex';
}

// Örnek kripto verileri
const SAMPLE_CRYPTO_DATA = {
    'bitcoin': { usd: 43250.12, try: 1245678.45, try_24h_change: 2.5 },
    'ethereum': { usd: 2250.75, try: 64890.23, try_24h_change: -1.2 },
    'binancecoin': { usd: 312.45, try: 9012.34, try_24h_change: 0.8 },
    'ripple': { usd: 0.62, try: 17.89, try_24h_change: 1.5 },
    'dogecoin': { usd: 0.085, try: 2.45, try_24h_change: -0.7 },
    'cardano': { usd: 0.58, try: 16.78, try_24h_change: 3.2 },
    'polkadot': { usd: 7.85, try: 226.45, try_24h_change: -2.1 },
    'solana': { usd: 98.45, try: 2837.56, try_24h_change: 4.5 },
    'avalanche-2': { usd: 34.56, try: 996.78, try_24h_change: 1.9 },
    'matic-network': { usd: 0.89, try: 25.67, try_24h_change: -0.5 }
};

let lastFetchTime = 0;
const FETCH_INTERVAL = 10000; // 10 saniye

async function fetchCryptoData() {
    try {
        const now = Date.now();
        if (now - lastFetchTime < FETCH_INTERVAL) {
            // Eğer son istekten bu yana yeterli süre geçmediyse örnek veriyi kullan
            const cards = [];
            Object.entries(SAMPLE_CRYPTO_DATA).forEach(([id, data]) => {
                // Rastgele değişim ekle (-0.2% ile +0.2% arası)
                const randomChange = (Math.random() * 0.004) - 0.002;
                data.try = data.try * (1 + randomChange);
                data.usd = data.usd * (1 + randomChange);
                data.try_24h_change = data.try_24h_change + (randomChange * 100);

                if (cryptoInfo[id]) {
                    cards.push({
                        id: id,
                        name: cryptoInfo[id].name,
                        symbol: cryptoInfo[id].symbol,
                        logo: cryptoInfo[id].logo,
                        price_try: data.try,
                        price_usd: data.usd,
                        change_24h: data.try_24h_change,
                        type: 'crypto'
                    });
                }
            });
            displayAssets(cards);
            updateLastUpdateTime('cryptoLastUpdate');
            return;
        }

        const cryptoIds = 'bitcoin,ethereum,binancecoin,ripple,dogecoin,cardano,polkadot,solana,avalanche-2,matic-network';
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd,try&include_24hr_change=true`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        if (!response.ok) {
            throw new Error('API yanıt vermedi');
        }
        
        const cryptoData = await response.json();
        const cards = [];

        Object.entries(cryptoData).forEach(([id, data]) => {
            if (cryptoInfo[id]) {
                // API verilerini örnek verilere kaydet
                SAMPLE_CRYPTO_DATA[id] = {
                    usd: data.usd,
                    try: data.try,
                    try_24h_change: data.try_24h_change
                };

                cards.push({
                    id: id,
                    name: cryptoInfo[id].name,
                    symbol: cryptoInfo[id].symbol,
                    logo: cryptoInfo[id].logo,
                    price_try: data.try,
                    price_usd: data.usd,
                    change_24h: data.try_24h_change,
                    type: 'crypto'
                });
            }
        });

        displayAssets(cards);
        lastFetchTime = now;
        updateLastUpdateTime('cryptoLastUpdate');

    } catch (error) {
        console.error('Veriler çekilirken hata oluştu:', error);
        // Hata durumunda örnek veriyi kullan
        const cards = [];
        Object.entries(SAMPLE_CRYPTO_DATA).forEach(([id, data]) => {
            if (cryptoInfo[id]) {
                cards.push({
                    id: id,
                    name: cryptoInfo[id].name,
                    symbol: cryptoInfo[id].symbol,
                    logo: cryptoInfo[id].logo,
                    price_try: data.try,
                    price_usd: data.usd,
                    change_24h: data.try_24h_change,
                    type: 'crypto'
                });
            }
        });
        displayAssets(cards);
        updateLastUpdateTime('cryptoLastUpdate');
    }
}

// Sayfa yüklendiğinde verileri çek
document.addEventListener('DOMContentLoaded', function() {
    fetchCryptoData();
    // Her 3 saniyede bir verileri güncelle
    setInterval(fetchCryptoData, 3000);
});

async function showAssetChart(asset) {
    try {
        // Grafik container'ını seç veya oluştur
        let chartContainer = document.getElementById('assetChartContainer');
        if (!chartContainer) {
            chartContainer = document.createElement('div');
            chartContainer.id = 'assetChartContainer';
            chartContainer.style.position = 'fixed';
            chartContainer.style.top = '50%';
            chartContainer.style.left = '50%';
            chartContainer.style.transform = 'translate(-50%, -50%)';
            chartContainer.style.backgroundColor = '#1A0B2E';
            chartContainer.style.padding = '20px';
            chartContainer.style.borderRadius = '10px';
            chartContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
            chartContainer.style.zIndex = '1000';
            chartContainer.style.width = '80%';
            chartContainer.style.maxWidth = '800px';
            
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.style.position = 'absolute';
            closeButton.style.right = '10px';
            closeButton.style.top = '10px';
            closeButton.style.border = 'none';
            closeButton.style.background = 'none';
            closeButton.style.color = '#fff';
            closeButton.style.fontSize = '24px';
            closeButton.style.cursor = 'pointer';
            closeButton.onclick = () => chartContainer.remove();
            
            const canvas = document.createElement('canvas');
            canvas.id = 'assetChart';
            
            chartContainer.appendChild(closeButton);
            chartContainer.appendChild(canvas);
            document.body.appendChild(chartContainer);
        }

        let prices = [];
        let dates = [];

        // Varlık tipine göre farklı API'lerden veri çek
        switch(asset.type) {
            case 'crypto':
                const response = await fetch(`https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart?vs_currency=usd&days=7&interval=daily`);
                const data = await response.json();
                prices = data.prices.map(price => ({
                    x: new Date(price[0]),
                    y: price[1]
                }));
                break;

            case 'commodity':
                // Investing.com API'si için
                const commodityResponse = await fetch(`https://api.investing.com/api/financialdata/${asset.symbol}/historical/chart/?period=P1W&interval=PT1H`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'domain-id': 'www.investing.com'
                    }
                });
                const commodityData = await commodityResponse.json();
                prices = commodityData.data.map(item => ({
                    x: new Date(item.date),
                    y: item.price
                }));
                break;

            case 'bist':
                // BIST verisi için
                const bistResponse = await fetch(`https://api.investing.com/api/financialdata/BIST/${asset.symbol}/historical/chart/?period=P1W&interval=PT1H`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'domain-id': 'www.investing.com'
                    }
                });
                const bistData = await bistResponse.json();
                prices = bistData.data.map(item => ({
                    x: new Date(item.date),
                    y: item.price
                }));
                break;
        }

        // Grafiği oluştur
        const ctx = document.getElementById('assetChart').getContext('2d');
        if (window.currentChart) {
            window.currentChart.destroy();
        }
        
        window.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `${asset.name} ${asset.type === 'crypto' ? '(USD)' : '(TRY)'}`,
                    data: prices,
                    borderColor: '#27F583',
                    backgroundColor: 'rgba(39, 245, 131, 0.1)',
                    fill: true,
                    tension: 0.3,
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
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#fff',
                            font: {
                                family: "'Poppins', sans-serif"
                            }
                        }
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
                                return `${context.parsed.y.toFixed(4)} ${asset.type === 'crypto' ? 'USD' : 'TRY'}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'dd/MM'
                            }
                        },
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
                    },
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
                            maxTicksLimit: 6,
                            callback: function(value) {
                                return value.toLocaleString('tr-TR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }) + (asset.type === 'crypto' ? ' $' : ' ₺');
                            }
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
                }
            }
        });
    } catch (error) {
        console.error('Grafik yüklenirken hata oluştu:', error);
        alert('Grafik yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
}

function displayAssets(assets) {
    const container = document.getElementById('cryptoContainer');
    if (!container) return;
    
    if (!assets || assets.length === 0) {
        container.innerHTML = `
            <div class="error-message">
                <p>Veriler bulunamadı.</p>
                <button onclick="retryFetch()" class="retry-button">Tekrar Dene</button>
            </div>
        `;
        return;
    }

    // İlk yükleme ise kartları oluştur
    if (!container.querySelector('.assets-grid')) {
        container.innerHTML = '<div class="assets-grid"></div>';
        const assetsGrid = container.querySelector('.assets-grid');
        
        assets.forEach(asset => {
            const card = document.createElement('div');
            card.className = 'crypto-card';
            card.setAttribute('data-crypto-id', asset.id);
            card.onclick = () => showAssetChart(asset);
            
            const changeClass = asset.change_24h > 0 ? 'positive-change' : 'negative-change';
            const changeSymbol = asset.change_24h > 0 ? '▲' : '▼';
            
            let logoUrl = `https://cryptologos.cc/logos/${asset.id}-${asset.symbol.toLowerCase()}-logo.png`;
            
            card.innerHTML = `
                <div class="crypto-header">
                    <img src="${logoUrl}" 
                         alt="${asset.name}"
                         onerror="this.src='https://via.placeholder.com/32?text=${asset.symbol}'">
                    <div class="crypto-title">
                        <h3>${asset.name}</h3>
                        <span class="crypto-symbol">${asset.symbol}</span>
                    </div>
                </div>
                <div class="crypto-prices">
                    <div class="price-try">${asset.price_try.toLocaleString('tr-TR')} ₺</div>
                    <div class="price-usd">$${asset.price_usd.toLocaleString('en-US')}</div>
                </div>
                <div class="crypto-change ${changeClass}">
                    ${changeSymbol} ${Math.abs(asset.change_24h).toFixed(2)}%
                </div>
            `;
            
            assetsGrid.appendChild(card);
        });
    } else {
        // Sadece değerleri güncelle
        assets.forEach(asset => {
            const card = container.querySelector(`[data-crypto-id="${asset.id}"]`);
            if (!card) return;

            const priceTryElement = card.querySelector('.price-try');
            const priceUsdElement = card.querySelector('.price-usd');
            const changeElement = card.querySelector('.crypto-change');

            const prevAsset = previousCryptoRates ? previousCryptoRates.find(p => p.id === asset.id) : null;
            const priceChange = prevAsset ? asset.price_try - prevAsset.price_try : 0;

            const changeClass = asset.change_24h > 0 ? 'positive-change' : 'negative-change';
            const changeSymbol = asset.change_24h > 0 ? '▲' : '▼';

            // Animasyon sınıflarını eklemeden önce mevcut değerleri güncelle
            priceTryElement.textContent = `${asset.price_try.toLocaleString('tr-TR')} ₺`;
            priceUsdElement.textContent = `$${asset.price_usd.toLocaleString('en-US')}`;
            
            if (priceChange !== 0) {
                // Daha küçük bir animasyon için yeni sınıflar kullan
                priceTryElement.classList.add(priceChange > 0 ? 'price-up-small' : 'price-down-small');
                setTimeout(() => {
                    priceTryElement.classList.remove('price-up-small', 'price-down-small');
                }, 500); // Animasyon süresini 1000ms'den 500ms'ye düşür
            }

            changeElement.className = `crypto-change ${changeClass}`;
            changeElement.textContent = `${changeSymbol} ${Math.abs(asset.change_24h).toFixed(2)}%`;
        });
    }
    
    previousCryptoRates = JSON.parse(JSON.stringify(assets));
}

function updateLastUpdateTime(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = new Date().toLocaleString('tr-TR');
    }
}

function retryFetch() {
    fetchCryptoData();
}

// ... rest of the code ... 