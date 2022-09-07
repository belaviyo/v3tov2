chrome.windows = chrome.windows || {};

chrome.windows.getCurrent = new Proxy(chrome.windows.getCurrent || {}, {
  apply(target, self, args) {
    if (args.length === 1) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});
