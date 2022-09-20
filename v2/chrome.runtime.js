chrome.runtime.onInstalled.addListener = new Proxy(chrome.runtime.onInstalled.addListener, {
  apply() {}
});
chrome.runtime.onStartup.addListener = new Proxy(chrome.runtime.onStartup.addListener, {
  apply(target, self, args) {
    args[0]();
  }
});
