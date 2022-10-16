const fs = require('fs');
const path = require('path');


const resolveFile = (file, root, dir) => {
  if (file.startsWith('/')) {
    return path.resolve(root, file.slice(1));
  }
  return path.resolve(dir, file);
};
exports.resolveFile = resolveFile;

const addDir = file => {
  const dirname = path.dirname(file);
  if (fs.existsSync(dirname)) {
    return true;
  }
  addDir(dirname);
  fs.mkdirSync(dirname);
};
exports.addDir = addDir;

exports.empty = (dir = './build/') => new Promise((resolve, reject) => fs.readdir(dir, (err, files) => {
  if (err) {
    return reject(err);
  }

  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    fs.rm(path.resolve(dir, file), {
      recursive: true
    }, err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  }))).then(resolve, reject);
}));

const readFile = (file, codec) => new Promise((resolve, reject) => {
  fs.readFile(file, codec, (err, data) => {
    if (err) {
      reject(err);
    }
    else {
      resolve(data);
    }
  });
});

exports.readFile = readFile;

const walk = dir => new Promise((resolve, reject) => {
  fs.readdir(dir, (err, files) => {
    if (err) {
      reject(err);
    }
    const cache = [];
    let counter = files.length;

    const next = () => {
      counter -= 1;

      if (counter === 0) {
        resolve(cache.filter(f => f.endsWith('.DS_Store') === false));
      }
    };

    for (const file of files) {
      const p = path.resolve(dir, file);
      fs.stat(p, (err, stat) => {
        if (err) {
          reject(err);
        }

        if (stat && stat.isDirectory()) {
          walk(p).then(files => {
            cache.push(...files);
            next();
          }, reject);
        }
        else {
          cache.push(p);
          next();
        }
      });
    }
    if (files.length === 0) {
      resolve([]);
    }
  });
});

exports.files = walk;

exports.scripts = file => readFile(file).then(data => {
  const m1 = [...data.toString().matchAll(/importScripts\(([^)]+)\)/g)]
    .map(a => a[1].split(/\s*,\s*/)).flat().map(s => s.replace(/^['"]/, '').replace(/['"]$/, ''))
    .filter((s, i, l) => s && l.indexOf(s) === i);

  const m2 = [...data.toString().matchAll(/<script.*src=['"]([^'"]+)['"]/g)].map(a => a[1]);

  const m3 = [...data.toString().matchAll(/import[^'"]+['"]([^'"]+)['"]/g)].map(a => a[1]);

  const r = [...m1, ...m2];
  r.modules = m3;
  return r;
});
