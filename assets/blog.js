if (!customElements.get('tag-filter')) {
  customElements.define(
    'tag-filter',
    class TagFilter extends HTMLSelectElement {
      constructor() {
        super();
    
        this.updateWidth();
        this.addEventListener('change', this.onChange);
      }
    
      updateWidth() {
        const value = this.options[this.selectedIndex].text;
        const width = theme.getElementWidth(this, value);
        this.style.setProperty('--width', `${width}px`);
      }
    
      onChange() {
        this.updateWidth();
        window.location.href = this.value;
      }
    }, { extends: 'select' }
  );
}
