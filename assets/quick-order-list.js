if (!customElements.get('quick-order-list-container')) {
  customElements.define(
    'quick-order-list-container',
    class QuickOrderListContainer extends HTMLElement {
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
  );
}

if (!customElements.get('quick-order-list-remove-button')) {
  customElements.define(
    'quick-order-list-remove-button',
    class QuickOrderListRemoveButton extends HTMLAnchorElement {
      constructor() {
        super();

        this.addEventListener('click', this.onButtonClick);
      }

      get quickOrderList() {
        return this.closest('form[is="quick-order-list"]');
      }

      onButtonClick(event) {
        event.preventDefault();
        this.quickOrderList.updateQuantity(this.getAttribute('data-index'), 0);
      }
    }, { extends: 'a' }
  );
}

if (!customElements.get('quick-order-list-remove-all-button')) {
  customElements.define(
    'quick-order-list-remove-all-button',
    class QuickOrderListRemoveAllButton extends HTMLElement {
      constructor() {
        super();

        this.actions = {
          confirm: 'confirm',
          remove: 'remove',
          cancel: 'cancel',
        };

        this.addEventListener('click', this.onButtonClick);
      }

      get quickOrderList() {
        return this.closest('form[is="quick-order-list"]');
      }

      get allVariants() {
        return this.quickOrderList.querySelectorAll('[data-quantity-variant-id]');
      }

      get items() {
        const items = {};
        this.allVariants.forEach((variant) => {
          const cartQty = parseInt(variant.getAttribute('data-cart-quantity'));
          if (cartQty > 0) {
            this.hasVariantsInCart = true;
            items[parseInt(variant.getAttribute('data-quantity-variant-id'))] = 0;
          }
        });
        return items;
      }

      onButtonClick(event) {
        event.preventDefault();

        if (this.getAttribute('data-action') === this.actions.confirm) {
          this.toggleConfirmation(false, true);
        }
        else if (this.getAttribute('data-action') === this.actions.remove) {
          this.quickOrderList.updateMultipleQty(this.items);
          this.toggleConfirmation(true, false);
        }
        else if (this.getAttribute('data-action') === this.actions.cancel) {
          this.toggleConfirmation(true, false);
        }
      }

      toggleConfirmation(showConfirmation, showInfo) {
        this.quickOrderList.querySelector('.quick-order-list-total__confirmation').toggleAttribute('hidden', showConfirmation);
        this.quickOrderList.querySelector('.quick-order-list-total__info').toggleAttribute('hidden', showInfo);
      }
    }
  );
}

if (!customElements.get('quick-order-list')) {
  customElements.define(
    'quick-order-list',
    class QuickOrderList extends HTMLFormElement {
      cartUpdateUnsubscriber = undefined;

      constructor() {
        super();
        
        this.addEventListener('change', theme.utils.debounce(this.onChange.bind(this), 300));
        this.cartUpdateUnsubscriber = theme.pubsub.subscribe(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate.bind(this));
      }

      get sectionId() {
        return this.getAttribute('data-section-id');
      }

      get allVariants() {
        return this.querySelectorAll('[data-quantity-variant-id]');
      }
    
      disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
        }
      }
    
      onChange(event) {
        const target = event.target;
        const inputValue = parseInt(target.value);
        const index = target.getAttribute('data-index');
        if (inputValue === 0) {
          this.updateQuantity(index, inputValue, document.activeElement.getAttribute('name'), target);
        }
        else {
          this.validateQuantity(event);
        }
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
        }
    
        const lineItem = document.getElementById(`VariantItem-${this.sectionId}-${event.line}`);
        if (lineItem && lineItem.querySelector(`[name="${event.name}"]`)) {
          theme.a11y.trapFocus(mainCart, lineItem.querySelector(`[name="${event.name}"]`));
        }
        else {
          theme.a11y.trapFocus(mainCart, mainCart.querySelector('.variant-item__title'));
        }
    
        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: {
            cart: event.cart
          }
        }));
      }
    
      onCartError(errors, target) {
        if (target) {
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
        const items = {};
        items[line] = quantity;

        this.updateMultipleQty(items, line, name, target);
      }

      updateMultipleQty(items, line, name, target) {
        this.enableLoading(line);
        this.setErrorMessage();
    
        let sectionsToBundle = [];
        document.documentElement.dispatchEvent(new CustomEvent('cart:bundled-sections', { bubbles: true, detail: { sections: sectionsToBundle } }));
    
        const body = JSON.stringify({
          updates: items,
          sections: sectionsToBundle,
          sections_url: this.getAttribute('data-product-url')
        });
    
        fetch(`${theme.routes.cart_update_url}`, { ...theme.utils.fetchConfig(), ...{ body } })
          .then((response) => response.json())
          .then((parsedState) => {
            theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, { source: 'quick-order-list', cart: parsedState, target, line, name });
          })
          .catch((error) => {
            if (error.name === 'AbortError') {
              console.log('Fetch aborted by user');
            }
            else {
              console.log(error);
              this.setErrorMessage(theme.cartStrings.error);
            }
          });
      }
    
      enableLoading(line) {
        const loaders = document.querySelectorAll(`[id^="Loader-${this.sectionId}-${line}"]`);
        loaders.forEach((loader) => loader.hidden = false);

        const loaderAll = document.getElementById(`Loader-${this.sectionId}-all`);
        if (loaderAll) loaderAll.hidden = false;
      }
    
      disableLoading(line) {
        const loaders = document.querySelectorAll(`[id^="Loader-${this.sectionId}-${line}"]`);
        loaders.forEach((loader) => loader.hidden = true);

        const loaderAll = document.getElementById(`Loader-${this.sectionId}-all`);
        if (loaderAll) loaderAll.hidden = true;
      }

      setErrorMessage(message = null) {
        const errorElement = this.querySelector('.quick-order-list__error');
        if (message) {
          const updatedMessageElement = errorElement.querySelector('.quick-order-list-error__message');
          updatedMessageElement.innerText = message;
          errorElement.removeAttribute('hidden');
        }
        else {
          errorElement.setAttribute('hidden', '');
        }
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
    }, { extends: 'form' }
  );
}
