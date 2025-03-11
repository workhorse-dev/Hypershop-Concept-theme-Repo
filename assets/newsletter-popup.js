class NewsletterModal extends ModalElement {
  constructor() {
    super();

    // Prevent popup on Shopify robot challenge page
    if (window.location.pathname === '/challenge' || !theme.cookiesEnabled) {
      return;
    }

    if (theme.config.isTouch) {
      new theme.initWhenVisible(this.init.bind(this));
    }
    else {
      this.init();
    }
  }

  get shouldLock() {
    return true;
  }

  get testMode() {
    return this.getAttribute('data-test-mode') === 'true';
  }

  get delay() {
    return this.hasAttribute('data-delay') ? parseInt(this.getAttribute('data-delay')) : 5;
  }

  get expiry() {
    return this.hasAttribute('data-expiry') ? parseInt(this.getAttribute('data-expiry')) : 30;
  }

  get cookieName() {
    return 'concept:newsletter-popup';
  }

  get submited() {
    return this.querySelector('.alert') !== null;
  }

  init() {
    // Open modal if errors or success message exist
    if (this.submited) {
      this.load(1);
      return;
    }

    if (this.testMode || !this.getCookie(this.cookieName)) {
      this.load(this.delay);
    }
  }

  load(delay) {
    if (Shopify && Shopify.designMode) return;

    setTimeout(() => this.show(), delay * 1000);
  }

  afterShow() {
    super.afterShow();
    this.classList.add('show-image');
  }

  afterHide() {
    super.afterHide();
    this.classList.remove('show-image');

    // Remove a cookie in case it was set in test mode
    if (this.testMode) {
      this.removeCookie(this.cookieName);
      return;
    }

    this.setCookie(this.cookieName, this.expiry);
  }

  getCookie(name) {
    const match = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
    return match ? match[2] : null;
  }

  setCookie(name, expiry) {
    document.cookie = `${name}=true; max-age=${(expiry * 24 * 60 * 60)}; path=/`;
  }

  removeCookie(name) {
    document.cookie = `${name}=; max-age=0`;
  }
}
customElements.define('newsletter-modal', NewsletterModal);
