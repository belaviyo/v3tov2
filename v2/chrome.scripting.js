chrome.scripting = chrome.scripting || {
  executeScript({target, files, func, args = []}) {
    const props = {};

    if (files) {
      props.file = files[0];
    }
    if (func) {
      const s = btoa(JSON.stringify(args));
      props.code = '(' + func.toString() + `)(...JSON.parse(atob('${s}')))`;
    }
    if (target.allFrames) {
      props.allFrames = true;
      props.matchAboutBlank = true;
    }

    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.executeScript(target.tabId, props, r => {
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
    });
  }
};
