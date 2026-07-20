document.addEventListener('DOMContentLoaded', () => {
  const cartList = document.getElementById('cart-list');
  if (!cartList) return;

  const items = Array.from(cartList.querySelectorAll('.cart-item'));
  const emailItem = items.find((el) => el.dataset.plan === 'email');
  const bundleItem = items.find((el) => el.dataset.plan === 'bundle');
  const addonItems = items.filter((el) => !['email', 'bundle'].includes(el.dataset.plan));

  const totalAmountEl = document.getElementById('cart-total-amount');
  const submitTotalEl = document.getElementById('submit-total');

  const formatPrice = (n) => `$${n}`;

  const isChecked = (item) => item.querySelector('.cart-check').classList.contains('is-checked');
  const setChecked = (item, checked) => {
    const btn = item.querySelector('.cart-check');
    btn.classList.toggle('is-checked', checked);
    btn.setAttribute('aria-pressed', String(checked));
  };
  const setDisabled = (item, disabled) => {
    const btn = item.querySelector('.cart-check');
    btn.disabled = disabled;
    item.classList.toggle('is-disabled', false);
  };

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

    totalAmountEl.textContent = formatPrice(total);
    if (submitTotalEl) submitTotalEl.textContent = formatPrice(total);
  };

  let preBundleState = null;

  items.forEach((item) => {
    const btn = item.querySelector('.cart-check');
    btn.addEventListener('click', () => {
      if (btn.disabled) return;

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

  const form = document.getElementById('checkout-form');
  const confirmEl = document.getElementById('checkout-confirm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (confirmEl) {
        confirmEl.hidden = false;
        confirmEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  const cardInput = document.getElementById('cf-card');
  if (cardInput) {
    cardInput.addEventListener('input', () => {
      const digits = cardInput.value.replace(/\D/g, '').slice(0, 16);
      cardInput.value = digits.replace(/(.{4})/g, '$1 ').trim();
    });
  }

  const expiryInput = document.querySelector('input[name="expiry"]');
  if (expiryInput) {
    expiryInput.addEventListener('input', () => {
      let digits = expiryInput.value.replace(/\D/g, '').slice(0, 4);
      if (digits.length >= 3) digits = `${digits.slice(0, 2)} / ${digits.slice(2)}`;
      expiryInput.value = digits;
    });
  }
});
