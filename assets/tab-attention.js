(() => {
  if (!theme || !theme.tabAttentionStrings) return;

  const originalTitle = document.title;
  const strings = theme.tabAttentionStrings;
  const delay = parseInt(strings.messageDelay) * 1000;

  // If no delay or no messages, exit early
  if (delay <= 0 || (!strings.firstMessage && !strings.nextMessage)) return;

  let timer = null;
  let isFirstMessage = true;

  const handleBlur = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(toggleMessage, delay);
  };
  
  const handleFocus = () => {
    if (timer) clearTimeout(timer);
    document.title = originalTitle;
  };

  function toggleMessage() {
    document.title = isFirstMessage ? strings.firstMessage : strings.nextMessage;
    
    if (strings.nextMessage) {
      isFirstMessage = !isFirstMessage;
      timer = setTimeout(toggleMessage, delay);
    }
  }

  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);
})();
