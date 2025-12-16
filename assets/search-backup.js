class SearchDrawer extends DrawerElement {
  constructor() {
    super();
  }

  get shouldAppendToBody() {
    return false;
  }

  get input() {
    return this.querySelector('input[type="search"]');
  }

  get focusElement() {
    return this.querySelector('input[type="search"]');
  }
}
customElements.define('search-drawer', SearchDrawer);

class SearchTyped extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this));
  }

  get startDelay() {
    return this.hasAttribute('data-delay') ? parseFloat(this.getAttribute('data-delay')) : 0;
  }

  async init() {
    this.insertCursor();
    await this.start(this.getAttribute('data-first-text'), this.startDelay);

    setTimeout(async () => {
      await this.reset();
      await this.start(this.getAttribute('data-last-text'), 0);
    }, 600);
  }

  async start(text, delay) {
    this.innerHTML = text;
    await Motion.animate(this, { width: [0, `${this.scrollWidth}px`] }, { duration: 1, delay }).finished;
    this.cursor.classList.add('blink');
  }

  async reset() {
    this.cursor.classList.remove('blink');
    await Motion.animate(this, { width: 0 }, { duration: 0.25 }).finished;
  }

  insertCursor() {
    if (this.cursor) return;

    this.cursor = document.createElement('span');
    this.cursor.className = 'typed-cursor';
    this.cursor.setAttribute('aria-hidden', true);
    this.cursor.innerHTML = '|';
    this.parentElement.insertBefore(this.cursor, this.nextSibling);
  }
}
customElements.define('search-typed', SearchTyped);

class PredictiveSearch extends HTMLFormElement {
  constructor() {
    super();

    this.cachedMap = new Map();
    this.focusElement = this.input;

    this.resetButton.addEventListener('click', this.clear.bind(this));
    this.input.addEventListener('click', this.hideTypewriter.bind(this));
    this.input.addEventListener('input', theme.utils.debounce(this.onChange.bind(this), 300));
    this.input.addEventListener('focus', this.onFocus.bind(this));
  }

  get input() {
    return this.querySelector('input[type="search"]');
  }

  get resetButton() {
    return this.querySelector('button[type="reset"]');
  }

  get typewriter() {
    return this.input.previousElementSibling;
  }

  hideTypewriter() {
    if (this.typewriter && !this.typewriter.hasAttribute('hidden')) {
      this.typewriter.setAttribute('hidden', '');
    }
  }

  onFocus(event) {
    if (this.closest('.collection')) {
      document.body.classList.add('predictive-search-open');

      const searchTerm = this.getQuery();
      if (searchTerm.length === 0) return;

      const url = this.buildUrl().toString();
      this.renderSection(url, event);
    }
  }

  clear(event = null) {
    if (event) event.preventDefault();

    this.input.value = '';
    this.input.focus();
    this.removeAttribute('results');
  }

  getQuery() {
    return this.input.value.trim();
  }

  buildUrl() {
    const url = new URL(`${theme.routes.shop_url}${theme.routes.predictive_search_url}`);

    url.searchParams.set('q', this.getQuery());
    url.searchParams.set('resources[limit]', this.hasAttribute('data-limit') ? parseInt(this.getAttribute('data-limit')) : 3);
    url.searchParams.set('resources[limit_scope]', 'each');
    url.searchParams.set('section_id', theme.utils.sectionId(this));
    return url;
  }

  onChange() {
    if (this.getQuery().length === 0) {
      this.clear();
      return;
    }

    this.hideTypewriter();

    const url = this.buildUrl().toString();
    this.renderSection(url);
  }

  renderSection(url) {
    this.cachedMap.has(url)
      ? this.renderSectionFromCache(url)
      : this.renderSectionFromFetch(url);
  }

  renderSectionFromCache(url) {
    const responseText = this.cachedMap.get(url);
    this.renderSearchResults(responseText);

    this.setAttribute('results', '');
  }

  renderSectionFromFetch(url) {
    this.abortController?.abort();
    this.abortController = new AbortController();
    
    this.setAttribute('loading', '');

    fetch(url, { signal: this.abortController.signal })
      .then((response) => response.text())
      .then((responseText) => {
        this.renderSearchResults(responseText);
        this.cachedMap.set(url, responseText);

        this.removeAttribute('loading');
        this.setAttribute('results', '');
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

  renderSearchResults(responseText) {
    const id = 'PredictiveSearchResults-' + theme.utils.sectionId(this);
    if (document.getElementById(id) === null) return;

    document.getElementById(id).innerHTML = new DOMParser()
      .parseFromString(responseText, 'text/html')
      .getElementById(id).innerHTML;
  }
}
customElements.define('predictive-search', PredictiveSearch, { extends: 'form' });

class PredictiveSearchOverlay extends OverlayElement {
  constructor() {
    super();

    this.addEventListener('click', this.onClick);
  }

  onClick() {
    setTimeout(() => {
      document.body.classList.remove('predictive-search-open');
    });
  }
}
customElements.define('predictive-search-overlay', PredictiveSearchOverlay);
