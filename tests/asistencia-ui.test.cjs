const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/asistencia.js'),'utf8');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.value='';this.hidden=false;this.disabled=false;this.textContent='';this.classList={toggle(){}};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(key,value){this[key]=value;}
 get childElementCount(){return this.children.length;}
 addEventListener(){}
 showModal(){this.open=true;}
 close(){this.open=false;}
 setCustomValidity(){}
 reportValidity(){return true;}
 scrollIntoView(){}
}
async function setup({user='me',mando=false,fail=false}={}){
 const els={};const get=id=>els[id]??=new Element('div');
 const calls=[];
 const db={auth:{getUser:async()=>({data:{user:user?{id:user}:null},error:null}),onAuthStateChange(){}},
 rpc:async(name,args)=>{calls.push(args);
  if(args.p_action==='inicio')return {data:{usuario:'me',nombre:'Prueba',cargo:mando?'CAPITÁN':'VOLUNTARIO',mando,actividades:[]}};
  if(args.p_action==='personas')return {data:[{id:'me',nombre:'Prueba',cargo:'CAPITÁN'},{id:'other',nombre:'Otro',cargo:'VOLUNTARIO'}]};
  if(fail)return {error:{message:'Error de conexión simulado'}};
  return {data:{ok:true}};
 }};
 const context=vm.createContext({window:{supabase:{createClient:()=>db}},document:{getElementById:get,createElement:tag=>new Element(tag),querySelectorAll:()=>[]},console});
 vm.runInContext(source,context);
 for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 return {els,context,calls,get};
}
(async()=>{
 let t=await setup({user:null});assert.equal(t.get('login').hidden,false);assert.equal(t.get('app').hidden,true);assert.equal(t.calls.length,0);
 t=await setup();assert.equal(t.get('showCreate').hidden,true);assert.match(t.get('activities').children[0].textContent,/Todavía/);
 t=await setup({mando:true});assert.equal(t.get('showCreate').hidden,false);
 const fixture={actividad:{id:'activity',cerrada_en:null,version:1},personas:[{id:'me',nombre:'Yo',cargo:'CAPITÁN',habilitado:true,estado:null},{id:'other',nombre:'Otro',cargo:'VOLUNTARIO',habilitado:true,estado:null}],historial:[]};
 vm.runInContext('detail='+JSON.stringify(fixture)+'; renderPeople();',t.context);
 assert.equal(t.get('people').children[0].children[2].textContent,'Debe validar otro responsable');
 assert.equal(t.get('people').children[1].children[2].children[1].textContent,'Registrar');
 vm.runInContext("session.mando=false;detail.actividad.cerrada_en='2026-11-02';renderPeople();",t.context);
 assert.equal(t.get('people').children[1].children[2].textContent,'Lista cerrada');
 t=await setup({mando:true,fail:true});
 vm.runInContext('detail='+JSON.stringify(fixture)+';',t.context);
 vm.runInContext("confirmAction('Prueba','Otro',{action:'marcar',data:{voluntario:'other',estado:'PRESENTE'}},false);",t.context);
 t.get('confirmForm').onsubmit({preventDefault(){}});
 for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.match(t.get('status').textContent,/Error de conexión/);
 assert.equal(vm.runInContext('detail.personas[1].estado',t.context),null);
 assert.equal(t.calls.filter(c=>c.p_action==='marcar').length,1);
 console.log('PASS: sin sesión, consulta, mando, autoasistencia, lista cerrada y guardado fallido sin falso éxito');
})().catch(e=>{console.error(e);throw e;});
