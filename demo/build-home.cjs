// Static copy of the existing institutional homepage. No production auth routes.
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const html=source
  .replace('<head>','<head>\n<meta name="robots" content="noindex,nofollow">\n<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; object-src \'none\'">')
  .replaceAll('escudo-transparente.png?v=completo-2','escudo.png')
  .replaceAll('href="acceso.html"','href="index.html"')
  .replaceAll('href="guardias.html"','href="index.html"')
  .replace('AVANCE PÚBLICO · Sistema en desarrollo','VISTA PREVIA DE LA WEB · ACCESO CON CUENTAS FICTICIAS · SIN REGISTROS REALES');
fs.writeFileSync(path.join(__dirname,'inicio.html'),html);
fs.writeFileSync(path.join(__dirname,'institucional.css'),[...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(match=>match[1]).join('\n'));
