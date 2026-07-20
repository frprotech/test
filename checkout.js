// ---------------------------------------------------------------------------
// Stripe configuration - fill these in before going live.
// STRIPE_PUBLISHABLE_KEY: safe to expose in client-side code (starts with pk_).
// WP_API_BASE: your WordPress site's REST base for the endpoint from the
//              stripe-subscription-endpoint.php snippet, e.g.
//              'https://yoursite.com/wp-json/outreach/v1'
// ---------------------------------------------------------------------------
const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_ME';
const WP_API_BASE = '/wp-json/outreach/v1';

document.addEventListener('DOMContentLoaded', () => {
  const cartList = document.getElementById('cart-list');
  if (!cartList) return;

  const items = Array.from(cartList.querySelectorAll('.cart-item'));
  const emailItem = items.find((el) => el.dataset.plan === 'email');
  const bundleItem = items.find((el) => el.dataset.plan === 'bundle');
  const addonItems = items.filter((el) => !['email', 'bundle'].includes(el.dataset.plan));

  const totalAmountEl = document.getElementById('cart-total-amount');
  const submitTotalEl = document.getElementById('submit-total');
  const termsTotalEl = document.getElementById('terms-total');

  const formatPrice = (n) => `$${n}`;
  let currentTotal = 0;

  const isChecked = (item) => item.querySelector('.cart-check').classList.contains('is-checked');
  const setChecked = (item, checked) => {
    const btn = item.querySelector('.cart-check');
    btn.classList.toggle('is-checked', checked);
    btn.setAttribute('aria-pressed', String(checked));
  };
  const setDisabled = (item, disabled) => {
    const btn = item.querySelector('.cart-check');
    btn.disabled = disabled;
  };

  const getSelectedPlans = () => items.filter(isChecked).map((item) => item.dataset.plan);

  const render = () => {
    const bundleActive = isChecked(bundleItem);
    const emailActive = isChecked(emailItem);

    addonItems.forEach((item) => {
      const priceEl = item.querySelector('.cart-item-price');
      const price = emailActive
        ? Number(item.dataset.priceWithEmail)
        : Number(item.dataset.priceWithoutEmail);
      priceEl.textContent = formatPrice(price);
      setDisabled(item, bundleActive);
    });
    setDisabled(emailItem, bundleActive);

    let total = 0;
    if (bundleActive) {
      total = Number(bundleItem.dataset.fixedPrice);
    } else {
      if (emailActive) total += Number(emailItem.dataset.fixedPrice);
      addonItems.forEach((item) => {
        if (isChecked(item)) {
          total += emailActive
            ? Number(item.dataset.priceWithEmail)
            : Number(item.dataset.priceWithoutEmail);
        }
      });
    }

    currentTotal = total;
    totalAmountEl.textContent = formatPrice(total);
    if (submitTotalEl) submitTotalEl.textContent = formatPrice(total);
    if (termsTotalEl) termsTotalEl.textContent = formatPrice(total);
  };

  let preBundleState = null;
  let cartLocked = false;

  items.forEach((item) => {
    const btn = item.querySelector('.cart-check');
    btn.addEventListener('click', () => {
      if (btn.disabled || cartLocked) return;

      if (item === bundleItem) {
        const next = !isChecked(bundleItem);
        setChecked(bundleItem, next);
        if (next) {
          preBundleState = items.map((i) => ({ item: i, checked: isChecked(i) }));
          items.forEach((i) => { if (i !== bundleItem) setChecked(i, true); });
        } else if (preBundleState) {
          preBundleState.forEach(({ item: i, checked }) => { if (i !== bundleItem) setChecked(i, checked); });
          preBundleState = null;
        }
      } else {
        setChecked(item, !isChecked(item));
      }
      render();
    });
  });

  render();

  // -------------------------------------------------------------------------
  // Stripe subscription checkout flow
  // -------------------------------------------------------------------------
  const form = document.getElementById('checkout-form');
  const emailInput = document.getElementById('cf-email');
  const nameInput = document.getElementById('cf-name');
  const continueBtn = document.getElementById('continue-btn');
  const payBtn = document.getElementById('pay-btn');
  const payBtnLabel = document.getElementById('pay-btn-label');
  const payBtnSpinner = document.getElementById('pay-btn-spinner');
  const paymentPlaceholder = document.getElementById('payment-placeholder');
  const errorBox = document.getElementById('payment-error');
  const confirmEl = document.getElementById('checkout-confirm');

  if (!form || typeof Stripe === 'undefined') return;

  const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  let elements = null;

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
  };
  const clearError = () => { errorBox.hidden = true; errorBox.textContent = ''; };

  const setBusy = (busy) => {
    continueBtn.disabled = busy;
    payBtn.disabled = busy;
    payBtnLabel.hidden = busy;
    payBtnSpinner.hidden = !busy;
  };

  continueBtn.addEventListener('click', async () => {
    clearError();

    const selectedPlans = getSelectedPlans();
    if (selectedPlans.length === 0) {
      showError('Pick at least one plan before continuing.');
      return;
    }
    if (!emailInput.value || !nameInput.value) {
      showError('Enter your email and cardholder name first.');
      emailInput.reportValidity();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${WP_API_BASE}/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plans: selectedPlans,
          email: emailInput.value,
          name: nameInput.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Could not start checkout. Please try again.');
      }

      elements = stripe.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#8415A7',
            fontFamily: 'Onest, sans-serif',
            borderRadius: '10px',
          },
        },
      });
      const paymentElement = elements.create('payment');
      paymentElement.mount('#payment-element');

      paymentPlaceholder.hidden = true;
      continueBtn.hidden = true;
      payBtn.hidden = false;

      // Lock the cart once checkout has started - changing plans after this
      // point would no longer match the subscription already created.
      cartLocked = true;
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!elements) return;

    clearError();
    setBusy(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?success=true`,
        payment_method_data: {
          billing_details: {
            name: nameInput.value,
            email: emailInput.value,
          },
        },
      },
    });

    // Only reached if confirmation fails immediately (card declined, etc.) -
    // on success Stripe redirects the browser to return_url.
    if (error) {
      showError(error.message || 'Payment failed. Please check your card details and try again.');
      setBusy(false);
    }
  });

  if (new URLSearchParams(window.location.search).get('success') === 'true' && confirmEl) {
    confirmEl.hidden = false;
    confirmEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
