const API_URL = 'https://api.frankfurter.app/latest?from=TRY';
let previousRates = null;
let baseRates = null;
let updateInterval = null;
let rateHistory = {};
let chart = null;
let currentCurrency = null;

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
            baseRates = {
                USD: data.rates.USD,
                EUR: data.rates.EUR,
                GBP: data.rates.GBP,
                CHF: data.rates.CHF,
                JPY: data.rates.JPY,
                AUD: data.rates.AUD
            };
        }

        // Daha gerçekçi değişimler (±%0.05 arasında)
        const currentRates = [
            { code: 'USD', name: 'Amerikan Doları', rate: 1 / (data.rates.USD * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'EUR', name: 'Euro', rate: 1 / (data.rates.EUR * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'GBP', name: 'İngiliz Sterlini', rate: 1 / (data.rates.GBP * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'CHF', name: 'İsviçre Frangı', rate: 1 / (data.rates.CHF * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'JPY', name: '100 Japon Yeni', rate: 100 / (data.rates.JPY * (1 + (Math.random() * 0.001 - 0.0005))) },
            { code: 'AUD', name: 'Avustralya Doları', rate: 1 / (data.rates.AUD * (1 + (Math.random() * 0.001 - 0.0005))) }
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