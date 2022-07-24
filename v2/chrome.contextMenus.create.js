chrome.contextMenus.create = new Proxy(chrome.contextMenus.create, {
  apply(target, self, [properties, c]) {
    properties.contexts = properties.contexts.map(s => {
      if (s === 'action') {
        return chrome.pageAction ? 'page_action' : 'browser_action';
      }
      return s;
    });
    return Reflect.apply(target, self, [properties, c]);
  }
});
