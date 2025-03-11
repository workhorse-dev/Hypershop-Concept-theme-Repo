class TagFilter extends HTMLSelectElement {
  constructor() {
    super();

    this.beforeInit();
    this.addEventListener('change', this.onChange);
  }

  beforeInit() {
    const value = this.options[this.selectedIndex].text;
    const width = theme.getElementWidth(this, value);
    this.style.setProperty('--width', `${width}px`);
  }

  onChange() {
    window.location.href = this.value;
  }
}

customElements.define('tag-filter', TagFilter, { extends: 'select' });
