/* DEMO: datos ficticios en memoria. Sin red, correo real, Auth ni persistencia. */
(function(root){
'use strict';
const people=[
{id:'voluntario',nombre:'Diego Soto',cargo:'VOLUNTARIO',oficial:false},
{id:'voluntaria',nombre:'Elena Vega',cargo:'VOLUNTARIA',oficial:false},
{id:'capitan',nombre:'Alex Rojas',cargo:'CAPITÁN',oficial:true},
{id:'teniente1',nombre:'Camila Díaz',cargo:'TENIENTE PRIMERO',oficial:true},
{id:'teniente2',nombre:'Gabriel Silva',cargo:'TENIENTE SEGUNDO',oficial:true},
{id:'teniente3',nombre:'Laura Pérez',cargo:'TENIENTE TERCERO',oficial:true},
{id:'teniente4',nombre:'Tomás Vera',cargo:'TENIENTE CUARTO',oficial:true},
{id:'director',nombre:'Andrés Paz',cargo:'DIRECTOR',oficial:true},
{id:'secretario',nombre:'María León',cargo:'SECRETARIA',oficial:true},
{id:'tesorero',nombre:'Pablo Torres',cargo:'TESORERO',oficial:true},
{id:'ayudante',nombre:'Francisca Ruiz',cargo:'AYUDANTE',oficial:true},
{id:'ayudante2',nombre:'Javier Mella',cargo:'AYUDANTE',oficial:true}
];
let user='voluntario',records=[],notices=[],tickets=[],sequence=1;
const clone=x=>JSON.parse(JSON.stringify(x));
const person=id=>people.find(p=>p.id===id);
const now=()=>new Date().toISOString();
const localDay=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const helper=()=>person(user).cargo==='AYUDANTE';
function requireHelper(){if(!helper())throw Error('La consulta y validación son exclusivas del ayudante.');}
function history(r,action,before,after,reason=''){
 r.historial.push({fecha:now(),actor:person(user).nombre,accion:action,antes:clone(before),despues:clone(after),motivo:reason});
}
const fields=r=>({fecha:r.fecha,clave:r.clave,asistentes:[...r.asistentes],observaciones:r.observaciones,responsable:r.responsable});
function notify(){
 for(const p of people.filter(p=>p.oficial))notices.unshift({para:p.id,fecha:now(),texto:'Se ingresó un registro de emergencia.',correo:p.id+'@ejemplo.invalid'});
}
function validate(d){
 if(d.declaracion!==true)throw Error('Debes declarar que tú estuviste a cargo de esta emergencia.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha||'')||!Number.isFinite(Date.parse(d.fecha+'T12:00:00Z'))||new Date(d.fecha+'T12:00:00Z').toISOString().slice(0,10)!==d.fecha)throw Error('Selecciona una fecha válida.');
 if(d.fecha>localDay(new Date()))throw Error('La fecha no puede ser futura.');
 const clave=String(d.clave||'').trim();if(!clave||clave.length>50)throw Error('Ingresa la clave de emergencia (máximo 50 caracteres).');
 if(!Array.isArray(d.asistentes)||!d.asistentes.length||d.asistentes.some(id=>!person(id)))throw Error('Selecciona asistentes del listado.');
 if(!d.asistentes.includes(user))throw Error('Inclúyete entre los asistentes: declaras haber estado a cargo.');
 if(String(d.observaciones||'').length>2000)throw Error('Las observaciones admiten hasta 2000 caracteres.');
 return {fecha:d.fecha,clave,asistentes:[...new Set(d.asistentes)],observaciones:String(d.observaciones||'').trim()};
}
function reset(){
 user='voluntario';records=[];notices=[];tickets=[];sequence=1;
 const today=localDay(new Date()),yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
 for(const sample of [
  {fecha:today,clave:'DEMO-01',asistentes:['voluntario','voluntaria','teniente1'],observaciones:'Ejemplo ficticio para probar la revisión.',responsable:'voluntario',estado:'PENDIENTE'},
  {fecha:localDay(yesterday),clave:'DEMO-02',asistentes:['capitan','teniente1','teniente2','voluntaria'],observaciones:'Ejemplo ficticio validado para probar informes.',responsable:'capitan',estado:'VALIDADO'}
 ]){
  user=sample.responsable;const r={...sample,id:'demo-'+sequence++,version:1,creada_en:now(),historial:[]};
  history(r,'INGRESO',null,fields(r));
  if(r.estado==='VALIDADO'){user='ayudante';history(r,'VALIDACIÓN',{estado:'PENDIENTE'},{estado:'VALIDADO'});}
  records.push(r);notify();
 }
 user='voluntario';
}
function range(d){
 const from=d.desde||'0001-01-01',to=d.hasta||'9999-12-31';
 if(from>to)throw Error('La fecha inicial debe ser anterior o igual a la final.');
 return records.filter(r=>r.fecha>=from&&r.fecha<=to);
}
function visibleRecord(r){
 return {...clone(r),responsable_nombre:person(r.responsable).nombre,asistentes_nombres:r.asistentes.map(id=>person(id).nombre)};
}
function api(action,d={}){
 if(action==='inicio')return {
  usuario:clone(person(user)),es_ayudante:helper(),personas:clone(people),
  avisos:clone(notices.filter(n=>n.para===user)),
  solicitudes:tickets.filter(t=>t.para===user&&t.activa).map(t=>({id:t.id,mensaje:t.mensaje}))
 };
 if(action==='enviar'){
  const data=validate(d);
  if(d.solicitud){
   const t=tickets.find(t=>t.id===d.solicitud&&t.para===user&&t.activa);
   if(!t)throw Error('La solicitud de corrección ya no está disponible.');
   const r=records.find(r=>r.id===t.registro);
   if(r.responsable!==user||r.estado!=='DEVUELTO')throw Error('No puedes modificar este registro.');
   const before=fields(r);Object.assign(r,data,{estado:'PENDIENTE',version:r.version+1});
   history(r,'CORRECCIÓN DEL RESPONSABLE',before,fields(r));t.activa=false;notify();
  }else{
   const r={...data,responsable:user,id:'demo-'+sequence++,estado:'PENDIENTE',version:1,creada_en:now(),historial:[]};
   history(r,'INGRESO',null,fields(r));records.push(r);notify();
  }
  // The creator only receives acknowledgement, never the record or review status.
  return {recibido:true};
 }
 if(action==='consulta'){requireHelper();return range(d).map(visibleRecord).sort((a,b)=>b.fecha.localeCompare(a.fecha));}
 if(action==='detalle'){requireHelper();const r=records.find(r=>r.id===d.id);if(!r)throw Error('Registro no encontrado.');return visibleRecord(r);}
 if(action==='validar'||action==='devolver'){
  requireHelper();const r=records.find(r=>r.id===d.id);if(!r)throw Error('Registro no encontrado.');
  if(r.responsable===user)throw Error('Otro ayudante debe revisar el registro que tú creaste.');
  if(r.version!==d.version)throw Error('El registro cambió. Actualiza la consulta.');
  if(r.estado!=='PENDIENTE')throw Error('Solo se revisan registros pendientes.');
  const reason=String(d.motivo||'').trim();
  if(action==='devolver'&&(reason.length<5||reason.length>500))throw Error('Describe qué debe corregirse, entre 5 y 500 caracteres.');
  const before={estado:r.estado};r.estado=action==='validar'?'VALIDADO':'DEVUELTO';r.version++;
  history(r,action==='validar'?'VALIDACIÓN':'DEVOLUCIÓN',before,{estado:r.estado},reason);
  if(action==='devolver')tickets.push({id:'solicitud-'+sequence++,registro:r.id,para:r.responsable,mensaje:reason,activa:true});
  return {ok:true};
 }
 if(action==='informe'){
  requireHelper();const list=range(d);
  return {registros:list.map(visibleRecord),total:list.length,
   pendientes:list.filter(r=>r.estado==='PENDIENTE').length,validados:list.filter(r=>r.estado==='VALIDADO').length,devueltos:list.filter(r=>r.estado==='DEVUELTO').length,
   bomberos:people.map(p=>({nombre:p.nombre,cargo:p.cargo,pendientes:list.filter(r=>r.estado==='PENDIENTE'&&r.asistentes.includes(p.id)).length,validadas:list.filter(r=>r.estado==='VALIDADO'&&r.asistentes.includes(p.id)).length,devueltas:list.filter(r=>r.estado==='DEVUELTO'&&r.asistentes.includes(p.id)).length}))
  };
 }
 throw Error('Acción no disponible.');
}
reset();
root.asistenciaDemo={roles:clone(people),reset,switchRole(id){if(!person(id))throw Error('Persona desconocida.');user=id;},api};
})(globalThis);
