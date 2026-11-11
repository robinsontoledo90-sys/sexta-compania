const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
class Element {
  constructor(){this.children=[];this.handlers={};this.value='';this.hidden=false;this.disabled=false;this.textContent='';}
  append(...items){this.children.push(...items);} replaceChildren(...items){this.children=items;}
  addEventListener(name,fn){this.handlers[name]=fn;} setAttribute(){} focus(){} reset(){}
  fire(name='click'){this.handlers[name]({preventDefault(){}});}
}
const ids={};const get=id=>ids[id]??=new Element();
const source=fs.readFileSync(path.join(__dirname,'../demo/demo.js'),'utf8');
vm.runInNewContext(source,{document:{getElementById:get,createElement:()=>new Element()}});
const login=(user,password)=>{get('username').value=user;get('password').value=password;get('demoLogin').fire('submit');};
const action=index=>get('activities').children[index].children[4].children[0];
assert.equal(get('dashboard').hidden,true);
login('oficial.demo','wrong');assert.equal(get('dashboard').hidden,true);assert.match(get('loginError').textContent,/incorrectos/);assert.equal(get('password').value,'');
login('voluntario.demo','VoluntarioDemo6!');assert.equal(get('title').textContent,'Panel Voluntario');assert.equal(get('command').hidden,true);
assert.deepEqual(get('activities').children.map(x=>x.children[1].textContent),['Asistencia en tiempo real a emergencias','Asistencia en tiempo real academia']);
action(0).fire();assert.match(action(0).textContent,/Retirar/);
action(1).fire();assert.match(action(1).textContent,/Retirar/);
get('switch').fire();assert.equal(get('dashboard').hidden,true);
login('oficial.demo','OficialDemo6!');assert.equal(get('command').hidden,false);assert.equal(get('roster').children.length,3);
assert.equal(get('activities').children[0].children[3].textContent,'3');
action(0).fire();assert.match(action(0).textContent,/Abrir/);
get('switch').fire();login('voluntario.demo','VoluntarioDemo6!');assert.equal(action(0).disabled,true);action(0).fire();assert.match(action(0).textContent,/Retirar/);
assert.equal(get('roster').children.length,0);
get('reset').fire();assert.equal(action(0).disabled,false);assert.match(action(0).textContent,/Registrar/);
assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|supabase|localStorage|sessionStorage|WebSocket/);
const html=fs.readFileSync(path.join(__dirname,'../demo/index.html'),'utf8');assert.match(html,/connect-src 'none'/);assert.doesNotMatch(html,/https?:\/\//);
console.log('PASS: cuentas ficticias, acceso inválido, roles, asistencia, cierre, aislamiento y reinicio');
