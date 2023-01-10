/* global browser */
{
  const cache = new Map();
  chrome.scripting = chrome.scripting || {
    executeScript({target, files, func, world, args = []}, callback = () => {}) {
      const props = {};

      if (files) {
        props.file = files[0];
      }
      if (func) {
        const s = btoa(unescape(encodeURIComponent(JSON.stringify(args))));

        props.code = `{
          const f = ${func.toString()};
          const context = '${world}';
          if (context !== 'MAIN') {
            f(...JSON.parse(decodeURIComponent(escape(atob('${s}')))))
          }
          else {
            const s = document.createElement('script');
            s.textContent = '(' + f.toString() + ')(...JSON.parse(decodeURIComponent(escape(atob("${s}")))))';
            document.body.append(s);
            s.remove();

            s.dataset.result
          }
        }`;
      }
      if (target.allFrames) {
        props.allFrames = true;
        props.matchAboutBlank = true;
      }
      if (target.frameIds && target.frameIds.length) {
        props.frameId = target.frameIds[0];
      }
      props.runAt = 'document_start';

      return new Promise((resolve, reject) => {
        try {
          chrome.tabs.executeScript(target.tabId, props, (r = []) => {
            const lastError = chrome.runtime.lastError;
            if (lastError) {
              reject(lastError);
            }
            else {
              if (r.length === 1 && r[0] === undefined) {
                chrome.tabs.get(target.tabId, t => {
                  if (t.url && t.url.startsWith('about:')) {
                    reject(Error('Cannot access ' + t.url.split('?')[0]));
                  }
                  else {
                    resolve(r.map(result => ({result})));
                  }
                });
              }
              else {
                resolve(r.map(result => ({result})));
              }
            }
          });
        }
        catch (e) {
          reject(e);
        }
      }).then(r => {
        callback(r);

        return r;
      });
    },
    insertCSS({target, files}) {
      const props = {};

      if (files) {
        props.file = files[0];
      }
      if (target.allFrames) {
        props.allFrames = true;
        props.matchAboutBlank = true;
      }
      if (target.frameIds && target.frameIds.length) {
        props.frameId = target.frameIds[0];
      }
      props.runAt = 'document_start';

      return new Promise((resolve, reject) => {
        try {
          chrome.tabs.insertCSS(target.tabId, props, r => {
            const lastError = chrome.runtime.lastError;
            if (lastError) {
              reject(lastError);
            }
            else {
              resolve();
            }
          });
        }
        catch (e) {
          reject(e);
        }
      });
    },
    unregisterContentScripts() {
      for (const o of cache.values()) {
        o.unregister();
      }
      return Promise.resolve();
    },
    async registerContentScripts(os) {
      for (const o of os) {
        if (o.js) {
          o.js = o.js.map(file => ({file}));
        }
        const {id} = o;
        delete o.id;

        const r = await browser.contentScripts.register(o);
        cache.set(id, r);
      }
    }
  };
}
