(() => {
  const originalTitle = document.title;
  const delay = theme.tabAttentionStrings.messageDelay * 1000;
  let timer;

  const goNextMessage = (isFirstMessage) => {
    const message = isFirstMessage ? theme.tabAttentionStrings.firstMessage : theme.tabAttentionStrings.nextMessage;

    if (message) {
      document.title = message;
    }

    if (theme.tabAttentionStrings.nextMessage) {
      timer = setTimeout(() => {
        goNextMessage(!isFirstMessage);
      }, delay);
    }
  };

  window.addEventListener('blur', () => {
    timer = setTimeout(() => {
      goNextMessage(true);
    }, delay);
  });

  window.addEventListener('focus', () => {
    clearTimeout(timer);
    document.title = originalTitle;
  });
})();
