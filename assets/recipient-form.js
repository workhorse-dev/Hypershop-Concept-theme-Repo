if (!customElements.get('recipient-form')) {
  customElements.define(
    'recipient-form',
    class RecipientForm extends HTMLElement {
      constructor() {
        super();
        this.recipientFieldsLiveRegion = this.querySelector(`#Recipient-fields-live-region-${this.sectionId}-${this.productId}`);
        this.checkboxInput = this.querySelector(`#Recipient-checkbox-${this.sectionId}-${this.productId}`);
        this.checkboxInput.disabled = false;
        this.hiddenControlField = this.querySelector(`#Recipient-control-${this.sectionId}-${this.productId}`);
        this.hiddenControlField.disabled = true;
        this.fieldsContainer = this.querySelector(`#Recipient-fields-${this.sectionId}-${this.productId}`);
        this.emailInput = this.querySelector(`#Recipient-email-${this.sectionId}-${this.productId}`);
        this.nameInput = this.querySelector(`#Recipient-name-${this.sectionId}-${this.productId}`);
        this.messageInput = this.querySelector(`#Recipient-message-${this.sectionId}-${this.productId}`);
        this.sendonInput = this.querySelector(`#Recipient-send-on-${this.sectionId}-${this.productId}`);
        this.offsetProperty = this.querySelector(`#Recipient-timezone-offset-${this.sectionId}-${this.productId}`);
        if (this.offsetProperty) this.offsetProperty.value = new Date().getTimezoneOffset().toString();

        this.errorMessage = this.querySelector('.product-form__recipient-error-message');
        this.errorMessageList = this.errorMessage?.querySelector('ul');
        this.currentProductVariantId = this.getAttribute('data-product-variant-id');
        this.addEventListener('change', this.onChange.bind(this));
        this.onChange();
      }

      get sectionId() {
        return this.getAttribute('data-section-id');
      }

      get productId() {
        return this.getAttribute('data-product-id');
      }

      cartUpdateUnsubscriber = undefined;
      variantChangeUnsubscriber = undefined;
      cartErrorUnsubscriber = undefined;

      connectedCallback() {
        this.cartUpdateUnsubscriber = theme.pubsub.subscribe(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, (event) => {
          if (event.source === 'product-form' && event.productVariantId.toString() === this.currentProductVariantId) {
            this.resetRecipientForm();
          }
        });

        this.variantChangeUnsubscriber = theme.pubsub.subscribe(theme.pubsub.PUB_SUB_EVENTS.variantChange, (event) => {
          if (event.data.sectionId === this.sectionId) {
            this.currentProductVariantId = event.data.variant.id.toString();
          }
        });

        this.cartUpdateUnsubscriber = theme.pubsub.subscribe(theme.pubsub.PUB_SUB_EVENTS.cartError, (event) => {
          if (event.source === 'product-form' && event.productVariantId.toString() === this.currentProductVariantId) {
            this.displayErrorMessage(event.message, event.errors);
          }
        });
      }

      disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
        }

        if (this.variantChangeUnsubscriber) {
          this.variantChangeUnsubscriber();
        }

        if (this.cartErrorUnsubscriber) {
          this.cartErrorUnsubscriber();
        }
      }

      onChange() {
        if (this.checkboxInput.checked) {
          this.enableInputFields();
          this.recipientFieldsLiveRegion.innerText = theme.recipientFormStrings.expanded;
        } else {
          this.clearInputFields();
          this.disableInputFields();
          this.clearErrorMessage();
          this.recipientFieldsLiveRegion.innerText = theme.recipientFormStrings.collapsed;
        }

        this.fieldsContainer.classList.toggle('hidden', !this.checkboxInput.checked);
      }

      inputFields() {
        return [this.emailInput, this.nameInput, this.messageInput, this.sendonInput];
      }

      disableableFields() {
        return [...this.inputFields(), this.offsetProperty];
      }

      clearInputFields() {
        this.inputFields().forEach((field) => (field.value = ''));
      }

      enableInputFields() {
        this.disableableFields().forEach((field) => (field.disabled = false));
      }

      disableInputFields() {
        this.disableableFields().forEach((field) => (field.disabled = true));
      }

      displayErrorMessage(title, body) {
        this.clearErrorMessage();
        this.errorMessage.hidden = false;

        if (typeof body === 'object') {
          Object.entries(body).forEach(([key, value]) => {
            const message = `${value.join(', ')}`;

            if (this.errorMessageList) {
              this.errorMessageList.appendChild(this.createErrorListItem(message));
            }

            const inputElement = this[`${key}Input`];
            if (!inputElement) return;

            inputElement.classList.add('invalid');
          });
        }
      }

      createErrorListItem(message) {
        const li = document.createElement('li');
        li.innerText = message;
        return li;
      }

      clearErrorMessage() {
        this.errorMessage.hidden = true;
        if (this.errorMessageList) this.errorMessageList.innerHTML = '';

        [this.emailInput, this.messageInput, this.nameInput, this.sendonInput].forEach((inputElement) => {
          inputElement.classList.remove('invalid');
        });
      }

      resetRecipientForm() {
        if (this.checkboxInput.checked) {
          this.checkboxInput.checked = false;
          this.clearInputFields();
          this.clearErrorMessage();
          this.fieldsContainer.classList.add('hidden');
        }
      }
    }
  );
}
