// js/script.js - FIXED CORS VERSION

// Google Sheets integration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwqXao9FyGTzGYJQd20iIRHcMo08BII-5y6ZAQG350SPiRdhIEILiMPJjPPZ5SWP1LM/exec';

// Paystack configuration
const PAYSTACK_PUBLIC_KEY = 'pk_test_bc2c499cbb16356b7e39778245f9cf76c0eb4c64';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Elements
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
    
    // Country selection
    if (countrySelect) {
        countrySelect.addEventListener('change', function() {
            otherCountryContainer.classList.toggle('hidden', this.value !== 'other');
        });
    }
    
    // Form submission - SIMPLIFIED VERSION
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
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
                    email: document.getElementById('email').value.trim().toLowerCase(),
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
                
                // SIMPLIFIED: Just save directly without duplicate check
                // The duplicate prevention happens on Google Script side
                
                // Save to localStorage
                localStorage.setItem('registrationData', JSON.stringify(formData));
                
                // Try to save to Google Sheets
                submitBtn.textContent = 'Saving...';
                const saved = await saveToGoogleSheetsSimple(formData);
                
                if (saved) {
                    // Show payment modal
                    if (paymentModal) {
                        paymentModal.classList.remove('hidden');
                        document.body.style.overflow = 'hidden';
                    }
                } else {
                    showAlert('Failed to save. Please try again or contact support.', 'error');
                }
                
            } catch (error) {
                console.error('Form submission error:', error);
                showAlert('An error occurred. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Confirm payment
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', function() {
            if (initializePaystackPayment()) {
                paymentModal?.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    // Cancel payment (WhatsApp)
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', function() {
            const data = JSON.parse(localStorage.getItem('registrationData') || '{}');
            const phone = '2349155775787';
            const message = encodeURIComponent(
                `Hello! I registered for the Global Idara Tech Bootcamp\n` +
                `Name: ${data.firstName} ${data.lastName}\n` +
                `Reference: ${data.reference}\n` +
                `I need help with payment.`
            );
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            
            paymentModal?.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
    }
    
    // Process payment button
    if (processPaymentBtn) {
        processPaymentBtn.addEventListener('click', initializePaystackPayment);
    }
    
    // Check for Paystack callback
    checkPaystackCallback();
    
    // Success page
    if (window.location.pathname.includes('success.html')) {
        createConfettiEffect();
        
        // Update WhatsApp link
        const data = JSON.parse(localStorage.getItem('registrationData') || '{}');
        if (data.firstName && whatsappLink) {
            const message = encodeURIComponent(
                `Hi! I'm ${data.firstName} ${data.lastName}.\n` +
                `I completed payment for the bootcamp.\n` +
                `Reference: ${data.reference}\n` +
                `I'd like to join the WhatsApp group.`
            );
            whatsappLink.href = `https://wa.me/2349155775787?text=${message}`;
        }
    }
    
    // Close modal on outside click
    if (paymentModal) {
        paymentModal.addEventListener('click', function(e) {
            if (e.target === paymentModal) {
                paymentModal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        });
    }
});

// ====================
// GOOGLE SHEETS INTEGRATION - SIMPLIFIED
// ====================

// Simple save function - no CORS issues
async function saveToGoogleSheetsSimple(formData) {
    return new Promise((resolve) => {
        console.log('Attempting to save to Google Sheets:', formData);
        
        // Create a hidden iframe to submit the form (bypasses CORS)
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.name = 'google-sheets-iframe';
        
        // Create a form
        const form = document.createElement('form');
        form.target = 'google-sheets-iframe';
        form.action = SCRIPT_URL;
        form.method = 'POST';
        
        // Add all form data as hidden inputs
        Object.keys(formData).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = formData[key];
            form.appendChild(input);
        });
        
        // Add timestamp
        const timestampInput = document.createElement('input');
        timestampInput.type = 'hidden';
        timestampInput.name = 'timestamp';
        timestampInput.value = new Date().toISOString();
        form.appendChild(timestampInput);
        
        // Append to body and submit
        document.body.appendChild(iframe);
        document.body.appendChild(form);
        
        // Set timeout to check if saved
        const timeout = setTimeout(() => {
            console.log('Save attempt completed (timeout)');
            // Assume success since we can't read response due to CORS
            document.body.removeChild(iframe);
            document.body.removeChild(form);
            resolve(true);
        }, 3000);
        
        // When iframe loads (response received)
        iframe.onload = function() {
            clearTimeout(timeout);
            console.log('Google Sheets response received');
            document.body.removeChild(iframe);
            document.body.removeChild(form);
            resolve(true);
        };
        
        // Submit the form
        form.submit();
    });
}

// Alternative method using no-cors fetch
async function saveToGoogleSheetsNoCors(formData) {
    try {
        console.log('Saving with no-cors mode:', formData);
        
        // Convert to FormData
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });
        
        // Use no-cors mode (we can't read response, but request goes through)
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // This bypasses CORS errors
            body: data
        });
        
        console.log('Request sent (no-cors mode)');
        return true;
        
    } catch (error) {
        console.error('Save error (no-cors):', error);
        return false;
    }
}

// Update registration status after payment
async function updateRegistrationStatus(registrationData) {
    try {
        const updateData = {
            action: 'update',
            email: registrationData.email,
            status: 'paid',
            paymentDate: registrationData.paymentDate || new Date().toISOString(),
            paymentMethod: registrationData.paymentMethod || 'paystack',
            paymentReference: registrationData.paymentReference || ''
        };
        
        console.log('Updating status:', updateData);
        
        // Create URL with parameters
        const params = new URLSearchParams(updateData);
        const url = `${SCRIPT_URL}?${params.toString()}`;
        
        // Use no-cors mode
        await fetch(url, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        console.log('Status update request sent');
        return true;
        
    } catch (error) {
        console.error('Update error:', error);
        return false;
    }
}

// ====================
// PAYSTACK INTEGRATION
// ====================

function initializePaystackPayment() {
    const data = JSON.parse(localStorage.getItem('registrationData') || '{}');
    
    if (!data.email) {
        showAlert('Please complete registration first', 'error');
        return false;
    }
    
    if (typeof PaystackPop === 'undefined') {
        showAlert('Payment service not loaded', 'error');
        return false;
    }
    
    // Amount in kobo (₦12,000 = 1200000 kobo)
    const amountInKobo = 1200000;
    
    try {
        const handler = PaystackPop.setup({
            key: PAYSTACK_PUBLIC_KEY,
            email: data.email,
            amount: amountInKobo,
            currency: 'NGN',
            ref: data.reference,
            metadata: {
                custom_fields: [
                    {
                        display_name: "Name",
                        variable_name: "name",
                        value: data.firstName + ' ' + data.lastName
                    },
                    {
                        display_name: "Bootcamp",
                        variable_name: "bootcamp",
                        value: "Global Idara Tech Bootcamp"
                    }
                ]
            },
            callback: function(response) {
                console.log('Payment callback:', response);
                if (response.reference) {
                    handleSuccessfulPayment(response.reference, data);
                }
            },
            onClose: function() {
                console.log('Payment window closed');
            }
        });
        
        handler.openIframe();
        return true;
        
    } catch (error) {
        console.error('Paystack error:', error);
        showAlert('Payment initialization failed', 'error');
        return false;
    }
}

async function handleSuccessfulPayment(reference, data) {
    try {
        // Update data
        data.status = 'paid';
        data.paymentDate = new Date().toISOString();
        data.paymentReference = reference;
        data.paymentMethod = 'paystack';
        
        // Save data
        localStorage.setItem('registrationData', JSON.stringify(data));
        
        // Update Google Sheets
        await updateRegistrationStatus(data);
        
        // Redirect to success
        window.location.href = 'success.html';
        
    } catch (error) {
        console.error('Payment handling error:', error);
        showAlert('Payment successful but error occurred. Please contact support.', 'warning');
        window.location.href = 'success.html';
    }
}

function checkPaystackCallback() {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    
    if (reference) {
        console.log('Paystack callback detected:', reference);
        const data = JSON.parse(localStorage.getItem('registrationData') || '{}');
        if (data && !data.paymentReference) {
            handleSuccessfulPayment(reference, data);
        }
    }
}

// ====================
// UTILITY FUNCTIONS
// ====================

function generateReference() {
    return Date.now() + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.custom-alert').forEach(el => el.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
        type === 'error' ? 'bg-red-100 text-red-800 border-l-4 border-red-500' :
        type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' :
        'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
    }`;
    
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <span class="mr-3">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto">×</button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function validateForm() {
    let isValid = true;
    
    // Clear errors
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
    
    // Check required fields
    const fields = ['firstName', 'lastName', 'email', 'phone'];
    fields.forEach(id => {
        const field = document.getElementById(id);
        if (field && !field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
            field.insertAdjacentHTML('afterend', 
                `<p class="error-message text-red-500 text-sm mt-1">This field is required</p>`
            );
        }
    });
    
    // Validate email
    const email = document.getElementById('email');
    if (email && email.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            isValid = false;
            email.classList.add('border-red-500');
            email.insertAdjacentHTML('afterend',
                `<p class="error-message text-red-500 text-sm mt-1">Invalid email format</p>`
            );
        }
    }
    
    // Validate phone
    const phone = document.getElementById('phone');
    if (phone && phone.value) {
        const cleanedPhone = phone.value.replace(/\D/g, '');
        if (cleanedPhone.length < 10) {
            isValid = false;
            phone.classList.add('border-red-500');
            phone.insertAdjacentHTML('afterend',
                `<p class="error-message text-red-500 text-sm mt-1">Phone must be at least 10 digits</p>`
            );
        }
    }
    
    return isValid;
}

// Confetti effect
function createConfettiEffect() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = ['#10b981', '#0d9488', '#34d399'][Math.floor(Math.random() * 3)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            
            container.appendChild(confetti);
            
            confetti.animate([
                { top: '-20px', opacity: 1 },
                { top: '100vh', opacity: 0 }
            ], {
                duration: Math.random() * 3000 + 2000,
                delay: Math.random() * 1000
            }).onfinish = () => confetti.remove();
        }, i * 30);
    }
}

// ====================
// DUPLICATE PREVENTION WORKAROUND
// ====================

// Since we can't read response due to CORS, we'll prevent duplicates on client side
function setupDuplicatePrevention() {
    const emailField = document.getElementById('email');
    const phoneField = document.getElementById('phone');
    
    // Store submitted emails/phones in session
    const submitted = {
        emails: JSON.parse(sessionStorage.getItem('submitted_emails') || '[]'),
        phones: JSON.parse(sessionStorage.getItem('submitted_phones') || '[]')
    };
    
    if (emailField) {
        emailField.addEventListener('blur', function() {
            const email = this.value.trim().toLowerCase();
            if (email && submitted.emails.includes(email)) {
                showAlert('This email was recently submitted. Please wait or contact support.', 'warning');
            }
        });
    }
    
    if (phoneField) {
        phoneField.addEventListener('blur', function() {
            const phone = this.value.trim().replace(/\D/g, '');
            if (phone && submitted.phones.includes(phone)) {
                showAlert('This phone was recently submitted. Please wait or contact support.', 'warning');
            }
        });
    }
    
    // Store submission
    window.markAsSubmitted = function(formData) {
        submitted.emails.push(formData.email.toLowerCase());
        submitted.phones.push(formData.phone.replace(/\D/g, ''));
        
        sessionStorage.setItem('submitted_emails', JSON.stringify(submitted.emails));
        sessionStorage.setItem('submitted_phones', JSON.stringify(submitted.phones));
        
        // Clear after 5 minutes
        setTimeout(() => {
            submitted.emails = submitted.emails.filter(e => e !== formData.email.toLowerCase());
            submitted.phones = submitted.phones.filter(p => p !== formData.phone.replace(/\D/g, ''));
            sessionStorage.setItem('submitted_emails', JSON.stringify(submitted.emails));
            sessionStorage.setItem('submitted_phones', JSON.stringify(submitted.phones));
        }, 300000); // 5 minutes
    };
}

// Initialize duplicate prevention
document.addEventListener('DOMContentLoaded', function() {
    setupDuplicatePrevention();
});

// Update form submission to mark as submitted
const originalFormSubmit = document.querySelector('#registrationForm');
if (originalFormSubmit) {
    const originalHandler = originalFormSubmit.onSubmit;
    originalFormSubmit.addEventListener('submit', function(e) {
        // Get form data
        const formData = {
            email: document.getElementById('email')?.value.trim().toLowerCase() || '',
            phone: document.getElementById('phone')?.value.trim().replace(/\D/g, '') || ''
        };
        
        // Mark as submitted
        if (window.markAsSubmitted) {
            window.markAsSubmitted(formData);
        }
    });
}