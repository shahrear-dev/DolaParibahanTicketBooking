// --- DOLA PARIBAHAN STATE MANAGEMENT & DATABASE ---

// Realistic Bus Routes & Departure Schedules
// Every route has 4 daily trips: Morning, Afternoon, Evening and Night.
const busSchedules = [
    // --- Dhaka to Khulna ---
    { id: 'BUS-101', from: 'Dhaka', to: 'Khulna', period: 'Morning',   type: 'AC Deluxe', fare: 800, time: '07:30 AM', dropping: ['Sonadanga Terminal', 'Royal Mor'] },
    { id: 'BUS-102', from: 'Dhaka', to: 'Khulna', period: 'Afternoon', type: 'Non-AC',    fare: 650, time: '02:00 PM', dropping: ['Sonadanga Terminal'] },
    { id: 'BUS-103', from: 'Dhaka', to: 'Khulna', period: 'Evening',   type: 'AC Deluxe', fare: 800, time: '06:30 PM', dropping: ['Sonadanga Terminal', 'Royal Mor'] },
    { id: 'BUS-104', from: 'Dhaka', to: 'Khulna', period: 'Night',     type: 'Non-AC',    fare: 650, time: '10:30 PM', dropping: ['Sonadanga Terminal'] },

    // --- Dhaka to Pirojpur ---
    { id: 'BUS-105', from: 'Dhaka', to: 'Pirojpur', period: 'Morning',   type: 'Non-AC',    fare: 700, time: '08:15 AM', dropping: ['Pirojpur Bus Stand', 'Bekutia Bridge Link'] },
    { id: 'BUS-106', from: 'Dhaka', to: 'Pirojpur', period: 'Afternoon', type: 'AC Deluxe', fare: 850, time: '01:30 PM', dropping: ['Pirojpur Bus Stand'] },
    { id: 'BUS-107', from: 'Dhaka', to: 'Pirojpur', period: 'Evening',   type: 'Non-AC',    fare: 700, time: '07:00 PM', dropping: ['Pirojpur Bus Stand', 'Bekutia Bridge Link'] },
    { id: 'BUS-108', from: 'Dhaka', to: 'Pirojpur', period: 'Night',     type: 'AC Deluxe', fare: 850, time: '11:00 PM', dropping: ['Pirojpur Bus Stand'] },

    // --- Dhaka to Bagerhat ---
    { id: 'BUS-109', from: 'Dhaka', to: 'Bagerhat', period: 'Morning',   type: 'Non-AC',    fare: 650, time: '08:00 AM', dropping: ['Bagerhat Stand', 'Shat Gombuj Stop'] },
    { id: 'BUS-110', from: 'Dhaka', to: 'Bagerhat', period: 'Afternoon', type: 'AC Deluxe', fare: 800, time: '02:30 PM', dropping: ['Bagerhat Stand'] },
    { id: 'BUS-111', from: 'Dhaka', to: 'Bagerhat', period: 'Evening',   type: 'Non-AC',    fare: 650, time: '06:00 PM', dropping: ['Bagerhat Stand', 'Shat Gombuj Stop'] },
    { id: 'BUS-112', from: 'Dhaka', to: 'Bagerhat', period: 'Night',     type: 'AC Deluxe', fare: 800, time: '10:00 PM', dropping: ['Bagerhat Stand'] },

    // --- Dhaka to Gopalganj ---
    { id: 'BUS-113', from: 'Dhaka', to: 'Gopalganj', period: 'Morning',   type: 'Non-AC',    fare: 550, time: '07:00 AM', dropping: ['Dola Filling Station', 'Gopalganj Terminal'] },
    { id: 'BUS-114', from: 'Dhaka', to: 'Gopalganj', period: 'Afternoon', type: 'AC Deluxe', fare: 700, time: '03:30 PM', dropping: ['Dola Filling Station', 'Tungipara Link'] },
    { id: 'BUS-115', from: 'Dhaka', to: 'Gopalganj', period: 'Evening',   type: 'Non-AC',    fare: 550, time: '07:30 PM', dropping: ['Dola Filling Station', 'Gopalganj Terminal'] },
    { id: 'BUS-116', from: 'Dhaka', to: 'Gopalganj', period: 'Night',     type: 'AC Deluxe', fare: 700, time: '11:30 PM', dropping: ['Dola Filling Station', 'Tungipara Link'] }
];

// Pre-booked seats mock store
let globalBookedSeats = {
    'BUS-101': ['A1', 'A2', 'C3'],
    'BUS-105': ['B1', 'B2']
};

let activeUser = JSON.parse(localStorage.getItem('dola_user')) || null;
let registeredUsers = JSON.parse(localStorage.getItem('dola_users')) || [];   // demo account store

// Pages that need a login. Everything else (Home, Book Ticket search/seats, About, Counters) is open to guests.
const protectedViews = ['view-lookup', 'view-mybookings'];
let pendingView = null;   // page the guest wanted to open before being asked to log in
let activeBus = null;
let selectedSeats = [];
let promoDiscountRate = 0;

// Set Default Date to Tomorrow & Load Schedules
document.addEventListener('DOMContentLoaded', () => {
    const searchDateInput = document.getElementById('search-date');
    if (searchDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        searchDateInput.value = tomorrow.toISOString().split('T')[0];
    }
    filterAndRenderSchedules('All', 'All');
    updateUserUI();
});

// --- SPA VIEW CONTROLLER ---
function switchView(viewId) {
    // Guests must log in before opening Check Ticket or My Bookings
    if (protectedViews.includes(viewId) && !activeUser) {
        pendingView = viewId;
        openAuthModal('Please login or register to access this page.');
        return;
    }

    document.querySelectorAll('.spa-view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');

    if (viewId === 'view-booking') {
        const destSelect = document.getElementById('search-to');
        const destVal = destSelect ? destSelect.value : 'All';
        filterAndRenderSchedules(destVal, 'All');
    } else if (viewId === 'view-mybookings') {
        renderMyBookings();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- HERO SEARCH HANDLER ---
function handleHeroSearch(event) {
    if (event) event.preventDefault();
    const destSelect = document.getElementById('search-to');
    const classSelect = document.getElementById('search-class');
    
    const destination = destSelect ? destSelect.value : 'All';
    const coachType = classSelect ? classSelect.value : 'All';

    filterAndRenderSchedules(destination, coachType);
    switchView('view-booking');
}

function selectDestination(destination, coachType) {
    const destSelect = document.getElementById('search-to');
    const classSelect = document.getElementById('search-class');
    if (destSelect) destSelect.value = destination;
    if (classSelect) classSelect.value = coachType;
    filterAndRenderSchedules(destination, coachType);
    switchView('view-booking');
}

// --- SCHEDULES RENDERER ---
function filterAndRenderSchedules(destination = 'All', coachType = 'All') {
    const listContainer = document.getElementById('schedules-list');
    const summaryText = document.getElementById('route-summary-text');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    const filtered = busSchedules.filter(b => {
        const matchDest = (!destination || destination === 'All') ? true : b.to.toLowerCase() === destination.toLowerCase();
        const matchType = (!coachType || coachType === 'All') ? true : b.type.toLowerCase() === coachType.toLowerCase();
        return matchDest && matchType;
    });

    const routeTitle = (!destination || destination === 'All') ? 'All Available Routes' : `Dhaka to ${destination}`;
    if (summaryText) summaryText.innerText = `${routeTitle} (${filtered.length} Buses Available)`;

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding: 30px;">
                <p class="text-muted">No schedules match your search query.</p>
                <button class="btn btn-primary" onclick="filterAndRenderSchedules('All', 'All')" style="margin-top:10px;">Show All Available Buses</button>
            </div>`;
        return;
    }

    filtered.forEach(bus => {
        const card = document.createElement('div');
        card.className = 'schedule-card';
        card.innerHTML = `
            <div class="schedule-info">
                <h4>Dola Paribahan (${bus.type}) <span class="trip-period">${bus.period}</span></h4>
                <div class="schedule-meta">
                    <span>Departure: <strong>${bus.time}</strong></span>
                    <span>Route: ${bus.from} ➔ ${bus.to}</span>
                    <span>Fare: <strong>BDT ${bus.fare}</strong> / seat</span>
                </div>
            </div>
            <button class="btn btn-primary" onclick="selectBusForBooking('${bus.id}')">View Seats 💺</button>
        `;
        listContainer.appendChild(card);
    });

    const step1 = document.getElementById('booking-step-1');
    const step2 = document.getElementById('booking-step-2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
}

// --- SEAT SELECTION & LAYOUT GENERATOR ---
function selectBusForBooking(busId) {
    activeBus = busSchedules.find(b => b.id === busId);
    selectedSeats = [];
    promoDiscountRate = 0;

    document.getElementById('selected-bus-title').innerText = `Dola Paribahan (${activeBus.type}) - ${activeBus.from} to ${activeBus.to}`;
    document.getElementById('selected-bus-time').innerText = `Departure: ${activeBus.time} | Fare: BDT ${activeBus.fare}`;

    const dropSelect = document.getElementById('p-dropping');
    if (dropSelect) {
        dropSelect.innerHTML = '';
        activeBus.dropping.forEach(d => {
            dropSelect.innerHTML += `<option value="${d}">${d}</option>`;
        });
    }

    renderSeatGrid();
    updateFareSummary();
    prefillPassengerDetails();   // auto-fill name & phone for logged-in users

    document.getElementById('booking-step-1').style.display = 'none';
    document.getElementById('booking-step-2').style.display = 'block';
}

function showSchedulesStep() {
    document.getElementById('booking-step-1').style.display = 'block';
    document.getElementById('booking-step-2').style.display = 'none';
}

function renderSeatGrid() {
    const grid = document.getElementById('seats-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const bookedList = globalBookedSeats[activeBus.id] || [];

    rows.forEach(r => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';

        ['1', '2', 'aisle', '3', '4'].forEach(c => {
            if (c === 'aisle') {
                rowDiv.innerHTML += `<div style="text-align:center; font-size:10px; color:#aaa;"></div>`;
            } else {
                const seatCode = `${r}${c}`;
                const isBooked = bookedList.includes(seatCode);
                const isSelected = selectedSeats.includes(seatCode);

                const seatBox = document.createElement('div');
                seatBox.className = `seat-box ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`;
                seatBox.innerText = seatCode;

                if (!isBooked) {
                    seatBox.onclick = () => toggleSeat(seatCode);
                }

                rowDiv.appendChild(seatBox);
            }
        });

        grid.appendChild(rowDiv);
    });
}

function toggleSeat(seatCode) {
    if (selectedSeats.includes(seatCode)) {
        selectedSeats = selectedSeats.filter(s => s !== seatCode);
    } else {
        if (selectedSeats.length >= 4) {
            alert('Maximum 4 seats allowed per ticket booking.');
            return;
        }
        selectedSeats.push(seatCode);
    }
    renderSeatGrid();
    updateFareSummary();
}

function updateFareSummary() {
    const tableBody = document.getElementById('selected-seats-table');
    if (!tableBody) return;

    if (selectedSeats.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No seats selected yet</td></tr>`;
        document.getElementById('sub-total').innerText = 'BDT 0';
        document.getElementById('grand-total').innerText = 'BDT 0';
        document.getElementById('discount-row').style.display = 'none';
        return;
    }

    tableBody.innerHTML = '';
    let subTotal = 0;

    selectedSeats.forEach(seat => {
        subTotal += activeBus.fare;
        tableBody.innerHTML += `
            <tr>
                <td><strong>${seat}</strong></td>
                <td>${activeBus.type}</td>
                <td>BDT ${activeBus.fare}</td>
            </tr>
        `;
    });

    const discountAmt = subTotal * promoDiscountRate;
    const grandTotal = subTotal - discountAmt;

    document.getElementById('sub-total').innerText = `BDT ${subTotal}`;
    if (promoDiscountRate > 0) {
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('discount-val').innerText = `- BDT ${discountAmt}`;
    } else {
        document.getElementById('discount-row').style.display = 'none';
    }
    document.getElementById('grand-total').innerText = `BDT ${grandTotal}`;
}

function applyPromo() {
    const codeInput = document.getElementById('coupon-input');
    if (!codeInput) return;
    const code = codeInput.value.trim().toUpperCase();
    if (code === 'DOLA10') {
        promoDiscountRate = 0.10;
        alert('Promo code DOLA10 applied (10% Discount)!');
        updateFareSummary();
    } else {
        alert('Invalid Promo Code. Try using "DOLA10"');
    }
}

// --- BOOKING & PAYMENT FLOW ---

// Auto-fill the passenger's Name and Phone from the logged-in account (fields stay editable)
function prefillPassengerDetails() {
    if (!activeUser) return;
    const nameField = document.getElementById('p-name');
    const phoneField = document.getElementById('p-phone');
    if (nameField) nameField.value = activeUser.name;
    if (phoneField) phoneField.value = activeUser.phone;
}

// Runs when a guest clicks "Proceed to Payment": ask them to log in first.
// Their selected seats are kept, so they can continue right after logging in.
function requireLoginForCheckout(event) {
    if (!activeUser) {
        if (event) event.preventDefault();   // stops the form from submitting
        openAuthModal('Please login or register to continue with your booking.');
    }
}

function proceedToPayment(event) {
    if (event) event.preventDefault();

    // Safety check in case the form was submitted another way (e.g. pressing Enter)
    if (!activeUser) {
        openAuthModal('Please login or register to continue with your booking.');
        return;
    }
    if (selectedSeats.length === 0) {
        alert('Please select at least 1 seat before checkout.');
        return;
    }

    const grandTotalStr = document.getElementById('grand-total').innerText;
    document.getElementById('pay-amount-display').innerText = grandTotalStr;

    document.getElementById('payment-modal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

function completePayment(event) {
    if (event) event.preventDefault();

    const searchDate = document.getElementById('search-date');
    const refId = 'DOLA-' + Math.floor(100000 + Math.random() * 900000);
    const bookingRecord = {
        refId,
        passengerName: document.getElementById('p-name').value,
        phone: document.getElementById('p-phone').value,
        route: `${activeBus.from} to ${activeBus.to}`,
        date: searchDate ? searchDate.value : new Date().toISOString().split('T')[0],
        time: activeBus.time,
        seats: selectedSeats.join(', '),
        boarding: document.getElementById('p-boarding').value,
        dropping: document.getElementById('p-dropping').value,
        amount: document.getElementById('grand-total').innerText
    };

    let history = JSON.parse(localStorage.getItem('dola_bookings')) || [];
    history.push(bookingRecord);
    localStorage.setItem('dola_bookings', JSON.stringify(history));

    if (!globalBookedSeats[activeBus.id]) globalBookedSeats[activeBus.id] = [];
    globalBookedSeats[activeBus.id].push(...selectedSeats);

    closePaymentModal();
    openETicketModal(bookingRecord);
}

// --- E-TICKET DISPLAY ---
function openETicketModal(record) {
    document.getElementById('ticket-ref-id').innerText = record.refId;
    document.getElementById('t-passenger').innerText = record.passengerName;
    document.getElementById('t-mobile').innerText = record.phone;
    document.getElementById('t-route').innerText = record.route;
    document.getElementById('t-date').innerText = record.date;
    document.getElementById('t-time').innerText = record.time;
    document.getElementById('t-seats').innerText = record.seats;
    document.getElementById('t-boarding').innerText = record.boarding;
    document.getElementById('t-dropping').innerText = record.dropping;
    document.getElementById('t-amount').innerText = record.amount;

    document.getElementById('eticket-modal').classList.add('active');
}

function closeETicketModal() {
    document.getElementById('eticket-modal').classList.remove('active');
    switchView('view-home');
}

// --- TICKET LOOKUP FUNCTIONALITY ---
function toggleLookupInput() {
    const type = document.getElementById('lookup-type').value;
    const label = document.getElementById('lookup-label');
    label.innerText = type === 'ref' ? 'Booking Reference ID' : 'Passenger Mobile Number';
}

function handleTicketSearch(event) {
    if (event) event.preventDefault();
    const type = document.getElementById('lookup-type').value;
    const value = document.getElementById('lookup-value').value.trim();
    const container = document.getElementById('lookup-result-container');

    const history = JSON.parse(localStorage.getItem('dola_bookings')) || [];
    const match = history.find(b => type === 'ref' ? b.refId.toLowerCase() === value.toLowerCase() : b.phone === value);

    if (match) {
        container.innerHTML = `
            <div class="card-box" style="background:#e3fcef; border: 1px solid var(--primary);">
                <h3>Ticket Found (${match.refId})</h3>
                <p><strong>Passenger:</strong> ${match.passengerName} (${match.phone})</p>
                <p><strong>Route:</strong> ${match.route} | <strong>Seats:</strong> ${match.seats}</p>
                <p><strong>Date & Time:</strong> ${match.date} at ${match.time}</p>
                <button class="btn btn-sm btn-primary" style="margin-top:10px;" onclick='openETicketModal(${JSON.stringify(match)})'>View Full E-Ticket 🎟️</button>
            </div>
        `;
    } else {
        container.innerHTML = `<p class="text-center text-muted">No booking record found for "${value}".</p>`;
    }
}

// --- MY BOOKINGS RENDERER ---
function renderMyBookings() {
    const container = document.getElementById('my-bookings-list');
    if (!container) return;
    const history = JSON.parse(localStorage.getItem('dola_bookings')) || [];

    if (history.length === 0) {
        container.innerHTML = `<p class="text-center text-muted">You have no active or past ticket bookings.</p>`;
        return;
    }

    container.innerHTML = '';
    history.forEach(item => {
        container.innerHTML += `
            <div class="schedule-card">
                <div>
                    <h4>Ref: ${item.refId} (${item.route})</h4>
                    <p class="text-muted">Journey Date: ${item.date} at ${item.time} | Seats: ${item.seats}</p>
                </div>
                <button class="btn btn-outline" onclick='openETicketModal(${JSON.stringify(item)})'>Print Voucher</button>
            </div>
        `;
    });
}

// --- AUTHENTICATION MODAL & LOGIC ---
// Optional "message" explains why the guest is being asked to log in
function openAuthModal(message) {
    const msgBox = document.getElementById('auth-message');
    if (msgBox) {
        // authBtn.onclick passes a click event here, so only accept real text
        if (typeof message === 'string' && message) {
            msgBox.innerText = message;
            msgBox.style.display = 'block';
        } else {
            msgBox.style.display = 'none';
        }
    }
    document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
    pendingView = null;   // guest cancelled, forget the page they wanted
}

function switchAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('form-login').style.display = 'block';
        document.getElementById('form-register').style.display = 'none';
        document.getElementById('tab-login-btn').classList.add('active');
        document.getElementById('tab-register-btn').classList.remove('active');
    } else {
        document.getElementById('form-login').style.display = 'none';
        document.getElementById('form-register').style.display = 'block';
        document.getElementById('tab-register-btn').classList.add('active');
        document.getElementById('tab-login-btn').classList.remove('active');
    }
}

// Runs after a successful login/registration
function finishLogin() {
    localStorage.setItem('dola_user', JSON.stringify(activeUser));
    updateUserUI();
    prefillPassengerDetails();          // fill the booking form if it is open

    const target = pendingView;         // read before closeAuthModal clears it
    closeAuthModal();
    if (target) switchView(target);     // take them to the page they originally clicked
}

function handleLogin(event) {
    if (event) event.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const pass = document.getElementById('login-pass').value;

    // Demo only: accounts live in the browser's localStorage
    const account = registeredUsers.find(u => u.phone === phone && u.pass === pass);
    if (!account) {
        alert('Incorrect mobile number or password. New here? Please register first.');
        return;
    }

    activeUser = { name: account.name, phone: account.phone };
    finishLogin();
}

function handleRegister(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value;

    if (registeredUsers.some(u => u.phone === phone)) {
        alert('This mobile number is already registered. Please login instead.');
        return;
    }

    registeredUsers.push({ name, phone, pass });
    localStorage.setItem('dola_users', JSON.stringify(registeredUsers));

    activeUser = { name, phone };
    finishLogin();
}

function updateUserUI() {
    if (activeUser) {
        const userDisplay = document.getElementById('user-display');
        const userNameSpan = document.getElementById('user-name-span');
        const authBtn = document.getElementById('auth-btn');

        if (userDisplay) userDisplay.style.display = 'inline';
        if (userNameSpan) userNameSpan.innerText = activeUser.name;
        if (authBtn) {
            authBtn.innerText = 'Logout';
            authBtn.onclick = logoutUser;
        }
    }
}

function logoutUser() {
    localStorage.removeItem('dola_user');
    activeUser = null;
    const userDisplay = document.getElementById('user-display');
    const authBtn = document.getElementById('auth-btn');

    if (userDisplay) userDisplay.style.display = 'none';
    if (authBtn) {
        authBtn.innerText = 'Login / Register';
        authBtn.onclick = openAuthModal;
    }

    // Clear the auto-filled passenger details
    const nameField = document.getElementById('p-name');
    const phoneField = document.getElementById('p-phone');
    if (nameField) nameField.value = '';
    if (phoneField) phoneField.value = '';

    // Leave login-only pages after logging out
    const current = document.querySelector('.spa-view.active');
    if (current && protectedViews.includes(current.id)) switchView('view-home');
}