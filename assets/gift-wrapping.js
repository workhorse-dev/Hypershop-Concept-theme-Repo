class RemoveGiftWrap extends HTMLAnchorElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();

      const cartItems = this.closest('cart-items');
      cartItems.enableLoading(this.getAttribute('data-index'));

      const giftWrapping = document.querySelector('gift-wrapping');
      giftWrapping.removeGiftWrap();
    });
  }
}
customElements.define('remove-gift-wrap', RemoveGiftWrap, { extends: 'a' });

class GiftWrapping extends HTMLElement {
  constructor() {
    super();

    this.giftWrapId = this.getAttribute('data-gift-wrap-id');
    this.giftWrapping = this.getAttribute('data-gift-wrapping');
    this.cartItemsSize = parseInt(this.getAttribute('cart-items-size'));
    this.giftWrapsInCart = parseInt(this.getAttribute('gift-wraps-in-cart'));
    this.itemsInCart = parseInt(this.getAttribute('items-in-cart'));
  }

  connectedCallback() {
    // When the gift-wrapping checkbox is checked or unchecked.
    this.querySelector('[name="attributes[gift-wrapping]"]').addEventListener('change', theme.utils.debounce((event) => {
      event.target.checked ? this.setGiftWrap() : this.removeGiftWrap();
    }, 300));

    // If we have nothing but gift-wrap items in the cart.
    if (this.cartItemsSize == 1 && this.giftWrapsInCart > 0) {
      return this.removeGiftWrap();
    }
    // If we don't have the right amount of gift-wrap items in the cart.
    if (this.giftWrapsInCart > 0 & this.giftWrapsInCart != this.itemsInCart) {
      return this.setGiftWrap();
    }
    // If we have a gift-wrap item in the cart but our gift-wrapping cart attribute has not been set.
    if (this.giftWrapsInCart > 0 && this.giftWrapping.length == 0) {
      return this.setGiftWrap();
    }
    // If we have no gift-wrap item in the cart but our gift-wrapping cart attribute has been set.
    if (this.giftWrapsInCart == 0 && this.giftWrapping.length > 0) {
      return this.setGiftWrap();
    }
  }

  setGiftWrap() {
    this.enableLoading();

    let sectionsToBundle = [];
    document.documentElement.dispatchEvent(new CustomEvent('cart:bundled-sections', { bubbles: true, detail: { sections: sectionsToBundle } }));

    const body = JSON.stringify({
      updates: {
        [this.giftWrapId]: this.itemsInCart
      },
      attributes: {
        'gift-wrapping': true
      },
      sections: sectionsToBundle
    });

    this.fetchGiftWrap(body);
  }

  removeGiftWrap() {
    this.enableLoading();

    let sectionsToBundle = [];
    document.documentElement.dispatchEvent(new CustomEvent('cart:bundled-sections', { bubbles: true, detail: { sections: sectionsToBundle } }));

    const body = JSON.stringify({
      updates: {
        [this.giftWrapId]: 0
      },
      attributes: {
        'gift-wrapping': '',
        'gift-note': ''
      },
      sections: sectionsToBundle
    });

    this.fetchGiftWrap(body);
  }

  fetchGiftWrap(body) {
    fetch(`${theme.routes.cart_update_url}`, { ...theme.utils.fetchConfig(), ...{ body } })
      .then((response) => response.json())
      .then((parsedState) => {
        theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, { source: 'gift-wrapping', cart: parsedState });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  enableLoading() {
    const loader = this.querySelector('.loader');
    if (loader) loader.hidden = false;
  }
}
customElements.define('gift-wrapping', GiftWrapping);

class GiftNote extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('change', theme.utils.debounce((event) => {
      const body = JSON.stringify({ attributes: { 'gift-note': event.target.value } });
      fetch(`${theme.routes.cart_update_url}`, {...theme.utils.fetchConfig(), ...{ body }});
    }, 300));
  }
}
customElements.define('gift-note', GiftNote);
