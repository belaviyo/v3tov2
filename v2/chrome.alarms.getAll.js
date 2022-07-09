chrome.alarms.getAll = new Proxy(chrome.alarms.getAll, {
  apply(target, self, args) {
    if (args.length) {
      return Reflect.apply(target, self, args);
    }
    else {
      return new Promise(resolve => Reflect.apply(target, self, [resolve]));
    }
  }
});
