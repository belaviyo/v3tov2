chrome.action = chrome.action || chrome.browserAction || chrome.pageAction;

if (chrome.pageAction) {
  chrome.pageAction.setIcon = new Proxy(chrome.pageAction.setIcon, {
    apply(target, self, args) {
      if ('tabId' in args[0]) {
        chrome.pageAction.show(args[0].tabId);
      }

      return Reflect.apply(target, self, args);
    }
  });
  chrome.pageAction.setBadgeBackgroundColor = chrome.pageAction.setBadgeBackgroundColor || function() {};
  chrome.pageAction.setBadgeText = chrome.pageAction.setBadgeText || function() {};
}
