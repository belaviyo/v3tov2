const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const zip = new AdmZip();

process.chdir(__dirname);

const helper = require('./helper');

const overwrites = [
  'chrome.scripting.unregisterContentScripts',
  'chrome.scripting.registerContentScripts',
  ...fs.readdirSync('v2').map(a => a.slice(0, -3))
];

const add = (name, content) => {
  zip.addFile(name, content);

  const fn = path.resolve('./build/', name);
  helper.addDir(fn);

  fs.writeFile(fn, content, err => {
    if (err) {
      return console.log(err);
    }
  });
};

helper.empty('./build/').then(async () => {
  const extension = (process.argv[2] + '/').replace('//', '/');
  const fixes = require('./fixes.js').per(extension);

  const files = (await helper.files(extension)).filter(fixes.files);

  const manifest = files.filter(a => a.endsWith('manifest.json')).shift();
  if (!manifest) {
    throw Error('cannot find manifest.json');
  }

  const v2files = new Set();

  // read all files
  const contents = {};
  for (const file of files) {
    contents[file] = await helper.readFile(file);
  }

  // add v2 scripts to the HTML files
  for (const file of files.filter(f => f.endsWith('.html'))) {
    const dir = path.dirname(file);
    const scripts = (await helper.scripts(file)).map(f => helper.resolveFile(f, extension, dir));

    const v2 = new Set();

    for (const script of scripts) {
      const content = (await helper.readFile(script)).toString();

      for (const key of overwrites) {
        if (content.includes(key)) {
          v2.add(key);
          v2files.add(key);
        }
      }
    }
    if (v2.size) {
      const content = contents[file].toString().replace('<head>', '<head>' + [...v2].map(s => `<script src="/v2/${s}.js"></script>`).join(''));
      contents[file] = Buffer.from(content, 'utf8');
    }
  }

  // fix manifest
  const d = JSON.parse(contents[manifest].toString());
  const pageAction = fixes.isPageAction();
  delete d['minimum_chrome_version'];
  d['manifest_version'] = 2;
  if (d['host_permissions']) {
    d['permissions'] = d['permissions'] || [];
    d['permissions'].push(
      ...d['host_permissions']
    );
    delete d['host_permissions'];
  }
  if (d['optional_host_permissions']) {
    d['optional_permissions'] = d['optional_permissions'] || [];
    d['optional_permissions'].push(
      ...d['optional_host_permissions']
    );
    delete d['optional_host_permissions'];
  }

  if (d['optional_permissions'].includes('favicon')) {
    d['optional_permissions'].splice(
      d['optional_permissions'].indexOf('favicon'),
      1
    );
  }

  if (d['commands']) {
    if (d['commands']['_execute_action']) {
      d['commands'][pageAction ? '_execute_page_action' : '_execute_browser_action'] = {};
    }
    delete d['commands']['_execute_action'];
  }
  if (d['action']) {
    d[pageAction ? 'page_action' : 'browser_action'] = d['action'];

    delete d['action'];
  }
  if (d['background']) {
    const worker = helper.resolveFile(d['background']['service_worker'], extension, extension);
    const root = path.dirname(path.resolve(extension, d['background']['service_worker']));

    const sc = await helper.scripts(worker);
    const scripts = [
      ...[...await sc].map(f => helper.resolveFile(f, root, root)),
      worker
    ];
    // modules
    const modules = [
      ...[...sc.modules].map(f => helper.resolveFile(f, root, root)),
      worker
    ];

    const v2 = new Set();

    for (const script of [...scripts, ...modules]) {
      const content = (await helper.readFile(script)).toString();

      for (const key of overwrites) {
        if (content.includes(key)) {
          v2.add(key);
          v2files.add(key);
        }
      }

      if (content.includes('navigator.clipboard.writeText')) {
        d['permissions'].push('clipboardWrite');
      }
    }

    delete d['incognito'];

    const bgs = [
      [...v2].map(f => `/v2/${f}.js`),
      scripts.map(f => f.replace(extension, ''))
    ].flat();

    if (d['background']['type'] === 'module') {
      d['background']['page'] = 'background.html';
      delete d['background']['type'];

      add('background.html', `<!DOCTYPE html>
<html>
<body>
${bgs.map(a => `<script type="${a.endsWith('mjs') ? 'module' : 'text/javascript'}" src="${a}"></script>`).join('\n')}
</body>
</html>`);
    }
    else {
      d['background']['scripts'] = bgs;
    }

    delete d['background']['service_worker'];

    // delete importScripts
    for (const script of scripts) {
      contents[script] = Buffer.from(
        contents[script].toString().replaceAll(/(self\.)?importScripts\([^)]+\);?/g, ''),
        'utf8'
      );
    }
  }
  fixes.extraPermissions(d);

  delete d['offline_enabled'];
  if (d['web_accessible_resources']) {
    d['web_accessible_resources'] = d['web_accessible_resources'].map(o => o.resources).flat();
  }

  if (d['content_security_policy']) {
    d['content_security_policy'] = d['content_security_policy']['extension_pages'];
  }
  fixes.cleanup(d);

  contents[manifest] = Buffer.from(JSON.stringify(d, undefined, '  '), 'utf8');


  // write to disk
  for (const [file, content] of Object.entries(contents)) {
    add(file.replace(extension, ''), content);
  }
  for (const s of [...v2files]) {
    const name = 'v2/' + s + '.js';
    add(name, await helper.readFile(name));
  }

  zip.writeZip('test.zip');
});
