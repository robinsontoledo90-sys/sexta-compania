'use strict';
const db=window.supabase?.createClient('https://qktxtrlfyewmlgcqrkiz.supabase.co','sb_publishable_JwJ0LvGvRrEtXu--hTCnaQ_3ILqpLmD');
const $=id=>document.getElementById(id);
let session=null,detail=null,roster=[],busy=false,pending=null;
const dateText=value=>new Date(value).toLocaleString('es-CL',{dateStyle:'medium',timeStyle:'short'});
function text(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;}
function message(value,error=false){$('status').textContent=value;$('status').classList.toggle('error',error);}
async function api(action,data={}){if(!db)throw new Error('No se pudo cargar el servicio. Actualiza la página.');const r=await db.rpc('asistencia_api',{p_action:action,p_data:data});if(r.error)throw r.error;return r.data;}
async function run(task){
 if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>{b.dataset.wasDisabled=String(b.disabled);b.disabled=true;});
 try{await task();}catch(e){message(e.message||'No se pudo conectar. Inténtalo nuevamente.',true);}
 finally{busy=false;document.querySelectorAll('button').forEach(b=>{if('wasDisabled' in b.dataset){b.disabled=b.dataset.wasDisabled==='true';delete b.dataset.wasDisabled;}});}
}
function owners(select,current){select.replaceChildren();for(const p of roster){const o=text('option',p.nombre+' · '+p.cargo);o.value=p.id;select.append(o);}if(current)select.value=current;}
async function load(){
 const result=await db.auth.getUser();
 if(result.error||!result.data.user){$('app').hidden=true;$('login').hidden=false;message('Inicia sesión para consultar tu asistencia.');return;}
 const next=await api('inicio');session=next;
 $('login').hidden=true;$('app').hidden=false;
 $('identity').textContent=session.nombre+' · '+session.cargo;
 $('showCreate').hidden=false;
 $('showCreate').textContent=session.mando?'Nueva actividad':'Registrar emergencia o academia';
 for(const option of $('type').options){
  option.hidden=option.disabled=!session.mando&&!['EMERGENCIA','EJERCICIO'].includes(option.value);
 }
 $('owner').disabled=!session.mando;
 $('owner').closest('label').hidden=!session.mando;
 $('scope').textContent=session.mando?'Puedes crear actividades, designar encargados y corregir listas cerradas con un motivo. Otro responsable debe validar tu asistencia.':'Puedes registrar una emergencia o academia y quedarás como encargado inicial. Otro responsable debe validar tu asistencia.';
 if(!session.mando)$('createPanel').hidden=true;
 if(session.mando){roster=await api('personas');owners($('owner'));owners($('replacement'));}
 renderActivities();message('Acceso verificado.');
}
function renderActivities(){
 const host=$('activities');host.replaceChildren();
 if(!session.actividades.length){host.append(text('p','Todavía no hay actividades registradas. Usa el botón de arriba para registrar una emergencia o academia.','empty'));return;}
 for(const a of session.actividades){
  const card=text('article','','panel activity');
  card.append(text('span',a.tipo+' · '+(a.cerrada_en?'CERRADA':'ABIERTA'),'badge'),text('h3',a.titulo),text('p',dateText(a.fecha),'muted'),text('p','Encargado: '+a.encargado_nombre,'muted'),text('p','Tu estado: '+(a.mi_estado||'Sin registrar'),'muted'));
  if(session.mando||a.encargado===session.usuario){const b=text('button','Abrir lista');b.type='button';b.onclick=()=>run(async()=>{await openDetail(a.id);$('detail').scrollIntoView({behavior:'smooth'});});card.append(b);}
  host.append(card);
 }
}
async function openDetail(id){
 const next=await api('detalle',{actividad:id});detail=next;
 $('detail').hidden=false;$('detailTitle').textContent=detail.actividad.titulo;
 $('detailType').textContent=detail.actividad.tipo==='EJERCICIO'?'ACADEMIA':detail.actividad.tipo;
 $('detailDate').textContent=dateText(detail.actividad.fecha);
 const closed=!!detail.actividad.cerrada_en;
 $('detailState').textContent=closed?'Lista cerrada el '+dateText(detail.actividad.cerrada_en)+'. Solo capitán y tenientes pueden corregirla con un motivo.':'Lista abierta. Marca únicamente a las personas cuya asistencia verificaste. Tu fila requiere validación de otro responsable.';
 $('management').hidden=!session.mando||closed;
 $('closeList').hidden=closed;
 owners($('replacement'),detail.actividad.encargado);
 const counts=$('counts');counts.replaceChildren();for(const state of ['PRESENTE','AUSENTE','JUSTIFICADO',null])counts.append(text('span',(state||'SIN REGISTRAR')+': '+detail.personas.filter(p=>p.estado===state).length));
 renderPeople();renderHistory();message('Lista actualizada.');
}
function renderPeople(){
 const host=$('people');host.replaceChildren();const query=$('search').value.trim().toLocaleLowerCase('es');
 const closed=!!detail.actividad.cerrada_en;
 for(const p of detail.personas.filter(p=>(p.nombre+' '+p.cargo).toLocaleLowerCase('es').includes(query))){
  const row=text('div','','person'),who=text('div','');
  who.append(text('strong',p.nombre),text('p',p.cargo+(p.id===session.usuario?' · TU ASISTENCIA':''),'muted'));
  const state=text('div','');state.append(text('strong',p.estado||'Sin registrar'));if(p.registrado_en)state.append(text('p',p.registrado_por+' · '+dateText(p.registrado_en),'muted'));
  row.append(who,state);
  if(p.id===session.usuario){row.append(text('span','Debe validar otro responsable','muted'));}
  else if(p.habilitado&&(!closed||session.mando)){
   const controls=text('div','','controls'),select=document.createElement('select');
   select.setAttribute('aria-label','Estado de '+p.nombre);
   for(const s of ['PRESENTE','AUSENTE','JUSTIFICADO']){const o=text('option',s);o.value=s;select.append(o);}select.value=p.estado||'PRESENTE';
   const button=text('button',p.estado?'Corregir':'Registrar');
   button.onclick=()=>confirmAction('Confirmar asistencia',p.nombre+': '+select.value,{action:'marcar',data:{voluntario:p.id,estado:select.value}},!!p.estado||closed);
   controls.append(select,button);row.append(controls);
  }else row.append(text('span',p.habilitado?'Lista cerrada':'Cuenta deshabilitada','muted'));
  host.append(row);
 }
 if(!host.childElementCount)host.append(text('p','No hay voluntarios que coincidan.','muted'));
}
function renderHistory(){
 const host=$('history');host.replaceChildren();
 const name=id=>detail.personas.find(p=>p.id===id)?.nombre||'Voluntario';
 for(const h of detail.historial){
  const row=text('div','','audit');row.append(text('strong',h.accion+' · '+h.actor_nombre),text('p',dateText(h.fecha),'muted'));
  if(h.despues?.voluntario)row.append(text('p',name(h.despues.voluntario)+': '+(h.antes?.estado||'Sin registrar')+' → '+h.despues.estado));
  if(h.accion==='DESIGNAR')row.append(text('p','Encargado: '+name(h.antes?.encargado)+' → '+name(h.despues?.encargado)));
  if(h.motivo)row.append(text('p','Motivo: '+h.motivo));host.append(row);
 }
}
function confirmAction(title,description,operation,reason=false){
 if(busy||!detail)return;
 pending={...operation,activity:detail.actividad.id,version:detail.actividad.version};
 $('confirmTitle').textContent=title;$('confirmText').textContent=description;
 $('reasonLabel').hidden=!reason;$('reason').value='';$('reason').required=reason;$('reason').minLength=reason?5:0;
 $('confirmDialog').showModal();
}
$('cancel').onclick=()=>{$('confirmDialog').close();pending=null;};
$('confirmDialog').addEventListener('cancel',()=>{pending=null;});
$('confirmForm').onsubmit=e=>{
 e.preventDefault();if(!pending)return;
 const op=pending,reason=$('reason').value.trim();if($('reason').required&&reason.length<5){$('reason').setCustomValidity('Escribe al menos 5 caracteres.');$('reason').reportValidity();return;}
 $('confirmDialog').close();pending=null;
 run(async()=>{
  await api(op.action,{...op.data,actividad:op.activity,version:op.version,motivo:reason});
  // A confirmed server write is distinct from a failed subsequent refresh.
  try{await load();await openDetail(op.activity);message('Cambio guardado y verificado.');}
  catch(e){$('detail').hidden=true;message('El cambio se guardó, pero no se pudo actualizar la vista. Pulsa Actualizar actividades.',true);}
 });
};
$('reason').oninput=()=>$('reason').setCustomValidity('');
$('refresh').onclick=()=>run(async()=>{$('detail').hidden=true;detail=null;await load();});
$('showCreate').onclick=()=>{$('createPanel').hidden=!$('createPanel').hidden;};
$('createForm').onsubmit=e=>{e.preventDefault();run(async()=>{
 const a=await api('crear',{titulo:$('title').value.trim(),tipo:$('type').value,fecha:new Date($('date').value).toISOString(),encargado:session.mando?$('owner').value:session.usuario});
 $('createForm').reset();$('createPanel').hidden=true;
 try{await load();await openDetail(a.id);message('Actividad creada.');}catch(error){message('Actividad creada. Actualiza la página para verla.',true);}
});};
$('assign').onclick=()=>confirmAction('Cambiar encargado','El encargado anterior perderá el permiso para pasar lista en esta actividad.',{action:'designar',data:{encargado:$('replacement').value}});
$('closeList').onclick=()=>confirmAction('Cerrar lista','Los registros pendientes seguirán como “Sin registrar”. Después del cierre, solo capitán y tenientes podrán corregir la lista con un motivo.',{action:'cerrar',data:{}});
$('reloadDetail').onclick=()=>run(()=>openDetail(detail.actividad.id));
$('search').oninput=()=>{if(detail)renderPeople();};
if(db){db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){$('app').hidden=true;$('detail').hidden=true;$('login').hidden=false;$('confirmDialog').close();session=null;detail=null;pending=null;message('Sesión cerrada.');}});run(load);}
else message('No se pudo cargar el servicio. Actualiza la página.',true);
