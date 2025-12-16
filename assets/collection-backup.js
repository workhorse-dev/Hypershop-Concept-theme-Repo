class FacetForm extends HTMLFormElement {
  constructor() {
    super();

    this.dirty = false;
    this.cachedMap = new Map();

    this.addEventListener('change', this.onFormChange);
    this.addEventListener('submit', this.onFormSubmit);
  }

  onFormChange() {
    this.dirty = true;
    this.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  onFormSubmit(event) {
    event.preventDefault();
    if (!this.dirty) return;

    const url = this.buildUrl().toString();
    this.renderSection(url, event);
  }

  buildUrl() {
    const searchParams = new URLSearchParams(new FormData(this));
    const url = new URL(this.action);

    url.search = '';
    searchParams.forEach((value, key) => url.searchParams.append(key, value));

    ['page', 'filter.v.price.gte', 'filter.v.price.lte'].forEach((item) => {
      if (url.searchParams.get(item) === '') {
        url.searchParams.delete(item);
      }
    });

    url.searchParams.set('section_id', theme.utils.sectionId(this));
    return url;
  }

  updateURLHash(url) {
    const clonedUrl = new URL(url);
    clonedUrl.searchParams.delete('section_id');
    history.replaceState({}, '', clonedUrl.toString());
  }

  beforeRenderSection() {
    const container = document.getElementById('ProductGridContainer');
    const items = container.querySelectorAll('.product-card');
    const translateY = theme.config.motionReduced ? 0 : 50;

    Motion.timeline([
      [items, { y: translateY, opacity: 0, visibility: 'hidden' }, { duration: 0.5, delay: theme.config.motionReduced ? 0 : Motion.stagger(0.1) }],
      [container, { y: translateY, opacity: 0 }, { duration: 0.5, easing: 'linear' }],
    ]);

    setTimeout(() => {
      const target = document.querySelector('.collection');
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - (theme.config.isTouch || theme.config.mqlSmall ? 95 : 20),
        behavior: theme.config.motionReduced ? 'auto' : 'smooth'
      });

      const drawer = document.getElementById('FacetDrawer');
      if (drawer) drawer.classList.add('loading');
    }, 100);
  }

  afterRenderSection() {
    const container = document.getElementById('ProductGridContainer');
    const items = container.querySelectorAll('.product-card');
    const translateY = theme.config.motionReduced ? 0 : 50;

    Motion.timeline([
      [container, { y: [translateY, 0], opacity: [0, 1] }, { duration: 0.5, easing: 'linear' }],
      [items, { y: [translateY, 0], opacity: [0, 1], visibility: ['hidden', 'visible'] }, { duration: 0.5, delay: theme.config.motionReduced ? 0 : Motion.stagger(0.1) }],
    ]);

    const drawer = document.getElementById('FacetDrawer');
    if (drawer) drawer.classList.remove('loading');

    document.dispatchEvent(new CustomEvent('collection:reloaded'));
  }

  renderSection(url, event) {
    this.cachedMap.has(url)
      ? this.renderSectionFromCache(url, event)
      : this.renderSectionFromFetch(url, event);

    if (this.hasAttribute('data-history')) this.updateURLHash(url);

    this.dirty = false;
  }

  renderSectionFromFetch(url, event) {
    this.abortController?.abort();
    this.abortController = new AbortController();
    
    this.beforeRenderSection();
    const start = performance.now();

    fetch(url, { signal: this.abortController.signal })
      .then((response) => response.text())
      .then((responseText) => {
        const execution = (performance.now() - start);

        setTimeout(() => {
          this.renderFilters(responseText, event);
          this.renderFiltersActive(responseText);
          this.renderProductGridContainer(responseText);
          this.renderProductCount(responseText);
          this.renderSortBy(responseText);

          theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.facetUpdate, { responseText: responseText });
          this.cachedMap.set(url, responseText);

          this.afterRenderSection();
        }, execution > 500 ? 0 : 500);
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

  renderSectionFromCache(url, event) {
    this.beforeRenderSection();

    setTimeout(() => {
      const responseText = this.cachedMap.get(url);
      this.renderFilters(responseText, event);
      this.renderFiltersActive(responseText);
      this.renderProductGridContainer(responseText);
      this.renderProductCount(responseText);
      this.renderSortBy(responseText);

      theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.facetUpdate, { responseText: responseText });

      this.afterRenderSection();
    }, 500);
  }

  renderFilters(responseText, event) {
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
    const facetElements = parsedHTML.querySelectorAll(
      '#FacetFiltersContainer [data-filter], #MobileFacetFiltersContainer [data-filter]'
    );

    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest('[data-filter]') : undefined;
      return jsFilter ? element.getAttribute('data-index') === jsFilter.getAttribute('data-index') : false;
    };
    const facetsToRender = Array.from(facetElements).filter((element) => !matchesIndex(element));

    facetsToRender.forEach((element) => {
      const filter = document.querySelector(`[data-filter][data-index="${element.getAttribute('data-index')}"]`);
      if (filter !== null) {
        if (filter.tagName === 'DETAILS') {
          filter.querySelector('summary + *').innerHTML = element.querySelector('summary + *').innerHTML;
        }
        else {
          filter.innerHTML = element.innerHTML;
        }
      }
    });
  }

  renderFiltersActive(responseText) {
    const id = 'FacetFiltersActive';
    if (document.getElementById(id) === null) return;
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');

    document.getElementById(id).innerHTML = parsedHTML.getElementById(id).innerHTML;
  }

  renderProductGridContainer(responseText) {
    const id = 'ProductGridContainer';
    if (document.getElementById(id) === null) return;
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
    parsedHTML.querySelector('motion-list').setAttribute('motion-reduced', '');

    document.getElementById(id).innerHTML = parsedHTML.getElementById(id).innerHTML;
  }

  renderProductCount(responseText) {
    const id = 'ProductCount';
    if (document.getElementById(id) === null) return;
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');

    document.getElementById(id).innerHTML = parsedHTML.getElementById(id).innerHTML;
  }

  renderSortBy(responseText) {
    const id = 'SortByContainer';
    if (document.getElementById(id) === null) return;
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');

    document.getElementById(id).innerHTML = parsedHTML.getElementById(id).innerHTML;
  }
}
customElements.define('facet-form', FacetForm, { extends: 'form' });

class FacetCount extends HTMLElement {
  constructor() {
    super();
  }

  facetUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.facetUpdateUnsubscriber = theme.pubsub.subscribe(theme.pubsub.PUB_SUB_EVENTS.facetUpdate, this.onFacetUpdate.bind(this));
  }

  disconnectedCallback() {
    if (this.facetUpdateUnsubscriber) {
      this.facetUpdateUnsubscriber();
    }
  }

  get itemCount() {
    return parseInt(this.innerText);
  }

  onFacetUpdate(event) {
    const parsedHTML = new DOMParser().parseFromString(event.responseText, 'text/html');
    const facetCount = parsedHTML.querySelector('facet-count');
    this.innerText = facetCount.innerHTML;
    this.hidden = this.itemCount === 0;
  }
}
customElements.define('facet-count', FacetCount);

class FacetRemove extends MagnetLink {
  constructor() {
    super();

    this.addEventListener('click', this.onClick);
  }

  onClick(event) {
    const form = this.closest('form[is="facet-form"]') || document.querySelector('form[is="facet-form"]');

    if (form) {
      event.preventDefault();

      const url = new URL(this.href);
      url.searchParams.set('section_id', theme.utils.sectionId(form));
      form.renderSection(url.toString(), event);
    }
  }
}
customElements.define('facet-remove', FacetRemove, { extends: 'a' });

class FacetSort extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });

    this.addEventListener('change', this.onChange);
    this.button.addEventListener('click', this.show.bind(this));
    this.close.addEventListener('click', this.hide.bind(this));
    document.addEventListener('click', this.onWindowClick.bind(this));
  }

  get listbox() {
    return this.querySelector('.sort-listbox');
  }

  get selection() {
    return this.querySelector('.sort-selection');
  }

  get button() {
    return this.querySelector('.sort-by');
  }

  get close() {
    return this.querySelector('.sort-close');
  }

  init() {
    this.initButton();
    this.style.setProperty('--facet-listbox-height', `${this.listbox.getBoundingClientRect().height}px`);
  }

  initButton() {
    const value = this.selection.innerText;
    const width = theme.getElementWidth(this.selection, value);
    this.style.setProperty('--facet-button-width', `${width}px`);
  }

  onChange(event) {
    const form = this.closest('form[is="facet-form"]') || document.querySelector('form[is="facet-form"]');

    if (form) {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', event.target.value);
      url.searchParams.set('section_id', theme.utils.sectionId(form));
      url.searchParams.delete('page');
      form.renderSection(url.toString(), event);
    }

    this.selection.innerText = event.target.nextElementSibling.innerText;
    this.initButton();
    this.hide();
  }

  show() {
    this.button.setAttribute('open', '');
  }

  hide(immediate = true) {
    if (this.button.hasAttribute('open')) {
      setTimeout(() => {
        this.button.removeAttribute('open');
      }, 100);

      if (theme.config.isTouch || document.body.getAttribute('data-button-hover') === 'none') return;
      
      const btnFill = this.button.querySelector('[data-fill');
      Motion.animate(btnFill, { y: ['0%', immediate ? '0%' : '-76%'] }, { duration: 0.6, delay: immediate ? 0 : 0.2 });
    }
  }

  onWindowClick(event) {
    if (!this.contains(event.target)) {
      if (this.button.hasAttribute('open')) {
        this.hide(false);
      }
    }
  }
}
customElements.define('facet-sort', FacetSort);

class FacetSticky extends HTMLElement {
  constructor() {
    super();

    new IntersectionObserver(this.handleIntersection.bind(this), { rootMargin: `-${screen.availHeight - 100}px 0px ${screen.availHeight}px 0px` }).observe(document.querySelector('.collection-section'));
  }

  get button() {
    return this.querySelector('.button');
  }

  handleIntersection(entries) {
    if (entries[0].isIntersecting) {
      Motion.animate(this.button, { opacity: 1, visibility: 'visible', transform: ['translateY(15px)', 'translateY(0)'] }, { duration: 1, easing: [0.16, 1, 0.3, 1] });
    }
    else {
      Motion.animate(this.button, { opacity: 0, visibility: 'hidden', transform: ['translateY(0)', 'translateY(15px)'] }, { duration: 1, easing: [0.16, 1, 0.3, 1] });
    }
  }
}
customElements.define('facet-sticky', FacetSticky);

class PriceRange extends HTMLElement {
  constructor() {
    super();

    this.rangeMin = this.querySelector('input[type="range"]:first-child');
    this.rangeMax = this.querySelector('input[type="range"]:last-child');
    this.inputMin = this.querySelector('input[name="filter.v.price.gte"]');
    this.inputMax = this.querySelector('input[name="filter.v.price.lte"]');

    this.inputMin.addEventListener('focus', this.inputMin.select);
    this.inputMax.addEventListener('focus', this.inputMax.select);
    this.inputMin.addEventListener('change', this.onInputMinChange.bind(this));
    this.inputMax.addEventListener('change', this.onInputMaxChange.bind(this));

    this.rangeMin.addEventListener('change', this.onRangeMinChange.bind(this));
    this.rangeMax.addEventListener('change', this.onRangeMaxChange.bind(this));
    this.rangeMin.addEventListener('input', this.onRangeMinInput.bind(this));
    this.rangeMax.addEventListener('input', this.onRangeMaxInput.bind(this));
  }

  onInputMinChange(event) {
    event.preventDefault();
    event.target.value = Math.max(Math.min(parseInt(event.target.value), parseInt(this.inputMax.value || event.target.max) - 1), event.target.min);
    this.rangeMin.value = event.target.value;
    this.rangeMin.parentElement.style.setProperty('--range-min', `${parseInt(this.rangeMin.value) / parseInt(this.rangeMin.max) * 100}%`);
  }

  onInputMaxChange(event) {
    event.preventDefault();
    event.target.value = Math.min(Math.max(parseInt(event.target.value), parseInt(this.inputMin.value || event.target.min) + 1), event.target.max);
    this.rangeMax.value = event.target.value;
    this.rangeMax.parentElement.style.setProperty('--range-max', `${parseInt(this.rangeMax.value) / parseInt(this.rangeMax.max) * 100}%`);
  }

  onRangeMinChange(event) {
    event.stopPropagation();
    this.inputMin.value = event.target.value;
    this.inputMin.dispatchEvent(new Event('change', { bubbles: true }));
  }

  onRangeMaxChange(event) {
    event.stopPropagation();
    this.inputMax.value = event.target.value;
    this.inputMax.dispatchEvent(new Event('change', { bubbles: true }));
  }

  onRangeMinInput(event) {
    event.target.value = Math.min(parseInt(event.target.value), parseInt(this.inputMax.value || event.target.max) - 1);
    event.target.parentElement.style.setProperty('--range-min', `${parseInt(event.target.value) / parseInt(event.target.max) * 100}%`);
    this.inputMin.value = event.target.value;
  }

  onRangeMaxInput(event) {
    event.target.value = Math.max(parseInt(event.target.value), parseInt(this.inputMin.value || event.target.min) + 1);
    event.target.parentElement.style.setProperty('--range-max', `${parseInt(event.target.value) / parseInt(event.target.max) * 100}%`);
    this.inputMax.value = event.target.value;
  }
}
customElements.define('price-range', PriceRange);

class InfiniteButton extends HoverButton {
  constructor() {
    super();

    this.onClickHandler = this.onClick.bind(this);
  }

  connectedCallback() {
    this.addEventListener('click', this.onClickHandler);

    if (this.getAttribute('mode') == 'infinite') {
      Motion.inView(this, this.onClickHandler, { margin: '200px 0px 200px 0px' });
    }
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClickHandler);
  }

  onClick() {
    if (this.hasAttribute('aria-busy')) return;
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.enableLoading();
    const url = this.buildUrl().toString();

    fetch(url, { signal: this.abortController.signal })
      .then((response) => response.text())
      .then((responseText) => {
        this.renderPagination(responseText);
        this.renderProductGridContainer(responseText);
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

  renderPagination(responseText) {
    const productGridContainer = document.getElementById('ProductGridContainer');
    if (productGridContainer === null) return;

    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
    const destination = productGridContainer.querySelector('.pagination');
    const source = parsedHTML.querySelector('.pagination');

    if (source) {
      destination.innerHTML = source.innerHTML;
    }
    else {
      destination.remove();
    }
  }

  renderProductGridContainer(responseText) {
    const productGridContainer = document.getElementById('ProductGridContainer');
    if (productGridContainer === null) return;

    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
    const destination = productGridContainer.querySelector('motion-list');
    const source = parsedHTML.querySelector('motion-list');

    if (source && destination) {
      source.querySelectorAll('.card').forEach((item) => {
        destination.appendChild(item);
      });

      destination.reload();
    }
  }
  
  buildUrl() {
    const url = new URL(this.getAttribute('action'));
    url.searchParams.set('section_id', theme.utils.sectionId(this));
    return url;
  }

  enableLoading() {
    this.classList.add('pointer-events-none');
    this.setAttribute('aria-busy', 'true');
  }
}
customElements.define('infinite-button', InfiniteButton, { extends: 'button' });
