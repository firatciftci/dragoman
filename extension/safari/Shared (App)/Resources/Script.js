function show(platform, enabled) {
  document.body.classList.add(`platform-${platform}`);
  document.body.classList.toggle("state-on", enabled === true);
  document.body.classList.toggle("state-off", enabled === false);
}

document
  .querySelector("button.open-preferences")
  .addEventListener("click", () =>
    webkit.messageHandlers.controller.postMessage("open-preferences"),
  );
