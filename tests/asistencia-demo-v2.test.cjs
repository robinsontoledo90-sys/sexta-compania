const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),engine=fs.readFileSync(path.join(root,'js/asistencia-demo-engine.js'),'utf8');
const context=vm.createContext({});vm.runInContext(engine,context);
const demo=context.asistenciaDemo,api=(a,d)=>demo.api(a,d);
const date=new Date(),today=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const form={fecha:today,clave:'PRUEBA-ABC',asistentes:['voluntario','voluntaria'],observaciones:'Primera versión',declaracion:true};
assert.throws(()=>api('enviar',{...form,declaracion:false}),/declarar/);
assert.throws(()=>api('enviar',{...form,asistentes:['voluntaria']}),/Inclúyete/);
assert.throws(()=>api('enviar',{...form,fecha:'2026-02-30'}),/válida/);
const ack=api('enviar',form);assert.deepEqual(Object.keys(ack),['recibido']);
assert.throws(()=>api('consulta'),/exclusivas/);assert.throws(()=>api('detalle',{id:'demo-1'}),/exclusivas/);assert.throws(()=>api('informe'),/exclusivas/);
assert.equal(api('inicio').avisos.length,0);
for(const role of demo.roles.filter(p=>p.oficial&&p.cargo!=='AYUDANTE')){
 demo.switchRole(role.id);const home=api('inicio');assert.ok(home.avisos.length);
 for(const n of home.avisos){assert.equal(n.texto,'Se ingresó un registro de emergencia.');assert.deepEqual(Object.keys(n).sort(),['correo','fecha','para','texto']);}
 assert.throws(()=>api('consulta'),/exclusivas/);assert.throws(()=>api('informe'),/exclusivas/);
}
demo.switchRole('ayudante');let list=api('consulta');let r=list.find(r=>r.clave==='PRUEBA-ABC');assert.equal(r.responsable,'voluntario');assert.equal(r.estado,'PENDIENTE');
assert.throws(()=>api('devolver',{id:r.id,version:r.version,motivo:'x'}),/Describe/);
api('devolver',{id:r.id,version:r.version,motivo:'Corrige las observaciones e indica las novedades.'});
demo.switchRole('voluntaria');assert.equal(api('inicio').solicitudes.length,0);
demo.switchRole('voluntario');const ticket=api('inicio').solicitudes[0];assert.deepEqual(Object.keys(ticket).sort(),['id','mensaje']);
assert.throws(()=>api('detalle',{id:r.id}),/exclusivas/);
demo.switchRole('voluntaria');assert.throws(()=>api('enviar',{...form,asistentes:['voluntaria'],solicitud:ticket.id}),/solicitud/);
demo.switchRole('voluntario');api('enviar',{...form,observaciones:'Corrección registrada',solicitud:ticket.id});assert.equal(api('inicio').solicitudes.length,0);
assert.throws(()=>api('enviar',{...form,solicitud:ticket.id}),/solicitud/);
demo.switchRole('ayudante');r=api('detalle',{id:r.id});assert.equal(r.estado,'PENDIENTE');assert.equal(r.historial.length,3);assert.equal(r.historial[2].antes.observaciones,'Primera versión');
api('validar',{id:r.id,version:r.version});assert.throws(()=>api('devolver',{id:r.id,version:r.version}),/cambió/);
r=api('detalle',{id:r.id});assert.equal(r.estado,'VALIDADO');assert.equal(r.historial.length,4);
assert.throws(()=>api('devolver',{id:r.id,version:r.version,motivo:'No se permite'}),/pendientes/);
let report=api('informe',{desde:today,hasta:today});assert.equal(report.total,2);assert.equal(report.validados,1);assert.equal(report.pendientes,1);assert.equal(report.bomberos.find(p=>p.nombre==='Diego Soto').validadas,1);
assert.throws(()=>api('informe',{desde:'2026-12-01',hasta:'2026-01-01'}),/inicial/);
// The helper can create, but cannot approve their own declaration.
api('enviar',{...form,clave:'AYUDANTE-TEST',asistentes:['ayudante']});r=api('consulta').find(r=>r.clave==='AYUDANTE-TEST');
assert.throws(()=>api('validar',{id:r.id,version:r.version}),/Otro ayudante/);
demo.switchRole('ayudante2');api('validar',{id:r.id,version:r.version});
demo.switchRole('capitan');api('enviar',{...form,clave:'OFICIAL-TEST',asistentes:['capitan']});assert.throws(()=>api('consulta'),/exclusivas/);
demo.reset();demo.switchRole('ayudante');assert.equal(api('consulta').length,2);
const ui=fs.readFileSync(path.join(root,'js/asistencia-demo.js'),'utf8');
const csv=ui.slice(ui.indexOf('function csvCell'),ui.indexOf('function exportCSV'));vm.runInContext(csv,context);
assert.equal(vm.runInContext("csvCell('=SUM(1,2)')",context),'"\'=SUM(1,2)"');
assert.ok(!engine.includes('fetch(')&&!ui.includes('fetch('));
assert.ok(!fs.readFileSync(path.join(root,'asistencia-demo.html'),'utf8').includes('@supabase'));
console.log('PASS: declaración, identidad, privacidad, avisos genéricos, correcciones limitadas, historial, validación exclusiva, rango inclusivo, totales, fórmulas CSV, reinicio y aislamiento.');
