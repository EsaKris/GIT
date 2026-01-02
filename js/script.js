// js/script.js - COMPLETELY FIXED VERSION

// Google Sheets integration setup - UPDATE AFTER REDEPLOYMENT
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwqXao9FyGTzGYJQd20iIRHcMo08BII-5y6ZAQG350SPiRdhIEILiMPJjPPZ5SWP1LM/exec';

// Paystack configuration - Using your test public key
const PAYSTACK_PUBLIC_KEY = 'pk_test_bc2c499cbb16356b7e39778245f9cf76c0eb4c64';

// Storage keys
const STORAGE_KEYS = {
    REGISTRATION_DATA: 'registrationData',
    PENDING_REGISTRATIONS: 'pendingRegistrations',
    SYNC_STATUS: 'syncStatus'
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Registration form handling
    const registrationForm = document.getElementById('registrationForm');
    const paymentModal = document.getElementById('paymentModal');
    const confirmPaymentBtn = document.getElementById('confirmPayment');
    const cancelPaymentBtn = document.getElementById('cancelPayment');
    const countrySelect = document.getElementById('country');
    const otherCountryContainer = document.getElementById('otherCountryContainer');
    const processPaymentBtn = document.getElementById('processPayment');
    const whatsappLink = document.getElementById('whatsappLink');
    const referenceNumber = document.getElementById('referenceNumber');
    
    // Generate unique reference for display
    if (referenceNumber) {
        referenceNumber.textContent = 'GIT-' + generateReference();
    }
    
    // Country selection handling
    if (countrySelect) {
        countrySelect.addEventListener('change', function() {
            if (this.value === 'other') {
                otherCountryContainer.classList.remove('hidden');
            } else {
                otherCountryContainer.classList.add('hidden');
            }
        });
    }
    
    // Form submission handling
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate form
            if (!validateForm()) {
                showAlert('Please fill in all required fields correctly.', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = registrationForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Processing...';
            submitBtn.disabled = true;
            
            try {
                // Collect form data
                const formData = {
                    firstName: document.getElementById('firstName').value.trim(),
                    lastName: document.getElementById('lastName').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    gender: document.getElementById('gender').value,
                    country: document.getElementById('country').value === 'other' 
                              ? document.getElementById('otherCountry').value.trim()
                              : document.getElementById('country').value,
                    countryCode: document.getElementById('countryCode').value,
                    phone: document.getElementById('phone').value.trim(),
                    fullPhone: document.getElementById('countryCode').value + document.getElementById('phone').value.trim(),
                    timestamp: new Date().toISOString(),
                    status: 'registered',
                    reference: 'GIT-' + generateReference()
                };
                
                console.log('Form data collected:', formData);
                
                // Save to localStorage
                localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATA, JSON.stringify(formData));
                
                // Try to save to Google Sheets (but don't block on failure)
                const savePromise = saveToGoogleSheets(formData);
                
                // Show payment modal immediately
                if (paymentModal) {
                    paymentModal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                }
                
                // Check save result but don't block user
                savePromise.then(success => {
                    if (!success) {
                        console.log('Google Sheets save failed, stored locally');
                        storeRegistrationLocally(formData);
                    }
                }).catch(err => {
                    console.error('Save error:', err);
                    storeRegistrationLocally(formData);
                });
                
            } catch (error) {
                console.error('Form submission error:', error);
                showAlert('An error occurred. Please try again.', 'error');
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Confirm payment button
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', function() {
            // Initialize Paystack payment
            if (initializePaystackPayment()) {
                // Close modal
                if (paymentModal) {
                    paymentModal.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                }
            }
        });
    }
    
    // Cancel payment button (WhatsApp redirect)
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', function() {
            const registrationData = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_DATA) || '{}');
            
            // Redirect to WhatsApp
            const phone = '2348123456789'; // REPLACE WITH ACTUAL NUMBER
            const message = encodeURIComponent(
                `Hello! I just registered for the Global Idara Tech Bootcamp\n\n` +
                `Name: ${registrationData.firstName} ${registrationData.lastName}\n` +
                `Email: ${registrationData.email}\n` +
                `Phone: ${registrationData.fullPhone}\n` +
                `Reference: ${registrationData.reference}\n\n` +
                `I would like to discuss alternative payment options.`
            );
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            
            // Close modal
            if (paymentModal) {
                paymentModal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    // Process payment button on payment page
    if (processPaymentBtn) {
        processPaymentBtn.addEventListener('click', function() {
            initializePaystackPayment();
        });
    }
    
    // Check for Paystack callback
    checkPaystackCallback();
    
    // Success page effects
    if (window.location.pathname.includes('success.html')) {
        createConfettiEffect();
        
        // Update WhatsApp link
        const regData = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_DATA) || '{}');
        if (regData.firstName && whatsappLink) {
            const message = encodeURIComponent(
                `Hi! I'm ${regData.firstName} ${regData.lastName}.\n` +
                `I just completed my payment for the Global Idara Tech Bootcamp\n` +
                `Reference: ${regData.reference}\n` +
                `I would like to join the WhatsApp group.`
            );
            whatsappLink.href = `https://wa.me/2348123456789?text=${message}`;
        }
    }
    
    // Close modal when clicking outside
    if (paymentModal) {
        paymentModal.addEventListener('click', function(e) {
            if (e.target === paymentModal) {
                paymentModal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    // Initialize offline sync
    initializeOfflineSync();
    
    // Display sync status
    displaySyncStatus();
    
    // Test Google Script connection
    testGoogleScript();
});

// ====================
// UTILITY FUNCTIONS
// ====================

// Generate unique reference number
function generateReference() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}-${random.toString().padStart(4, '0')}`;
}

// Show alert messages
function showAlert(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.custom-alert').forEach(el => el.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
        type === 'error' ? 'bg-red-100 text-red-800 border-l-4 border-red-500' :
        type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' :
        type === 'warning' ? 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500' :
        'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
    }`;
    
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <span class="mr-3">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-xl">&times;</button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Form validation
function validateForm() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
    
    // Check required fields
    const requiredFields = [
        'firstName', 'lastName', 'email', 'gender', 'country', 'phone'
    ];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
            
            const errorMsg = document.createElement('p');
            errorMsg.className = 'error-message text-red-500 text-sm mt-1';
            errorMsg.textContent = 'This field is required';
            
            const parent = field.closest('.form-group') || field.parentNode;
            if (!parent.querySelector('.error-message')) {
                parent.appendChild(errorMsg);
            }
        }
    });
    
    // Validate email
    const emailField = document.getElementById('email');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            isValid = false;
            emailField.classList.add('border-red-500');
            
            const errorMsg = document.createElement('p');
            errorMsg.className = 'error-message text-red-500 text-sm mt-1';
            errorMsg.textContent = 'Please enter a valid email address';
            
            const parent = emailField.closest('.form-group') || emailField.parentNode;
            if (!parent.querySelector('.error-message')) {
                parent.appendChild(errorMsg);
            }
        }
    }
    
    // Validate phone
    const phoneField = document.getElementById('phone');
    if (phoneField && phoneField.value) {
        const phoneRegex = /^\d{10,15}$/; // Simple validation for 10-15 digits
        const cleanedPhone = phoneField.value.replace(/\D/g, '');
        
        if (!phoneRegex.test(cleanedPhone)) {
            isValid = false;
            phoneField.classList.add('border-red-500');
            
            const errorMsg = document.createElement('p');
            errorMsg.className = 'error-message text-red-500 text-sm mt-1';
            errorMsg.textContent = 'Please enter a valid phone number (10-15 digits)';
            
            const parent = phoneField.closest('.form-group') || phoneField.parentNode;
            if (!parent.querySelector('.error-message')) {
                parent.appendChild(errorMsg);
            }
        }
    }
    
    return isValid;
}

// ====================
// PAYSTACK INTEGRATION
// ====================

// Initialize Paystack payment
function initializePaystackPayment() {
    const registrationData = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_DATA) || '{}');
    
    if (!registrationData.email) {
        showAlert('Please complete the registration form first.', 'error');
        return false;
    }
    
    // Check if Paystack is loaded
    if (typeof PaystackPop === 'undefined') {
        showAlert('Payment service is not available. Please refresh the page.', 'error');
        return false;
    }
    
    // Check Paystack key
    if (!PAYSTACK_PUBLIC_KEY || PAYSTACK_PUBLIC_KEY.includes('your_public_key')) {
        showAlert('Payment configuration error. Please contact support.', 'error');
        return false;
    }
    
    // Amount in kobo (smallest currency unit)
    // $309 = 30900 cents
    const amountInKobo = 1200000;
    
    // Generate reference
    const reference = registrationData.reference || 'GIT-' + generateReference();
    
    console.log('Initializing Paystack payment:', {
        email: registrationData.email,
        amount: amountInKobo,
        reference: reference,
        currency: 'NGN'
    });
    
    try {
        const handler = PaystackPop.setup({
            key: PAYSTACK_PUBLIC_KEY,
            email: registrationData.email,
            amount: amountInKobo,
            currency: 'NGN',
            ref: reference,
            metadata: {
                custom_fields: [
                    {
                        display_name: "First Name",
                        variable_name: "first_name",
                        value: registrationData.firstName || ""
                    },
                    {
                        display_name: "Last Name",
                        variable_name: "last_name",
                        value: registrationData.lastName || ""
                    },
                    {
                        display_name: "Bootcamp",
                        variable_name: "bootcamp",
                        value: "Global Idara Tech Bootcamp"
                    }
                ]
            },
            callback: function(response) {
                console.log('Paystack callback received:', response);
                if (response && response.reference) {
                    handleSuccessfulPayment(response.reference, registrationData);
                } else {
                    showAlert('Payment verification failed. Please contact support.', 'error');
                }
            },
            onClose: function() {
                console.log('Payment window was closed');
                showAlert('Payment window closed. If you completed payment, check your email for confirmation.', 'info');
            }
        });
        
        handler.openIframe();
        return true;
        
    } catch (error) {
        console.error('Paystack initialization error:', error);
        showAlert('Payment initialization failed: ' + error.message, 'error');
        return false;
    }
}

// Handle successful Paystack payment
async function handleSuccessfulPayment(paymentReference, registrationData) {
    try {
        // Update registration data
        registrationData.status = 'paid';
        registrationData.paymentDate = new Date().toISOString();
        registrationData.paymentReference = paymentReference;
        registrationData.paymentMethod = 'paystack';
        
        // Save updated data
        localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATA, JSON.stringify(registrationData));
        
        // Update Google Sheets
        const updateSuccess = await updateRegistrationStatus(registrationData);
        
        if (updateSuccess) {
            // Redirect to success page
            window.location.href = 'success.html';
        } else {
            // Save locally and redirect anyway
            storeRegistrationLocally(registrationData);
            showAlert('Payment successful! There was an issue updating records, but your payment is confirmed.', 'warning');
            window.location.href = 'success.html';
        }
    } catch (error) {
        console.error('Payment handling error:', error);
        showAlert('Payment successful but there was an error. Please contact support with reference: ' + paymentReference, 'error');
        window.location.href = 'success.html';
    }
}

// Check for Paystack callback
function checkPaystackCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');
    
    if (reference || trxref) {
        console.log('Paystack callback detected:', reference || trxref);
        verifyPaymentFromCallback(reference || trxref);
    }
}

// Verify payment from callback
async function verifyPaymentFromCallback(reference) {
    try {
        const registrationData = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_DATA) || '{}');
        
        if (registrationData && !registrationData.paymentReference) {
            // Update with callback reference
            registrationData.paymentReference = reference;
            registrationData.status = 'paid';
            registrationData.paymentDate = new Date().toISOString();
            
            localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATA, JSON.stringify(registrationData));
            
            // Try to update Google Sheets
            try {
                await updateRegistrationStatus(registrationData);
            } catch (error) {
                console.error('Update failed, saving locally:', error);
                storeRegistrationLocally(registrationData);
            }
            
            // Redirect to success page
            window.location.href = 'success.html';
        }
    } catch (error) {
        console.error('Callback verification error:', error);
    }
}

// ====================
// GOOGLE SHEETS INTEGRATION
// ====================

// Save data to Google Sheets
async function saveToGoogleSheets(formData) {
    try {
        console.log('Saving to Google Sheets:', formData);
        
        // Convert to URL-encoded form data (works better with Google Apps Script)
        const formDataEncoded = new URLSearchParams();
        Object.keys(formData).forEach(key => {
            formDataEncoded.append(key, formData[key]);
        });
        
        // Send POST request
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formDataEncoded.toString()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Google Sheets response:', result);
        
        return result.success === true;
        
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        
        // Store locally for later sync
        storeRegistrationLocally(formData);
        
        return false;
    }
}

// Update registration status
async function updateRegistrationStatus(registrationData) {
    try {
        const updateData = {
            email: registrationData.email,
            status: 'paid',
            paymentDate: registrationData.paymentDate || new Date().toISOString(),
            paymentMethod: registrationData.paymentMethod || 'paystack',
            paymentReference: registrationData.paymentReference || '',
            action: 'update'
        };
        
        console.log('Updating status:', updateData);
        
        // Send as query parameters for GET request
        const params = new URLSearchParams(updateData);
        const response = await fetch(`${SCRIPT_URL}?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Update response:', result);
        
        return result.success === true;
        
    } catch (error) {
        console.error('Error updating status:', error);
        
        // Mark for later sync
        storeRegistrationLocally(registrationData);
        
        return false;
    }
}

// ====================
// OFFLINE SUPPORT
// ====================

// Store registration locally
function storeRegistrationLocally(registrationData) {
    try {
        const pending = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_REGISTRATIONS) || '[]');
        
        // Check if already exists
        const exists = pending.some(item => item.email === registrationData.email);
        
        if (!exists) {
            pending.push({
                ...registrationData,
                id: Date.now(),
                synced: false,
                syncAttempts: 0
            });
            
            localStorage.setItem(STORAGE_KEYS.PENDING_REGISTRATIONS, JSON.stringify(pending));
            updateSyncStatus(pending.length);
            
            console.log('Registration stored locally:', registrationData.email);
        }
    } catch (error) {
        console.error('Error storing locally:', error);
    }
}

// Initialize offline sync
function initializeOfflineSync() {
    // Sync on page load if online
    if (navigator.onLine) {
        setTimeout(syncPendingRegistrations, 2000);
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
        showAlert('You are back online. Syncing data...', 'info');
        setTimeout(syncPendingRegistrations, 1000);
    });
    
    window.addEventListener('offline', () => {
        showAlert('You are offline. Data will be saved locally.', 'warning');
    });
}

// Sync pending registrations
async function syncPendingRegistrations() {
    if (!navigator.onLine) return;
    
    const pending = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_REGISTRATIONS) || '[]');
    const unsynced = pending.filter(item => !item.synced && (item.syncAttempts || 0) < 3);
    
    if (unsynced.length === 0) return;
    
    console.log(`Syncing ${unsynced.length} pending registrations...`);
    
    for (const item of unsynced) {
        try {
            let success = false;
            
            if (item.status === 'paid') {
                success = await updateRegistrationStatus(item);
            } else {
                success = await saveToGoogleSheets(item);
            }
            
            if (success) {
                item.synced = true;
                item.syncedAt = new Date().toISOString();
            } else {
                item.syncAttempts = (item.syncAttempts || 0) + 1;
            }
        } catch (error) {
            console.error('Sync error:', error);
            item.syncAttempts = (item.syncAttempts || 0) + 1;
        }
    }
    
    // Update localStorage
    localStorage.setItem(STORAGE_KEYS.PENDING_REGISTRATIONS, JSON.stringify(pending));
    
    // Update display
    updateSyncStatus(pending.filter(item => !item.synced).length);
}

// Update sync status
function updateSyncStatus(pendingCount) {
    localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify({
        pendingCount,
        lastUpdate: new Date().toISOString()
    }));
    
    displaySyncStatus();
}

// Display sync status
function displaySyncStatus() {
    const status = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_STATUS) || '{"pendingCount":0}');
    const pendingCount = status.pendingCount || 0;
    
    if (pendingCount > 0) {
        console.log(`${pendingCount} registration(s) pending sync`);
    }
}

// Test Google Script connection
async function testGoogleScript() {
    try {
        const response = await fetch(`${SCRIPT_URL}?test=true`);
        const result = await response.json();
        console.log('Google Script test:', result);
    } catch (error) {
        console.error('Google Script test failed:', error);
    }
}

// ====================
// SUCCESS PAGE EFFECTS
// ====================

// Confetti effect
function createConfettiEffect() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    const colors = ['#10b981', '#0d9488', '#34d399', '#5eead4', '#a7f3d0', '#6ee7b7'];
    
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            
            container.appendChild(confetti);
            
            // Animate
            const animation = confetti.animate([
                { top: '-20px', opacity: 1, transform: 'rotate(0deg)' },
                { top: '100vh', opacity: 0, transform: `rotate(${Math.random() * 360}deg)` }
            ], {
                duration: Math.random() * 3000 + 2000,
                easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
            });
            
            animation.onfinish = () => {
                if (confetti.parentNode) {
                    confetti.remove();
                }
            };
        }, i * 30);
    }
}

// ====================
// INITIALIZATION
// ====================

// Auto-sync every 30 seconds when online
setInterval(() => {
    if (navigator.onLine) {
        syncPendingRegistrations();
    }
}, 30000);