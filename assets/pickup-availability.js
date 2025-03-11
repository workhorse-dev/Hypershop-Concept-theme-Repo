if (!customElements.get('pickup-availability')) {
  customElements.define(
    'pickup-availability',
    class PickupAvailability extends HTMLElement {
      constructor() {
        super();

        if (!this.hasAttribute('available')) return;

        this.errorHtml = this.querySelector('template').content.firstElementChild.cloneNode(true);
        this.onClickRefreshList = this.onClickRefreshList.bind(this);
        this.fetchAvailability(this.getAttribute('data-variant-id'));
      }

      fetchAvailability(variantId) {
        let rootUrl = this.getAttribute('data-root-url');
        if (!rootUrl.endsWith('/')) {
          rootUrl = rootUrl + '/';
        }
        const variantSectionUrl = `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;

        fetch(variantSectionUrl)
          .then((response) => response.text())
          .then((responseText) => {
            const sectionInnerHTML = new DOMParser()
              .parseFromString(responseText, 'text/html')
              .querySelector('.shopify-section');
            this.renderPreview(sectionInnerHTML);
          })
          .catch(() => {
            const button = this.querySelector('button');
            if (button) button.removeEventListener('click', this.onClickRefreshList);
            this.renderError();
          });
      }

      onClickRefreshList() {
        this.fetchAvailability(this.getAttribute('data-variant-id'));
      }

      update(variant) {
        if (variant?.available) {
          this.fetchAvailability(variant.id);
        }
        else {
          this.innerHTML = '';
          this.removeAttribute('available');
          this.setAttribute('hidden', '');
        }
      }

      renderError() {
        this.innerHTML = '';
        this.appendChild(this.errorHtml);

        this.querySelector('button').addEventListener('click', this.onClickRefreshList);
      }

      renderPreview(sectionInnerHTML) {
        const drawer = document.querySelector('.pickup-availability-drawer');
        if (drawer) drawer.remove();
        if (!sectionInnerHTML.querySelector('.pickup-availability-preview')) {
          this.innerHTML = '';
          this.removeAttribute('available');
          this.setAttribute('hidden', '');
          return;
        }

        this.innerHTML = sectionInnerHTML.querySelector('.pickup-availability-preview').outerHTML;
        this.removeAttribute('hidden');
        this.setAttribute('available', '');

        document.body.appendChild(sectionInnerHTML.querySelector('.pickup-availability-drawer'));
      }
    }
  );
}
