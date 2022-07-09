chrome.tabs.query = new Proxy(chrome.tabs.query, {
  apply(target, self, args) {
    if (args.length === 2) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});
