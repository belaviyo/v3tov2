const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const zip = new AdmZip();

const helper = require('./helper');

const overwrites = [
  'chrome.scripting.unregisterContentScripts',
  'chrome.scripting.registerContentScripts',
  ...fs.readdirSync('v2').map(a => a.slice(0, -3))
];

const add = async (name, content) => {
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
  const extension = process.argv[2];

  const files = await helper.files(extension);
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
  delete d['minimum_chrome_version'];
  d['manifest_version'] = 2;
  if (d['host_permissions']) {
    d['permissions'] = d['permissions'] || [];
    d['permissions'].push(
      ...d['host_permissions']
    );
    delete d['optional_host_permissions'];
  }
  if (d['optional_host_permissions']) {
    d['optional_permissions'] = d['optional_permissions'] || [];
    d['optional_permissions'].push(
      ...d['optional_host_permissions']
    );
    delete d['optional_host_permissions'];
  }
  if (d['commands']) {
    if (d['commands']['_execute_action']) {
      d['commands']['_execute_browser_action'] = {};
    }
    delete d['commands']['_execute_action'];
  }
  if (d['action']) {
    d['browser_action'] = d['action'];
    delete d['action'];
  }
  if (d['background']) {
    const worker = helper.resolveFile(d['background']['service_worker'], extension, extension);
    const scripts = [
      ...[...await helper.scripts(worker)].map(f => helper.resolveFile(f, extension, extension)),
      worker
    ];
    const v2 = new Set();

    for (const script of scripts) {
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

    d['background']['scripts'] = [
      [...v2].map(f => `/v2/${f}.js`),
      scripts.map(f => f.replace(extension, ''))
    ].flat();
    delete d['background']['service_worker'];
    // delete importScripts
    for (const script of scripts) {
      contents[script] = Buffer.from(
        contents[script].toString().replaceAll(/(self\.)?importScripts\([^)]+\);?/g, ''),
        'utf8'
      );
    }
    // clean up
    d['permissions'] = d['permissions'].filter((s, i, l) => l.indexOf(s) === i);
  }
  if (d['permissions']) {
    d['permissions'] = d['permissions'].filter(a => a !== 'scripting');
  }
  if (d['optional_permissions']) {
    d['optional_permissions'] = d['optional_permissions'].filter(a => a !== 'scripting');
  }
  delete d['offline_enabled'];
  if (d['web_accessible_resources']) {
    d['web_accessible_resources'] = d['web_accessible_resources'].map(o => o.resources).flat();
  }
  contents[manifest] = Buffer.from(JSON.stringify(d, undefined, '  '), 'utf8');


  // write to disk
  for (const [file, content] of Object.entries(contents)) {
    add(file.replace(extension, ''), content);
  }
  for (const s of [...v2files]) {
    const name = 'v2/' + s + '.js';
    add(name, await helper.readFile(name));
  }

  // for (const file of [
  //   manifest,
  //   ...files.filter(s => s !== manifest)
  // ]) {
  //   const content = await convert(file, base);
  //   if (file !== manifest) {
  //     add(file.replace(base, ''), content, base);
  //   }
  // }

  // for (const file of Object.keys(convert.v2)) {
  //   const p = 'v2/' + file + '.js';
  //   const content = await helper.readFile(p);
  //   add(p, content, base);
  //   convert.manifest.background.scripts.unshift(p);
  // }

  // add('manifest.json', Buffer.from(JSON.stringify(convert.manifest, undefined, '  '), 'utf8'), base);

  zip.writeZip('test.zip');
});
