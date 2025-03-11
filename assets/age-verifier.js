class AgeVerifier extends ModalElement {
  constructor() {
    super();

    this.init();
  }

  get shouldLock() {
    return true;
  }

  get testMode() {
    return this.getAttribute('data-test-mode') === 'true';
  }

  get delay() {
    return 1;
  }

  get expiry() {
    return this.hasAttribute('data-expiry') ? parseInt(this.getAttribute('data-expiry')) : 30;
  }

  get cookieName() {
    return 'concept:age-verifier';
  }

  init() {
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
customElements.define('age-verifier', AgeVerifier);
