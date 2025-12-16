if (!customElements.get('compact-product-bundle')) {
  customElements.define(
    'compact-product-bundle',
    class CompactProductBundle extends HTMLElement {
      constructor() {
        super();
    
        this.submitButton.addEventListener('click', this.onSubmitHandler.bind(this));
      }
    
      get variants() {
        return Array.from(this.querySelectorAll('form[is="product-bundle-form"] [name="id"]'));
      }
    
      get submitButton() {
        return this.querySelector('[data-product-bundle-submit]');
      }
    
      get cartDrawer() {
        return document.querySelector('cart-drawer');
      }
    
      onSubmitHandler(event) {
        const data = {
          items: this.variants.map(variant => ({
            id: variant.value,
            quantity: 1
          }))
        };
    
        if (document.body.classList.contains('template-cart') || theme.settings.cartType === 'page') {
          theme.utils.postLink2(theme.routes.cart_add_url, {
            parameters: {
              ...data
            }
          });
          return;
        }
        
        event.preventDefault();
        if (this.submitButton.hasAttribute('aria-disabled')) return;
        this.activeElement = event.submitter || event.currentTarget;
    
        this.handleErrorMessage();
    
        let sectionsToBundle = [];
        document.documentElement.dispatchEvent(new CustomEvent('cart:bundled-sections', { bubbles: true, detail: { sections: sectionsToBundle } }));
        
        const body = JSON.stringify({
          ...data,
          sections: sectionsToBundle,
          sections_url: window.location.pathname
        });
    
        this.submitButton.setAttribute('aria-disabled', 'true');
        this.submitButton.setAttribute('aria-busy', 'true');
    
        fetch(`${theme.routes.cart_add_url}`, { ...theme.utils.fetchConfig('javascript'), body })
          .then((response) => response.json())
          .then(async (parsedState) => {
            if (parsedState.status) {
              this.handleErrorMessage(parsedState.description);
              document.dispatchEvent(new CustomEvent('ajaxProduct:error', {
                detail: {
                  errorMessage: parsedState.description
                }
              }));
              
              const submitButtonText = this.submitButton.querySelector('.btn-text span');
              if (!submitButtonText || !submitButtonText.hasAttribute('data-sold-out')) return;
              submitButtonText.innerText = submitButtonText.getAttribute('data-sold-out');
              this.submitButton.setAttribute('aria-disabled', 'true');
              this.error = true;
              return;
            }
    
            const cartJson = await (await fetch(theme.routes.cart_url, { ...theme.utils.fetchConfig('json', 'GET')})).json();
            cartJson['sections'] = parsedState['sections'];
    
            theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, { source: 'product-bundle', cart: cartJson });
            document.dispatchEvent(new CustomEvent('ajaxProduct:added', {
              detail: {
                product: parsedState
              }
            }));
    
            this.cartDrawer?.show(this.activeElement);
          })
          .catch((error) => {
            console.log(error);
          })
          .finally(() => {
            this.submitButton.removeAttribute('aria-busy');
    
            if (!this.error) {
              this.submitButton.removeAttribute('aria-disabled');
            }
          });
      }
    
      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;
        
        this.errorMessage = this.errorMessage || this.querySelector('.product-form__error-message');
        if (!this.errorMessage) return;
    
        this.errorMessage.toggleAttribute('hidden', !errorMessage);
        this.errorMessage.innerText = errorMessage;
      }
    }
  );
}
