chrome.alarms.get = new Proxy(chrome.alarms.get, {
  apply(target, self, args) {
    if (args.length === 2) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [...args, resolve]));
    }
  }
});
