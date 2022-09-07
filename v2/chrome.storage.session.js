chrome.storage.session = chrome.storage.session || {
  get(ps, c) {
    const r = {};
    for (const [key, value] of Object.entries(ps)) {
      const o = sessionStorage.getItem(key);
      r[key] = o ? JSON.parse(o) : value;
    }
    c(r);
  },
  set(ps, c = () => {}) {
    for (const [key, value] of Object.entries(ps)) {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
    c();
  },
  remove(key) {
    sessionStorage.removeItem(key);
  }
};
