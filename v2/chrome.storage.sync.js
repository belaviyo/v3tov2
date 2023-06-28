/* global browser */

// overwrite the default one
{
  const sync = browser.storage.sync;
  chrome.storage.sync = {
    get(ps, c) {
      if (c) {
        browser.storage.sync.get(ps).then(c);
      }
      else {
        return sync.get(ps);
      }
    },
    set(ps, c = () => {}) {
      if (c) {
        sync.set(ps).then(c);
      }
      else {
        return sync.set(ps);
      }
    },
    remove(key, c) {
      if (c) {
        sync.remove(key).then(c);
      }
      else {
        return sync.remove(key);
      }
    }
  };
}
