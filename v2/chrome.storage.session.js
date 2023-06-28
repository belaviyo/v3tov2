if (!chrome.storage.session) {
  const dispatch = r => {
    if (Object.keys(r).length) {
      if (chrome.runtime.getBackgroundPage) {
        chrome.runtime.getBackgroundPage(bg => {
          const cs = new Set([
            ...chrome.storage.session.cs,
            ...bg.chrome.storage.session.cs
          ]);
          for (const c of cs) {
            c(r);
          }
        });
      }
      else {
        for (const c of chrome.storage.session.cs) {
          c(r);
        }
      }
    }
  };

  const remove = () => chrome.storage.local.remove('session-storage-db');
  if (chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(remove);
    chrome.runtime.onInstalled.addListener(remove);
  }

  chrome.storage.session = {
    get(ps, c) {
      chrome.storage.local.get({
        'session-storage-db': {}
      }, prefs => {
        const r = {};
        for (const [key, value] of Object.entries(ps)) {
          r[key] = prefs['session-storage-db'][key] ?? value;
        }
        c(r);
      });
    },
    set(ps, c = () => {}) {
      chrome.storage.local.get({
        'session-storage-db': {}
      }, prefs => {
        // change event / 1
        const r = {};
        for (const [key, value] of Object.entries(ps)) {
          if (prefs['session-storage-db'][key] !== value) {
            r[key] = {
              newValue: value,
              oldValue: prefs['session-storage-db'][key]
            };
          }
        }

        Object.assign(prefs['session-storage-db'], ps);
        chrome.storage.local.set(prefs, c);


        // change event / 2
        dispatch(r);
      });
    },
    remove(key) {
      chrome.storage.local.get({
        'session-storage-db': {}
      }, prefs => {
        const oldValue = prefs['session-storage-db'][key];
        delete prefs['session-storage-db'][key];
        chrome.storage.local.set(prefs, () => {
          dispatch({
            [key]: {
              newValue: null,
              oldValue
            }
          });
        });
      });
    }
  };
  chrome.storage.session.cs = [];

  //
  chrome.storage.onChanged.addListener = new Proxy(chrome.storage.onChanged.addListener, {
    apply(target, self, args) {
      const [c] = args;

      chrome.storage.session.cs.push(c);
      return Reflect.apply(target, self, args);
    }
  });
}
