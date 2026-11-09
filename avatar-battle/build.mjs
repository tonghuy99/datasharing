// Gộp three.js + src/film.js + src/template.html thành 1 file index.html tự chứa (không cần mạng).
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const read = p => readFileSync(new URL(p, here), 'utf8');
const three = read('node_modules/three/build/three.min.js');
const film = read('src/film.js');
for (const [n, s] of [['three', three], ['film', film]])
  if (/<\/script/i.test(s)) throw new Error(n + ' contains </script');
const html = read('src/template.html').split('/*__THREE__*/').join(three).split('/*__FILM__*/').join(film);
writeFileSync(new URL('index.html', here), html);
console.log('index.html', (html.length / 1024).toFixed(0) + ' KB');
