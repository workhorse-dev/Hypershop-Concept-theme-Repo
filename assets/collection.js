if (!customElements.get('facet-form')) {
  customElements.define(
    'facet-form',
    class FacetForm extends HTMLFormElement {
      constructor() {
        super();

        this.dirty = false;
        this.cachedMap = new Map();
        this.isMobile = theme.config.mqlSmall || theme.config.isTouch;
        this.motionReduced = theme.config.motionReduced || this.hasAttribute('motion-reduced');

        this.addEventListener('change', this.onFormChange);
        this.addEventListener('submit', this.onFormSubmit);
      }

      getAnimationParams() {
        return {
          distance: this.isMobile ? 30 : 50,
          duration: this.motionReduced ? 0 : (this.isMobile ? 0.3 : 0.5),
          staggerDelay: this.motionReduced ? 0 : (this.isMobile ? 0.05 : 0.1)
        };
      }

      getVisibleItems(items) {
        const viewportHeight = window.innerHeight + window.scrollY;
        const visible = [];
        const invisible = [];
        
        items.forEach(item => {
          const rect = item.getBoundingClientRect();
          const isVisible = rect.top < viewportHeight && rect.bottom > 0;
          
          if (isVisible) {
            visible.push(item);
          } else {
            invisible.push(item);
          }
        });
        
        return { visible, invisible };
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

        const { distance, duration, staggerDelay } = this.getAnimationParams();
        const { visible: visibleItems, invisible: inVisibleItems } = this.getVisibleItems(items);

        Motion.timeline([
          [visibleItems, { y: distance, opacity: 0, visibility: 'hidden' }, { duration: duration, delay: Motion.stagger(staggerDelay) }],
          [inVisibleItems, { y: distance, opacity: 0, visibility: 'hidden' }, { duration: duration }],
          [container, { y: distance, opacity: 0 }, { duration: duration, easing: 'linear' }]
        ]);
        items.forEach(item => item.style.removeProperty('transform'));

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

        const { distance, duration, staggerDelay } = this.getAnimationParams();
        const { visible: visibleItems, invisible: inVisibleItems } = this.getVisibleItems(items);

        Motion.timeline([
          [container, { y: [distance, 0], opacity: [0, 1] }, { duration: duration, easing: 'linear' }],
          [visibleItems, { y: [distance, 0], opacity: [0, 1], visibility: ['hidden', 'visible'] }, { duration: duration, delay: Motion.stagger(staggerDelay) }],
          [inVisibleItems, { y: [distance, 0], opacity: [0, 1], visibility: ['hidden', 'visible'] }, { duration: duration }]
        ]);
        items.forEach(item => item.style.removeProperty('transform'));

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
    }, { extends: 'form' }
  );
}
