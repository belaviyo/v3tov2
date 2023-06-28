if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener = new Proxy(chrome.runtime.onStartup.addListener, {
    apply(target, self, args) {
      args[0]();
    }
  });
}
