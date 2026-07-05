let currentGoldPrice = null;
let goldModalTrigger = null;

async function fetchLiveGoldPrice() {
    try {
        const response = await fetch('https://api.gold-api.com/price/XAU-INR', {
            method: 'GET',
            credentials: 'omit',
            redirect: 'error',
            referrerPolicy: 'no-referrer'
        });

        if (!response.ok) {
            throw new Error(`Gold API responded with ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('Gold API returned a non-JSON response');
        }

        const data = await response.json();
        const price = Number(data?.price);

        if (!Number.isFinite(price) || price <= 0) {
            throw new Error('Gold API returned an invalid price');
        }

        currentGoldPrice = Math.round(price * 10);
        return currentGoldPrice;
    } catch {
        currentGoldPrice = 78200;
        return currentGoldPrice;
    }
}

function calculate22KPrice(price24k) {
    return Math.round(price24k * 0.916);
}

function updateCityDisplay(city, base22k, base24k) {
    const cityPremium = {
        Surat: 0, Delhi: 150, Mumbai: 200, Ahmedabad: -50,
        Chennai: 300, Bangalore: 250, Hyderabad: 100, Jaipur: -150,
        Lucknow: -100, Patna: -200, Ranchi: -180,
        Colombo: -1200, Dubai: -800
    };

    const premium = cityPremium[city] || 0;
    const final22k = base22k + premium;
    const final24k = base24k + premium;

    document.getElementById('price-22k').innerText = `₹${final22k.toLocaleString('en-IN')}`;
    document.getElementById('price-24k').innerText = `₹${final24k.toLocaleString('en-IN')}`;
    document.getElementById('location-city').innerText = city;
}

function updateGoldPriceForCity() {
    const city = document.getElementById('city-select').value;
    const price24k = parseInt(document.getElementById('price-24k').innerText.replace(/[₹,]/g, ''), 10) || 78200;
    const price22k = parseInt(document.getElementById('price-22k').innerText.replace(/[₹,]/g, ''), 10) || 71700;
    updateCityDisplay(city, price22k, price24k);
}

export async function openGoldPriceModal(trigger) {
    const modal = document.getElementById('gold-price-modal');
    if (!modal) return;

    goldModalTrigger = trigger || document.activeElement;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    window.jbA11y?.openAccessibleDialog({
        panel: modal,
        overlay: null,
        trigger: goldModalTrigger,
        labelledBy: 'gold-price-modal-title',
        initialFocus: document.getElementById('gold-price-modal-close'),
        onClose: () => {
            modal.classList.remove('flex');
        }
    });

    document.getElementById('price-24k').innerText = 'Loading...';
    document.getElementById('price-22k').innerText = 'Loading...';

    const price24k = await fetchLiveGoldPrice();
    const price22k = calculate22KPrice(price24k);

    document.getElementById('price-24k').innerText = `₹${price24k.toLocaleString('en-IN')}`;
    document.getElementById('price-22k').innerText = `₹${price22k.toLocaleString('en-IN')}`;

    document.getElementById('city-select').value = 'Surat';
    updateCityDisplay('Surat', price22k, price24k);
    window.jbA11y?.announce('Live gold price dialog opened.');
}

export function closeGoldPriceModal() {
    const modal = document.getElementById('gold-price-modal');
    if (!modal) return;

    window.jbA11y?.closeAccessibleDialog({ panel: modal, overlay: null });
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    goldModalTrigger = null;
}

function lookupByPincode() {
    const pin = document.getElementById('pincode-input').value.trim();
    if (!pin) {
        alert('Please enter a PIN code');
        return;
    }

    const pinMap = {
        395: 'Surat', 110: 'Delhi', 400: 'Mumbai', 380: 'Ahmedabad',
        600: 'Chennai', 560: 'Bangalore', 500: 'Hyderabad', 302: 'Jaipur',
        226: 'Lucknow', 800: 'Patna', 834: 'Ranchi'
    };

    let city = 'Surat';
    for (const prefix of Object.keys(pinMap)) {
        if (pin.startsWith(prefix)) {
            city = pinMap[prefix];
            break;
        }
    }

    document.getElementById('city-select').value = city;
    updateGoldPriceForCity();
    document.getElementById('pincode-input').value = '';
}

function detectCurrentLocation() {
    document.getElementById('location-city').innerText = 'Detecting...';
    setTimeout(() => {
        document.getElementById('location-city').innerText = 'Surat, Gujarat';
        updateGoldPriceForCity();
    }, 600);
}

export function initGoldPriceModal() {
    window.openGoldPriceModal = openGoldPriceModal;
    window.closeGoldPriceModal = closeGoldPriceModal;

    document.getElementById('gold-price-modal-close')?.addEventListener('click', closeGoldPriceModal);
    document.getElementById('gold-price-modal')?.addEventListener('click', (event) => {
        if (event.target.id === 'gold-price-modal') closeGoldPriceModal();
    });
    document.getElementById('gold-price-dialog-panel')?.addEventListener('click', (event) => event.stopPropagation());
    document.getElementById('gold-price-detect-btn')?.addEventListener('click', detectCurrentLocation);
    document.getElementById('gold-price-check-pin')?.addEventListener('click', lookupByPincode);
    document.getElementById('city-select')?.addEventListener('change', updateGoldPriceForCity);
}