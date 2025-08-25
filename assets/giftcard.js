theme.selectText = function (element) {
  const doc = document,
      text = doc.getElementById(element);

  if (doc.body.createTextRange) { // ms
    const range = doc.body.createTextRange();
    range.moveToElementText(text);
    range.select();
  }
  else if (window.getSelection) { // moz, opera, webkit
    const selection = window.getSelection(),
        range = doc.createRange();
    range.selectNodeContents(text);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

class QrCode extends HTMLElement {
  constructor() {
    super();

    document.addEventListener('DOMContentLoaded', () => {
      new window.QRCode(this, {
        text: this.getAttribute('identifier'),
        width: 130,
        height: 130,
        imageAltText: theme.strings.qrImageAlt
      });
    });
  }
}
customElements.define('qr-code', QrCode);

class CopyButton extends HoverButton {
  constructor() {
    super();

    this.addEventListener('click', this.onClick);
  }

  get controlElement() {
    return this.hasAttribute('aria-controls') ? document.getElementById(this.getAttribute('aria-controls')) : null;
  }

  onClick() {
    if (!navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(this.hasAttribute('data-text') ? this.getAttribute('data-text') : '').then(() => {
      if (this.controlElement) {
        this.controlElement.hidden = false;
      }
    });
  }
}
customElements.define('copy-button', CopyButton, { extends: 'button' });
