class CookieBanner extends ModalElement {
  constructor() {
    super();

    if (!theme.config.isTouch || Shopify.designMode) {
      this.init();
    }
    else {
      new theme.initWhenVisible(theme.utils.throttle(this.init.bind(this)));
    }
  }

  get testMode() {
    return this.getAttribute('data-test-mode') === 'true';
  }

  get delay() {
    return this.hasAttribute('data-delay') ? parseInt(this.getAttribute('data-delay')) : 5;
  }

  get acceptButton() {
    return this.querySelector('button[name="accept"]');
  }

  get declineButton() {
    return this.querySelector('button[name="decline"]');
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (this.testMode) {
      this.load(this.delay);
      return;
    }

    window.Shopify.loadFeatures([{
      name: 'consent-tracking-api',
      version: '0.1',
      onLoad: this.onConsentLibraryLoaded.bind(this)
    }]);
  }

  load(delay) {
    if (Shopify.designMode) return;

    setTimeout(() => this.show(), delay * 1000);

    if (this.acceptButton) this.acceptButton.addEventListener('click', this.acceptPolicy.bind(this));
    if (this.declineButton) this.declineButton.addEventListener('click', this.declinePolicy.bind(this));
  }

  acceptPolicy() {
    this.hide();
    window.Shopify.customerPrivacy?.setTrackingConsent(true, this.noop);

    document.addEventListener('trackingConsentAccepted', () => {
      console.log('trackingConsentAccepted event fired');
    });
  }

  declinePolicy() {
    this.hide();
    window.Shopify.customerPrivacy?.setTrackingConsent(false, this.noop);
  }

  onConsentLibraryLoaded() {
    const userCanBeTracked = window.Shopify.customerPrivacy.userCanBeTracked();
    const userTrackingConsent = window.Shopify.customerPrivacy.getTrackingConsent();

    if(!userCanBeTracked && userTrackingConsent === 'no_interaction') {
      this.load(this.delay);
    }
  }

  noop() {
  }

  afterHide() {
    super.afterHide();
    document.body.classList.remove('has-cookie-banner');
  }
  afterShow() {
    super.afterShow();
    document.body.classList.add('has-cookie-banner');
  }
}
customElements.define('cookie-banner', CookieBanner);
