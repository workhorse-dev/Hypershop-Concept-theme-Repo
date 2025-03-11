class TabList extends HTMLUListElement {
  constructor() {
    super();

    this.controls.forEach((button) => button.addEventListener('click', this.handleButtonClick.bind(this)));
  }

  get controls() {
    return this._controls = this._controls || Array.from(this.querySelectorAll('[aria-controls]'));
  }

  handleButtonClick(event) {
    event.preventDefault();

    this.controls.forEach((button) => {
      button.setAttribute('aria-expanded', 'false');

      const panel = document.getElementById(button.getAttribute('aria-controls'));
      panel?.removeAttribute('open');
    });

    const target = event.currentTarget;
    target.setAttribute('aria-expanded', 'true');

    const panel = document.getElementById(target.getAttribute('aria-controls'));
    panel?.setAttribute('open', '');
  }

  reset() {
    const firstControl = this.controls[0];
    firstControl.dispatchEvent(new Event('click'));
  }
}
customElements.define('tab-list', TabList, { extends: 'ul' });

class CartDrawer extends DrawerElement {
  constructor() {
    super();

    this.onPrepareBundledSectionsListener = this.onPrepareBundledSections.bind(this);
    this.onCartRefreshListener = this.onCartRefresh.bind(this);
  }

  get sectionId() {
    return this.getAttribute('data-section-id');
  }

  get shouldAppendToBody() {
    return false;
  }

  get recentlyViewed() {
    return this.querySelector('recently-viewed');
  }

  get tabList() {
    return this.querySelector('[is="tab-list"]');
  }

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener('cart:bundled-sections', this.onPrepareBundledSectionsListener);
    document.addEventListener('cart:refresh', this.onCartRefreshListener);
    if (this.recentlyViewed) {
      this.recentlyViewed.addEventListener('is-empty', this.onRecentlyViewedEmpty.bind(this));
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener('cart:bundled-sections', this.onPrepareBundledSectionsListener);
    document.removeEventListener('cart:refresh', this.onCartRefreshListener);
  }

  onPrepareBundledSections(event) {
    event.detail.sections.push(this.sectionId);
  }

  onRecentlyViewedEmpty() {
    this.recentlyViewed.innerHTML = `
    <div class="drawer__scrollable relative flex justify-center items-start grow shrink text-center">
      <div class="drawer__empty grid gap-5 md:gap-8">
        <h2 class="drawer__empty-text heading leading-none tracking-tight">${theme.strings.recentlyViewedEmpty}</h2>
      </div>
    </div>
    `;
  }

  async onCartRefresh(event) {
    const id = `MiniCart-${this.sectionId}`;
    if (document.getElementById(id) === null) return;

    const responseText = await (await fetch(`${theme.routes.root_url}?section_id=${this.sectionId}`)).text();
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');

    document.getElementById(id).innerHTML = parsedHTML.getElementById(id).innerHTML;

    if (event.detail.open === true) {
      this.show();
    }
  }

  show(focusElement = null, animate = true) {
    super.show(focusElement, animate);

    if (this.tabList) {
      this.tabList.reset();

      if (this.open) {
        theme.a11y.trapFocus(this, this.focusElement);
      }
    }
  }
}
customElements.define('cart-drawer', CartDrawer);

class CartRemoveButton extends HTMLAnchorElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();

      const cartItems = this.closest('cart-items');
      cartItems.updateQuantity(this.getAttribute('data-index'), 0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton, { extends: 'a' });

class CartItems extends HTMLElement {
  cartUpdateUnsubscriber = undefined;

  constructor() {
    super();

    this.addEventListener('change', theme.utils.debounce(this.onChange.bind(this), 300));
    this.cartUpdateUnsubscriber = theme.pubsub.subscribe(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate.bind(this));
  }

  get sectionId() {
    return this.getAttribute('data-section-id');
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    this.validateQuantity(event);
  }

  onCartUpdate(event) {
    if (event.cart.errors) {
      this.onCartError(event.cart.errors, event.target);
      return;
    }

    const sectionToRender = new DOMParser().parseFromString(event.cart.sections[this.sectionId], 'text/html');

    const miniCart = document.querySelector(`#MiniCart-${this.sectionId}`);
    if (miniCart) {
      const updatedElement = sectionToRender.querySelector(`#MiniCart-${this.sectionId}`);
      if (updatedElement) {
        miniCart.innerHTML = updatedElement.innerHTML;
      }
    }

    const mainCart = document.querySelector(`#MainCart-${this.sectionId}`);
    if (mainCart) {
      const updatedElement = sectionToRender.querySelector(`#MainCart-${this.sectionId}`);
      if (updatedElement) {
        mainCart.innerHTML = updatedElement.innerHTML;
      }
      else {
        mainCart.closest('.cart').classList.add('is-empty');
        mainCart.remove();
      }
    }

    const lineItem = document.getElementById(`CartItem-${event.line}`) || document.getElementById(`CartDrawer-Item-${event.line}`);
    if (lineItem && lineItem.querySelector(`[name="${event.name}"]`)) {
      theme.a11y.trapFocus(mainCart || miniCart, lineItem.querySelector(`[name="${event.name}"]`));
    }
    else if (event.cart.item_count === 0) {
      miniCart
        ? theme.a11y.trapFocus(miniCart, miniCart.querySelector('a'))
        : theme.a11y.trapFocus(document.querySelector('.empty-state'), document.querySelector('.empty-state__link'));
    }
    else {
      miniCart
        ? theme.a11y.trapFocus(miniCart, miniCart.querySelector('.horizontal-product__title'))
        : theme.a11y.trapFocus(mainCart, mainCart.querySelector('.cart__item-title'));
    }

    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: {
        cart: event.cart
      }
    }));
  }

  onCartError(errors, target) {
    if (target) {
      // this.updateQuantity(target.getAttribute('data-index'), target.defaultValue, document.activeElement.getAttribute('name'), target);
      this.disableLoading(target.getAttribute('data-index'));
      this.setValidity(target, errors);
      return;
    }
    else {
      window.location.href = theme.routes.cart_url;
    }

    alert(errors);
  }

  updateQuantity(line, quantity, name, target) {
    this.enableLoading(line);

    let sectionsToBundle = [];
    document.documentElement.dispatchEvent(new CustomEvent('cart:bundled-sections', { bubbles: true, detail: { sections: sectionsToBundle } }));

    const body = JSON.stringify({
      id: line,
      quantity,
      sections: sectionsToBundle
    });

    fetch(`${theme.routes.cart_change_url}`, { ...theme.utils.fetchConfig(), ...{ body } })
      .then((response) => response.json())
      .then((parsedState) => {
        theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cart: parsedState, target, line, name });
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted by user');
        }
        else {
          console.error(error);
        }
      });
  }

  enableLoading(line) {
    const loader = document.getElementById(`Loader-${this.sectionId}-${line}`);
    if (loader) loader.hidden = false;
  }

  disableLoading(line) {
    const loader = document.getElementById(`Loader-${this.sectionId}-${line}`);
    if (loader) loader.hidden = true;
  }

  setValidity(target, message) {
    target.setCustomValidity(message);
    target.reportValidity();
    target.value = target.defaultValue;
    target.select();
  }

  validateQuantity(event) {
    const target = event.target;
    const inputValue = parseInt(target.value);
    const index = target.getAttribute('data-index');
    let message = '';

    if (inputValue < parseInt(target.getAttribute('data-min'))) {
      message = theme.quickOrderListStrings.minError.replace('[min]', target.getAttribute('data-min'));
    }
    else if (inputValue > parseInt(target.max)) {
      message = theme.quickOrderListStrings.maxError.replace('[max]', target.max);
    }
    else if (inputValue % parseInt(target.step) !== 0) {
      message = theme.quickOrderListStrings.stepError.replace('[step]', target.step);
    }

    if (message) {
      this.setValidity(target, message);
    }
    else {
      target.setCustomValidity('');
      target.reportValidity();
      this.updateQuantity(index, inputValue, document.activeElement.getAttribute('name'), target);
    }
  }
}
customElements.define('cart-items', CartItems);

class CartNote extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('change', theme.utils.debounce(this.onChange.bind(this), 300));
  }

  onChange(event) {
    const body = JSON.stringify({ note: event.target.value });
    fetch(`${theme.routes.cart_update_url}`, { ...theme.utils.fetchConfig(), ...{ body } });
  }
}
customElements.define('cart-note', CartNote);

class MainCart extends HTMLElement {
  constructor() {
    super();

    document.addEventListener('cart:bundled-sections', this.onPrepareBundledSections.bind(this));
  }

  get sectionId() {
    return this.getAttribute('data-section-id');
  }

  onPrepareBundledSections(event) {
    event.detail.sections.push(this.sectionId);
  }
}
customElements.define('main-cart', MainCart);

class CountryProvince extends HTMLElement {
  constructor() {
    super();

    this.provinceElement = this.querySelector('[name="address[province]"]');
    this.countryElement = this.querySelector('[name="address[country]"]');
    this.countryElement.addEventListener('change', this.handleCountryChange.bind(this));

    if (this.getAttribute('country') !== '') {
      this.countryElement.selectedIndex = Math.max(0, Array.from(this.countryElement.options).findIndex((option) => option.textContent === this.getAttribute('data-country')));
      this.countryElement.dispatchEvent(new Event('change'));
    }
    else {
      this.handleCountryChange();
    }
  }

  handleCountryChange() {
    const option = this.countryElement.options[this.countryElement.selectedIndex], provinces = JSON.parse(option.getAttribute('data-provinces'));
    this.provinceElement.parentElement.hidden = provinces.length === 0;

    if (provinces.length === 0) {
      return;
    }

    this.provinceElement.innerHTML = '';

    provinces.forEach((data) => {
      const selected = data[1] === this.getAttribute('data-province');
      this.provinceElement.options.add(new Option(data[1], data[0], selected, selected));
    });
  }
}
customElements.define('country-province', CountryProvince);

class ShippingCalculator extends HTMLFormElement {
  constructor() {
    super();

    this.submitButton = this.querySelector('[type="submit"]');
    this.resultsElement = this.lastElementChild;

    this.submitButton.addEventListener('click', this.handleFormSubmit.bind(this));
  }

  handleFormSubmit(event) {
    event.preventDefault();

    this.abortController?.abort();
    this.abortController = new AbortController();

    const zip = this.querySelector('[name="address[zip]"]').value,
      country = this.querySelector('[name="address[country]"]').value,
      province = this.querySelector('[name="address[province]"]').value;

    this.submitButton.setAttribute('aria-busy', 'true');

    const body = JSON.stringify({
      shipping_address: { zip, country, province }
    });
    let sectionUrl = `${theme.routes.cart_url}/shipping_rates.json`;

    // remove double `/` in case shop might have /en or language in URL
    sectionUrl = sectionUrl.replace('//', '/');

    fetch(sectionUrl, { ...theme.utils.fetchConfig('javascript'), ...{ body }, signal: this.abortController.signal })
      .then((response) => response.json())
      .then((parsedState) => {
        if (parsedState.shipping_rates) {
          this.formatShippingRates(parsedState.shipping_rates);
        }
        else {
          this.formatError(parsedState);
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted by user');
        }
        else {
          console.error(error);
        }
      })
      .finally(() => {
        this.resultsElement.hidden = false;
        this.submitButton.removeAttribute('aria-busy');
      });

  }

  formatError(errors) {
    const shippingRatesList = Object.keys(errors).map((errorKey) => {
      return `<li>${errors[errorKey]}</li>`;
    });
    this.resultsElement.innerHTML = `
      <div class="alert alert--error grid gap-2 text-sm leading-tight">
        <p>${theme.shippingCalculatorStrings.error}</p>
        <ul class="list-disc grid gap-2" role="list">${shippingRatesList.join('')}</ul>
      </div>
    `;
  }

  formatShippingRates(shippingRates) {
    const shippingRatesList = shippingRates.map(({ presentment_name, currency, price }) => {
      return `<li>${presentment_name}: ${currency} ${price}</li>`;
    });
    this.resultsElement.innerHTML = `
      <div class="alert alert--${shippingRates.length === 0 ? 'error' : 'success'} grid gap-2 text-sm leading-tight">
        <p>${shippingRates.length === 0 ? theme.shippingCalculatorStrings.notFound : shippingRates.length === 1 ? theme.shippingCalculatorStrings.oneResult : theme.shippingCalculatorStrings.multipleResults}</p>
        ${shippingRatesList === '' ? '' : `<ul class="list-disc grid gap-2" role="list">${shippingRatesList.join('')}</ul>`}
      </div>
    `;

  }
}
customElements.define('shipping-calculator', ShippingCalculator, { extends: 'form' });
