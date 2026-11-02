'use strict';
const demo=window.asistenciaDemo,$=id=>document.getElementById(id);
let state,correction=null,selected=new Set(),detail=null,report=null,tab='new';
const el=(tag,value='',cls='')=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
const dateLabel=value=>new Date(value+'T12:00:00').toLocaleDateString('es-CL');
const timestamp=value=>new Date(value).toLocaleString('es-CL');
const localDay=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
function message(s,error=false){$('message').textContent=s;$('message').classList.toggle('error',error);}
function safely(fn){try{fn();}catch(e){message(e.message||'No se pudo completar la acción.',true);}}
function name(id){return state.personas.find(p=>p.id===id)?.nombre||'Persona';}
function selectTab(next){
 if(next==='review'&&!state.es_ayudante)return;
 tab=next;
 for(const [key,id] of [['new','newSection'],['review','reviewSection'],['notices','noticesSection']])$(id).hidden=next!==key;
 for(const [key,id] of [['new','navNew'],['review','navReview'],['notices','navNotices']])$(id).setAttribute('aria-current',key===next?'page':'false');
 $('receipt').hidden=true;message('');
 if(next==='review')refreshReport();
 if(next==='notices')renderNotices();
}
function loadIdentity(){
 state=demo.api('inicio');$('identity').textContent=state.usuario.nombre+' · '+state.usuario.cargo+' · Persona ficticia';
 $('responsible').textContent=state.usuario.nombre+' · '+state.usuario.cargo;
 $('navReview').hidden=!state.es_ayudante;
 $('navNotices').textContent='Mis avisos'+(state.avisos.length?' ('+state.avisos.length+')':'');
 renderRequests();renderNotices();
}
function resetForm(){
 $('recordForm').reset();correction=null;selected=new Set([state.usuario.id]);
 $('date').max=localDay(new Date());$('formTitle').textContent='Registrar una emergencia a mi cargo';
 $('correctionNote').hidden=true;$('cancelCorrection').hidden=true;$('submit').textContent='Enviar registro';
 renderPeople();
}
function renderPeople(){
 const host=$('people'),q=$('searchPeople').value.trim().toLocaleLowerCase('es');host.replaceChildren();
 for(const p of state.personas.filter(p=>(p.nombre+' '+p.cargo).toLocaleLowerCase('es').includes(q))){
  const label=el('label','','person'),check=document.createElement('input'),text=el('span',p.nombre);
  check.type='checkbox';check.checked=selected.has(p.id);check.disabled=p.id===state.usuario.id;
  check.setAttribute('aria-label','Asistencia de '+p.nombre);
  check.onchange=()=>{check.checked?selected.add(p.id):selected.delete(p.id);updateCount();};
  text.append(el('small',p.cargo+(p.id===state.usuario.id?' · Responsable: tú':'')));
  label.append(check,text);host.append(label);
 }
 if(!host.childElementCount)host.append(el('p','No hay coincidencias.','muted'));
 updateCount();
}
function updateCount(){$('selectedCount').textContent=selected.size+' asistentes seleccionados. Tu nombre está incluido porque declaras haber estado a cargo.';}
function renderRequests(){
 $('requests').hidden=!state.solicitudes.length;
 const host=$('requestList');host.replaceChildren();
 for(const t of state.solicitudes){
  const card=el('article','','request');card.append(el('h3','Solicitud del ayudante'),el('p',t.mensaje));
  const button=el('button','Completar corrección','secondary');button.type='button';
  button.onclick=()=>{
   resetForm();correction=t.id;$('formTitle').textContent='Completar los datos solicitados';
   $('correctionNote').textContent='Indicación del ayudante: '+t.mensaje+' — Vuelve a completar fecha, clave, asistentes y observaciones. El registro anterior permanece reservado al ayudante.';
   $('correctionNote').hidden=false;$('cancelCorrection').hidden=false;$('submit').textContent='Enviar corrección';
   $('recordForm').scrollIntoView({behavior:'smooth',block:'start'});
  };
  card.append(button);host.append(card);
 }
}
function renderNotices(){
 for(const [id,email] of [['notices',false],['emails',true]]){
  const host=$(id);host.replaceChildren();
  for(const n of state.avisos){
   const row=el('article','','notification');row.append(el('strong',email?'SIMULADO · NO ENVIADO':'Aviso genérico'),el('p',n.texto));
   row.append(el('p',email?'Para: '+n.correo:timestamp(n.fecha),'muted'));
   if(email)row.append(el('p','Asunto: Registro ingresado · Datos de demostración','muted'));
   host.append(row);
  }
  if(!host.childElementCount)host.append(el('p','No hay avisos para esta persona.','empty'));
 }
}
function filters(){return {desde:$('from').value,hasta:$('to').value};}
function refreshReport(){
 if(!state.es_ayudante)return;
 report=demo.api('informe',filters());detail=null;$('detail').hidden=true;
 const stats=$('stats');stats.replaceChildren();
 for(const [label,key] of [['Emergencias registradas','total'],['Validadas','validados'],['Pendientes','pendientes'],['Devueltas','devueltos']]){
  const card=el('div','','stat');card.append(el('strong',report[key]),el('small',label));stats.append(card);
 }
 const list=$('recordList');list.replaceChildren();
 for(const r of report.registros){
  const row=el('article','','record'),body=el('div');
  body.append(el('span',r.estado,'badge '+r.estado),el('h3',r.clave+' · '+dateLabel(r.fecha)),el('p','Responsable: '+r.responsable_nombre,'muted'),el('p',r.asistentes.length+' asistentes: '+r.asistentes_nombres.join(', '),'muted'));
  const button=el('button','Ver registro','secondary');button.onclick=()=>safely(()=>openRecord(r.id));row.append(body,button);list.append(row);
 }
 if(!list.childElementCount)list.append(el('p','No hay emergencias dentro del rango.','empty'));
 const rows=report.bomberos.map(p=>[p.nombre,p.cargo,p.validadas,p.pendientes,p.devueltas]);
 $('totals').replaceChildren(makeTable(['Bombero','Cargo','Validadas','Pendientes','Devueltas'],rows));
}
function makeTable(headings,rows){
 const table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr'),body=document.createElement('tbody');
 for(const heading of headings)head.append(el('th',heading));thead.append(head);
 for(const cells of rows){const row=document.createElement('tr');for(const value of cells)row.append(el('td',String(value)));body.append(row);}
 table.append(thead,body);return table;
}
function summaryData(data){
 if(!data)return 'Sin registro previo';
 const lines=[];
 if(data.estado)lines.push('Estado: '+data.estado);
 if(data.fecha)lines.push('Fecha: '+dateLabel(data.fecha));
 if(data.clave)lines.push('Clave: '+data.clave);
 if(data.responsable)lines.push('Responsable: '+name(data.responsable));
 if(data.asistentes)lines.push('Asistentes: '+data.asistentes.map(name).join(', '));
 if('observaciones' in data)lines.push('Observaciones: '+(data.observaciones||'Sin observaciones'));
 return lines.join('\n');
}
function openRecord(id){
 detail=demo.api('detalle',{id});$('detail').hidden=false;
 const host=$('detailContent');host.replaceChildren();
 host.append(el('span',detail.estado,'badge '+detail.estado),el('h3',detail.clave+' · '+dateLabel(detail.fecha)),el('p','Responsable: '+detail.responsable_nombre),el('p','Declaración: el creador declara haber estado a cargo de la emergencia.','muted'),el('h3','Asistentes ('+detail.asistentes.length+')'));
 const ul=el('ul','','list');for(const n of detail.asistentes_nombres)ul.append(el('li',n));host.append(ul,el('h3','Observaciones y novedades'),el('p',detail.observaciones||'Sin observaciones.','obs'));
 const canReview=detail.estado==='PENDIENTE'&&detail.responsable!==state.usuario.id;
 $('reviewActions').hidden=!canReview;$('reviewLock').hidden=canReview;
 $('reviewLock').textContent=detail.responsable===state.usuario.id?'Otro ayudante debe revisar el registro que tú creaste.':'Este registro no está pendiente. No se puede sobrescribir una validación ni una devolución.';
 $('returnReason').value='';
 const history=$('history');history.replaceChildren();
 for(const h of [...detail.historial].reverse()){
  const item=el('article','','history-item');item.append(el('strong',h.accion+' · '+h.actor),el('p',timestamp(h.fecha),'muted'));
  if(h.motivo)item.append(el('p','Indicación: '+h.motivo,'obs'));
  item.append(el('p','Antes','detail-label'),el('pre',summaryData(h.antes)),el('p','Después','detail-label'),el('pre',summaryData(h.despues)));history.append(item);
 }
 $('detail').scrollIntoView({behavior:'smooth',block:'start'});
}
function review(action){
 if(!detail)return;
 const id=detail.id;
 demo.api(action,{id,version:detail.version,motivo:$('returnReason').value});
 loadIdentity();refreshReport();openRecord(id);
 message(action==='validar'?'Registro validado en la demo.':'Solicitud de corrección preparada para el responsable.');
}
function csvCell(value){
 let s=String(value??'');
 if(/^[\s]*[=+@-]/.test(s)||/^[\t\r]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function exportCSV(kind){
 const data=demo.api('informe',filters());
 const rows=kind==='emergencias'?
 [['Fecha','Clave','Responsable','Estado','Cantidad de asistentes','Asistentes','Observaciones'],...data.registros.map(r=>[r.fecha,r.clave,r.responsable_nombre,r.estado,r.asistentes.length,r.asistentes_nombres.join(' | '),r.observaciones])]:
 [['Bombero','Cargo','Asistencias validadas','Pendientes','Devueltas'],...data.bomberos.map(p=>[p.nombre,p.cargo,p.validadas,p.pendientes,p.devueltas])];
 const content='\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
 const blob=new Blob([content],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='DEMO-'+kind+'-'+($('from').value||'inicio')+'-'+($('to').value||'fin')+'.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 message('CSV de demostración generado. Contiene únicamente datos ficticios del rango seleccionado.');
}
for(const p of demo.roles){const option=el('option',p.nombre+' · '+p.cargo+' (demo)');option.value=p.id;$('role').append(option);}
$('role').onchange=()=>safely(()=>{
 if(($('code').value||$('notes').value||correction)&&!window.confirm('¿Cambiar de persona y descartar el formulario sin enviar?')){$('role').value=state.usuario.id;return;}
 demo.switchRole($('role').value);detail=null;report=null;$('detailContent').replaceChildren();$('history').replaceChildren();$('recordList').replaceChildren();$('totals').replaceChildren();$('stats').replaceChildren();$('detail').hidden=true;
 loadIdentity();resetForm();selectTab('new');
});
$('reset').onclick=()=>{if(window.confirm('¿Borrar los cambios ficticios y restaurar los ejemplos de la demo?')){demo.reset();$('role').value='voluntario';detail=null;report=null;loadIdentity();resetForm();$('from').value='';$('to').value='';$('detailContent').replaceChildren();$('history').replaceChildren();$('recordList').replaceChildren();$('totals').replaceChildren();$('stats').replaceChildren();$('detail').hidden=true;selectTab('new');message('Demo reiniciada.');}};
$('navNew').onclick=()=>safely(()=>selectTab('new'));$('navReview').onclick=()=>safely(()=>selectTab('review'));$('navNotices').onclick=()=>safely(()=>selectTab('notices'));
$('searchPeople').oninput=renderPeople;$('cancelCorrection').onclick=()=>{resetForm();message('Corrección cancelada. Puedes retomarla desde la solicitud.');};
$('recordForm').onsubmit=e=>{e.preventDefault();safely(()=>{
 demo.api('enviar',{fecha:$('date').value,clave:$('code').value,asistentes:[...selected],observaciones:$('notes').value,declaracion:$('declaration').checked,solicitud:correction});
 loadIdentity();resetForm();$('receipt').hidden=false;
 message('Registro recibido. Los avisos y correos son simulados.');
 $('receipt').scrollIntoView({behavior:'smooth',block:'start'});
});};
$('filterForm').onsubmit=e=>{e.preventDefault();safely(()=>{refreshReport();message('Consulta actualizada.');});};
$('validate').onclick=()=>safely(()=>review('validar'));$('return').onclick=()=>safely(()=>review('devolver'));
$('exportEmergencies').onclick=()=>safely(()=>exportCSV('emergencias'));$('exportPeople').onclick=()=>safely(()=>exportCSV('asistencias'));
loadIdentity();resetForm();selectTab('new');
