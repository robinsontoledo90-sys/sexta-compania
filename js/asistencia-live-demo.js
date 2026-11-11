/* Simulación en memoria: no utiliza red ni almacenamiento del sistema real. */
(function(){
'use strict';
const $=id=>document.getElementById(id), people=window.asistenciaDemo.roles;
const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
let activities, current, guestSequence=0;
const user=()=>people.find(p=>p.id===$('role').value);
const stamp=()=>new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
function reset(){activities=[{title:'DEMO · Emergencia 10-0',type:'Emergencia',instructor:'Oficial a cargo: Camila Díaz',date:new Date().toLocaleDateString('es-CL'),time:stamp(),closed:false,participants:[],guests:[]},{title:'DEMO · Academia de material y seguridad',type:'Academia',instructor:'Instructor: Alex Rojas',date:new Date().toLocaleDateString('es-CL'),time:stamp(),closed:false,participants:[],guests:[]}];current=0;$('liveGuests').replaceChildren();$('liveForm').reset();render();}
function render(){
 const p=user(),a=activities[current];
 $('liveIdentity').textContent=(p.oficial?'OFICIAL · Supervisión':'VOLUNTARIO · Mi participación')+' · '+p.nombre;
 $('liveIdentity').className=p.oficial?'profile official':'profile volunteer';
 $('liveMeta').textContent=a.type+' · '+a.date+' · '+a.time+' · '+a.instructor;
 $('liveTitle').textContent=a.title;$('liveStatus').textContent=a.closed?'ACTIVIDAD CERRADA':'EN CURSO · SIMULACIÓN';
 $('liveCount').textContent=a.participants.length+(a.participants.length===1?' bombero presente':' bomberos presentes');
 $('liveJoin').disabled=a.closed||a.participants.some(x=>x.id===p.id);
 $('liveJoin').textContent=a.participants.some(x=>x.id===p.id)?'Tu asistencia está registrada':'Registrar mi asistencia';
 $('liveClose').hidden=!p.oficial;$('liveClose').disabled=a.closed;
 $('liveExport').hidden=!p.oficial;$('liveGuestReview').hidden=!p.oficial;
 $('liveMine').textContent=a.participants.some(x=>x.id===p.id)?'Presente · '+a.participants.find(x=>x.id===p.id).time:'Aún no registras participación en esta actividad.';
 $('liveRoster').replaceChildren();
 for(const x of a.participants.filter(x=>p.oficial||x.id===p.id)){$('liveRoster').append(node('p',x.nombre+' · '+(x.oficial?'OFICIAL':'VOLUNTARIO')+' · Presente · '+x.time,x.oficial?'roster official':'roster volunteer'));}
 if(!$('liveRoster').childElementCount)$('liveRoster').append(node('p',p.oficial?'Sin asistencias todavía.':'Aquí verás tu propia asistencia.','muted'));
 $('liveGuestReview').replaceChildren(node('h3','Registros complementarios · '+a.guests.length));
 if(p.oficial)for(const g of a.guests)$('liveGuestReview').append(node('p',g.nombre+' · RUT '+g.rut+' · Patente: '+(g.patente||'Sin vehículo')+' · Acompañantes: '+(g.companions.map(x=>x.nombre+' ('+x.rut+')').join(', ')||'Sin acompañantes')));
 $('liveSubmit').disabled=a.closed;$('liveAdd').disabled=a.closed||$('liveGuests').children.length>=10;
 $('liveUpdated').textContent='Última actualización: '+stamp()+'. Cambios inmediatos en esta pestaña; sin sincronización entre dispositivos.';
}
function rut(value){const r=value.replace(/[.\-]/g,'').toUpperCase();if(!/^\d{7,8}[\dK]$/.test(r)||Number(r.slice(0,-1))===0)return false;let sum=0,f=2;for(let i=r.length-2;i>=0;i--){sum+=Number(r[i])*f;f=f===7?2:f+1;}const d=11-sum%11;return r.at(-1)===(d===11?'0':d===10?'K':String(d));}
function add(){if($('liveGuests').children.length>=10)return;const row=node('fieldset',''),id=++guestSequence;row.append(node('legend','Acompañante'));for(const [key,label] of [['name','Nombre completo'],['rut','RUT']]){const l=node('label',label),input=document.createElement('input');input.required=true;input.maxLength=key==='name'?100:12;input.dataset.field=key;input.id='guest-'+id+'-'+key;l.append(input);row.append(l);}const remove=node('button','Quitar acompañante','light');remove.type='button';remove.onclick=()=>{row.remove();render();};row.append(remove);$('liveGuests').append(row);render();row.querySelector('input').focus();}
 $('liveActivity').onchange=()=>{current=Number($('liveActivity').value);$('liveForm').reset();$('liveGuests').replaceChildren();$('liveFeedback').textContent='';render();};
 $('role').addEventListener('change',()=>{queueMicrotask(()=>{ $('liveForm').reset();$('liveGuests').replaceChildren();$('liveFeedback').textContent='';render();});});
 $('liveJoin').onclick=()=>{const a=activities[current],p=user();if(a.closed||a.participants.some(x=>x.id===p.id))return;a.participants.push({...p,time:stamp()});$('liveFeedback').textContent='Asistencia ficticia registrada. Cambia a un oficial para supervisarla.';render();};
 $('liveClose').onclick=()=>{if(!user().oficial)return;activities[current].closed=true;$('liveFeedback').textContent='Actividad ficticia cerrada. Reinicia la simulación para repetir el recorrido.';render();};
 $('liveReset').onclick=()=>{reset();$('liveFeedback').textContent='Simulación restaurada.';};
 $('liveAdd').onclick=add;
 $('liveForm').addEventListener('input',e=>e.target.setCustomValidity?.(''));
 $('liveForm').onsubmit=e=>{e.preventDefault();if(activities[current].closed)return;const names=[$('liveName'),...$('liveGuests').querySelectorAll('[data-field=name]')],ruts=[$('liveRut'),...$('liveGuests').querySelectorAll('[data-field=rut]')],seen=new Set();for(const n of names)n.setCustomValidity(n.value.trim().length<2?'Escribe nombre y apellidos.':'');for(const r of ruts){const normalized=r.value.replace(/[.\-]/g,'').toUpperCase();r.setCustomValidity(!rut(r.value)?'Revisa el RUT y su dígito verificador.':seen.has(normalized)?'RUT repetido en este grupo.':'');seen.add(normalized);}const plate=$('livePlate'),v=plate.value.toUpperCase().replace(/[ -]/g,'');plate.setCustomValidity(v&&!/^([A-Z]{2}\d{4}|[A-Z]{4}\d{2}|[A-Z]{3}\d{3})$/.test(v)?'Revisa el formato de la patente.':'');if(!$('liveForm').reportValidity())return;activities[current].guests.push({nombre:names[0].value.trim(),rut:ruts[0].value,patente:v,companions:names.slice(1).map((n,i)=>({nombre:n.value.trim(),rut:ruts[i+1].value}))});$('liveForm').reset();$('liveGuests').replaceChildren();$('liveFeedback').textContent='Grupo recibido en la simulación. El oficial puede revisarlo; no se cuenta como dotación bomberil.';render();};
 $('liveExport').onclick=()=>{if(!user().oficial)return;const a=activities[current],cell=s=>'"'+String(s).replace(/^[\s]*[=+@-]/,"'").replace(/"/g,'""')+'"',rows=[['Actividad','Tipo','Fecha','Hora actividad','Instructor / responsable','Nombre','Perfil','Hora asistencia','Estado'],...a.participants.map(p=>[a.title,a.type,a.date,a.time,a.instructor,p.nombre,p.oficial?'Oficial':'Voluntario',p.time,'Presente'])];const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='DEMO-asistencia-en-vivo.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 reset();
})();
