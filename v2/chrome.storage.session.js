{
  const cache = {};
  chrome.storage.session = chrome.storage.session || {
    get(ps, c) {
      if (typeof ps === 'string') {
        ps = {
          [ps]: ps
        };
      }

      const r = {};
      for (const [key, value] of Object.entries(ps)) {
        r[key] = cache[key] || value;
      }
      c(r);
    },
    set(ps, c = () => {}) {
      for (const [key, value] of Object.entries(ps)) {
        cache[key] = value;
      }
      c();
    },
    remove(key) {
      delete cache[key];
    }
  };
}
