/* Demo aislada: memoria de esta pestaña; no usa Auth, red ni almacenamiento real. */
(function(root){
'use strict';
const people=[
{id:'capitan',nombre:'Alex Rojas (demo)',cargo:'CAPITÁN',habilitado:true},
{id:'teniente',nombre:'Camila Díaz (demo)',cargo:'TENIENTE PRIMERO',habilitado:true},
{id:'encargado',nombre:'Diego Soto (demo)',cargo:'VOLUNTARIO',habilitado:true},
{id:'participante',nombre:'Elena Vega (demo)',cargo:'VOLUNTARIO',habilitado:true},
{id:'voluntario2',nombre:'Gabriel Silva (demo)',cargo:'VOLUNTARIO',habilitado:true}];
let current='capitan',activities=[],records=[],logs=[],sequence=1;
const copy=x=>JSON.parse(JSON.stringify(x));
const now=()=>new Date().toISOString();
const person=id=>people.find(p=>p.id===id);
const commander=()=>['CAPITÁN','TENIENTE PRIMERO'].includes(person(current).cargo);
function audit(a,accion,antes,despues,motivo=''){
 logs.unshift({actividad:a.id,actor_nombre:person(current).nombre,accion,antes:copy(antes),despues:copy(despues),motivo,fecha:now()});
}
function reset(){
 current='capitan';sequence=1;records=[];logs=[];
 activities=[{id:'demo-ejercicio',titulo:'Ejercicio de compañía · DEMO',tipo:'EJERCICIO',fecha:now(),encargado:'encargado',creada_por:'capitan',cerrada_en:null,version:1}];
 audit(activities[0],'CREAR',null,activities[0]);
}
function call(action,d={}){
 const mando=commander();
 if(action==='inicio')return {usuario:current,nombre:person(current).nombre,cargo:person(current).cargo,mando,actividades:activities.map(a=>({...a,encargado_nombre:person(a.encargado).nombre,mi_estado:records.find(r=>r.actividad===a.id&&r.voluntario===current)?.estado||null}))};
 if(action==='personas'){if(!mando)throw Error('Solo capitán y tenientes pueden designar encargados.');return copy(people);}
 if(action==='crear'){
  if(!mando)throw Error('Solo capitán y tenientes pueden crear actividades.');
  if(!person(d.encargado))throw Error('Selecciona un encargado.');
  if(!d.titulo||d.titulo.trim().length<3||d.titulo.length>160||!Number.isFinite(Date.parse(d.fecha)))throw Error('Completa nombre y fecha de la actividad.');
  if(!['EMERGENCIA','EJERCICIO','REUNIÓN','GUARDIA','OTRA'].includes(d.tipo))throw Error('Tipo no válido.');
  const a={id:'demo-'+sequence++,titulo:d.titulo.trim(),tipo:d.tipo,fecha:d.fecha,encargado:d.encargado,creada_por:current,cerrada_en:null,version:1};
  activities.unshift(a);audit(a,'CREAR',null,a);return copy(a);
 }
 const a=activities.find(a=>a.id===d.actividad);
 if(!a)throw Error('Actividad no encontrada.');
 if(!mando&&a.encargado!==current)throw Error('Esta actividad no está a tu cargo.');
 if(action==='detalle')return {actividad:copy(a),personas:people.map(p=>{const r=records.find(r=>r.actividad===a.id&&r.voluntario===p.id);return {...p,estado:r?.estado||null,registrado_por:r?person(r.registrado_por).nombre:null,registrado_en:r?.registrado_en||null};}),historial:copy(logs.filter(h=>h.actividad===a.id))};
 if(d.version!==a.version)throw Error('La lista cambió. Actualiza antes de guardar.');
 const motivo=(d.motivo||'').trim();if(motivo.length>500)throw Error('El motivo admite hasta 500 caracteres.');
 let before=null,after=null,label=action.toUpperCase();
 if(action==='designar'){
  if(!mando)throw Error('Solo capitán y tenientes pueden designar encargados.');
  if(a.cerrada_en)throw Error('La actividad ya está cerrada.');
  if(!person(d.encargado))throw Error('Selecciona un encargado.');
  before={encargado:a.encargado};a.encargado=d.encargado;after={encargado:a.encargado};
 }else if(action==='marcar'){
  if(d.voluntario===current)throw Error('No puedes registrar tu propia asistencia. Debe validarla otro responsable.');
  if(a.cerrada_en&&!mando)throw Error('La lista está cerrada. Solo capitán y tenientes pueden corregirla.');
  if(!person(d.voluntario)||!['PRESENTE','AUSENTE','JUSTIFICADO'].includes(d.estado))throw Error('Registro no válido.');
  const index=records.findIndex(r=>r.actividad===a.id&&r.voluntario===d.voluntario);
  before=index<0?null:copy(records[index]);
  if((before||a.cerrada_en)&&motivo.length<5)throw Error('Explica el motivo de la corrección (mínimo 5 caracteres).');
  after={actividad:a.id,voluntario:d.voluntario,estado:d.estado,registrado_por:current,registrado_en:now()};
  if(index<0)records.push(after);else records[index]=after;
  if(before||a.cerrada_en)label='CORREGIR';
 }else if(action==='cerrar'){
  if(a.cerrada_en)throw Error('La lista ya está cerrada.');
  before=copy(a);a.cerrada_en=now();after=copy(a);
 }else throw Error('Acción no válida.');
 a.version++;audit(a,label,before,after,motivo);return {ok:true,actividad:a.id};
}
reset();
root.asistenciaDemo={
 roles:copy(people.slice(0,4)),reset,
 switchRole(id){if(!people.slice(0,4).some(p=>p.id===id))throw Error('Rol no válido');current=id;},
 db:{auth:{async getUser(){return {data:{user:{id:current}},error:null};},onAuthStateChange(){}},
 async rpc(name,{p_action,p_data}){if(name!=='asistencia_api')return {error:{message:'API no disponible en demo'}};try{return {data:copy(call(p_action,p_data)),error:null};}catch(e){return {data:null,error:{message:e.message}};}}}
};
})(globalThis);
