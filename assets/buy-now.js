function handleBuyNow(button) {
  const form = button.closest("form");
  const formData = new FormData(form);

  fetch("/cart/clear.js", {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  }).then(() => {
    fetch("/cart/add.js", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    }).then(() => {
      window.location.href = "/checkout";
    });
  });
}
