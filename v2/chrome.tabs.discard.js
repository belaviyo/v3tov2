chrome.tabs.discard = new Proxy(chrome.tabs.discard, {
  apply(target, self, args) {
    return Reflect.apply(target, self, [args[0]]);
  }
});
