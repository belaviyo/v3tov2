const LIST = [
  'declarativeNetRequest',
  'declarativeNetRequestWithHostAccess',
  'scripting'
];

exports.per = extension => ({
  isPageAction() {
    return extension.includes('country-flags');
  },
  extraPermissions(d) {
    if (extension.includes('image-reader') && d['permissions']) {
      d['permissions'].push('<all_urls>');
    }
    if (extension.includes('block-site')) {
      d['permissions'].push('webRequest', 'webRequestBlocking');
    }
  },
  cleanup(d) {
    if (extension.includes('qrcode-reader')) {
      delete d['optional_permissions'];
      delete d['content_security_policy'];
    }
    if (extension.includes('block-site')) {
      delete d['incognito'];
    }
    if (d['permissions']) {
      d['permissions'] = d['permissions'].filter(n => LIST.includes(n) === false);
      d['permissions'] = d['permissions'].filter((s, i, l) => l.indexOf(s) === i);
    }
    if (d['optional_permissions']) {
      d['optional_permissions'] = d['optional_permissions'].filter(n => LIST.includes(n) === false);
      d['optional_permissions'] = d['optional_permissions'].filter((s, i, l) => l.indexOf(s) === i);
    }
  },
  files(name) {
    if (extension.includes('media-player')) {
      if (name.includes('/plugins/cast/')) {
        return false;
      }
    }
    return true;
  }
});

