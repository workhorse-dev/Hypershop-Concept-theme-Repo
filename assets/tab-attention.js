(() => {
  if (!theme || !theme.tabAttentionStrings) return;

  const originalTitle = document.title;
  const strings = theme.tabAttentionStrings;
  const delay = parseInt(strings.messageDelay, 10) * 1000;

  // Exit early if no delay or no messages
  if (isNaN(delay) || delay <= 0 || (!strings.firstMessage && !strings.nextMessage)) return;

  let timer = null;
  let isFirstMessage = true;

  function toggleMessage() {
    const message = isFirstMessage ? strings.firstMessage : strings.nextMessage;
    if (message) document.title = message;

    if (strings.nextMessage) {
      isFirstMessage = !isFirstMessage;
      timer = setTimeout(toggleMessage, delay);
    }
  }

  function handleBlur() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      isFirstMessage = true; // restart cycle with first message
      toggleMessage();
    }, delay);
  }

  function handleFocus() {
    if (timer) clearTimeout(timer);
    document.title = originalTitle;
  }

  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
})();
