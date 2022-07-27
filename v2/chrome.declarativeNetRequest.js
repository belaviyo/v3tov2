{
  const cache = {
    dynamic: {}
  };

  const onBeforeRequest = d => {
    // allow
    const as = Object.values(cache.dynamic).filter(r => r.action.type === 'allow');
    for (const rule of as) {
      try {
        if (rule.condition.resourceTypes.includes(d.type)) {
          if (rule.condition.regexp) {
            if (rule.condition.regexp.test(d.url)) {
              return;
            }
          }
          // https://www.example.com*
          else if (rule.condition.urlFilter) {
            // wildcard support
            if (rule.condition.urlFilter.includes('*')) {
              const result = rule.condition.urlFilter
                .replace(/([/()[\].?])/g, '\\$1')
                .replace('*', '.*');

              if (new RegExp(result).test(d.url)) {
                return;
              }
            }
            else {
              if (d.url.startsWith(rule.condition.urlFilter)) {
                return;
              }
            }
          }
          else {
            return;
          }
        }
      }
      catch (e) {
        console.warn('chrome.declarativeNetRequest.js', e, rule);
      }
    }
    // redirect
    const rs = Object.values(cache.dynamic).filter(r => r.action.type === 'redirect');
    for (const rule of rs) {
      try {
        if (rule.condition.resourceTypes.includes(d.type) && rule.condition.regexp.test(d.url)) {
          if (rule.action.redirect.extensionPath) {
            return {
              redirectUrl: chrome.runtime.getURL(rule.action.redirect.extensionPath)
            };
          }
          // const m = rule.condition.regexp.exec(d.url);
          let redirectUrl = rule.action.redirect.regexSubstitution
            .replace('\\0', d.url);

          // copy arguments
          if (redirectUrl.startsWith('http')) {
            if (redirectUrl.includes('?') === false && d.url.includes('?')) {
              redirectUrl += '?' + d.url.split('?')[1];
            }
          }

          return {
            redirectUrl
          };
        }
      }
      catch (e) {
        console.warn('chrome.declarativeNetRequest.js', e, rule);
      }
    }
  };

  const remove = (id, type = 'dynamic') => {
    delete cache[type][id];
    // do we still need the listener
    if (Object.values(cache.dynamic).some(rule => rule.action.type === 'redirect' || rule.action.type === 'allow')) {
      return;
    }
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
  };
  const add = (rule, type = 'dynamic') => {
    cache[type][rule.id] = rule;
    if (rule.condition.regexFilter) {
      rule.condition.regexp = new RegExp(
        rule.condition.regexFilter,
        rule.condition.isUrlFilterCaseSensitive ? '' : 'i'
      );
    }
    if (rule.action.type === 'redirect' || rule.action.type === 'allow') {
      chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest);

      const types = new Set();
      for (const rule of Object.values(cache.dynamic)) {
        rule.condition.resourceTypes.forEach(s => types.add(s));
      }

      chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
        urls: ['*://*/*'],
        types: [...types]
      }, ['blocking']);
    }
  };

  chrome.declarativeNetRequest = chrome.declarativeNetRequest || {
    MAX_NUMBER_OF_REGEX_RULES: 5000,
    getDynamicRules() {
      return Promise.resolve(Object.values(cache.dynamic));
    },
    updateDynamicRules({removeRuleIds = [], addRules = []}) {
      removeRuleIds.forEach(id => remove(id));
      addRules.forEach(rule => {
        if (cache.dynamic[rule.id]) {
          throw Error('duplicated id: ' + rule.id);
        }
        add(rule);
      });

      return Promise.resolve();
    }
  };
}
