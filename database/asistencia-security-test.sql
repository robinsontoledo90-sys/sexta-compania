
begin;
-- Fixtures exist only inside this rolled-back transaction; no login credentials.
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000003'),
 ('10000000-0000-4000-8000-000000000004');
insert into public.voluntarios_autorizados(user_id,nombre,cargo) values
 ('10000000-0000-4000-8000-000000000001','Prueba capitán','CAPITÁN'),
 ('10000000-0000-4000-8000-000000000002','Prueba encargado','VOLUNTARIO'),
 ('10000000-0000-4000-8000-000000000003','Prueba participante','VOLUNTARIO'),
 ('10000000-0000-4000-8000-000000000004','Prueba teniente','TENIENTE PRIMERO');
set local role authenticated;
do $test$
declare
 cap text:='10000000-0000-4000-8000-000000000001';
 enc text:='10000000-0000-4000-8000-000000000002';
 vol text:='10000000-0000-4000-8000-000000000003';
 ten text:='10000000-0000-4000-8000-000000000004';
 a jsonb; b jsonb; d jsonb; aid text;
begin
 perform set_config('request.jwt.claim.sub',cap,true);
 a:=public.asistencia_api('crear',jsonb_build_object('titulo','PRUEBA TRANSACCIONAL','tipo','EJERCICIO','fecha',now(),'encargado',enc));
 aid:=a->>'id';
 b:=public.asistencia_api('crear',jsonb_build_object('titulo','OTRA ACTIVIDAD','tipo','REUNIÓN','fecha',now(),'encargado',cap));
 perform set_config('request.jwt.claim.sub',vol,true);
 begin
  perform public.asistencia_api('marcar',jsonb_build_object('actividad',aid,'version',1,'voluntario',vol,'estado','PRESENTE'));
  raise exception 'TEST FAIL: no asignado pudo marcar';
 exception when insufficient_privilege then null; end;
 begin
  perform public.asistencia_api('personas');
  raise exception 'TEST FAIL: voluntario leyó padrón';
 exception when insufficient_privilege then null; end;
 begin
  execute 'insert into asistencia_privada.registros(actividad,voluntario,estado,registrado_por) values ($1,$2,''PRESENTE'',$3)' using aid::uuid,vol::uuid,enc::uuid;
  raise exception 'TEST FAIL: escritura directa';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',enc,true);
 begin
  perform public.asistencia_api('crear',jsonb_build_object('titulo','ILEGAL','tipo','EJERCICIO','fecha',now(),'encargado',enc));
  raise exception 'TEST FAIL: encargado crea';
 exception when insufficient_privilege then null; end;
 begin
  perform public.asistencia_api('detalle',jsonb_build_object('actividad',b->>'id'));
  raise exception 'TEST FAIL: encargado consulta otra lista';
 exception when insufficient_privilege then null; end;
 begin
  perform public.asistencia_api('marcar',jsonb_build_object('actividad',aid,'version',1,'voluntario',enc,'estado','PRESENTE'));
  raise exception 'TEST FAIL: autoasistencia';
 exception when insufficient_privilege then null; end;
 begin
  perform public.asistencia_api('designar',jsonb_build_object('actividad',aid,'version',1,'encargado',vol));
  raise exception 'TEST FAIL: encargado delega';
 exception when insufficient_privilege then null; end;
 perform public.asistencia_api('marcar',jsonb_build_object('actividad',aid,'version',1,'voluntario',vol,'estado','PRESENTE'));
 begin
  perform public.asistencia_api('cerrar',jsonb_build_object('actividad',aid,'version',1));
  raise exception 'TEST FAIL: versión antigua';
 exception when serialization_failure then null; end;
 perform public.asistencia_api('cerrar',jsonb_build_object('actividad',aid,'version',2));
 begin
  perform public.asistencia_api('marcar',jsonb_build_object('actividad',aid,'version',3,'voluntario',vol,'estado','AUSENTE','motivo','Prueba de bloqueo'));
  raise exception 'TEST FAIL: encargado edita cerrada';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',ten,true);
 begin
  perform public.asistencia_api('marcar',jsonb_build_object('actividad',aid,'version',3,'voluntario',vol,'estado','AUSENTE'));
  raise exception 'TEST FAIL: corrección sin motivo';
 exception when raise_exception then
  if sqlerrm like 'TEST FAIL%' then raise; end if;
 end;
 perform public.asistencia_api('marcar',jsonb_build_object('actividad',aid,'version',3,'voluntario',vol,'estado','JUSTIFICADO','motivo','Corrección verificada'));
 perform public.asistencia_api('marcar',jsonb_build_object('actividad',aid,'version',4,'voluntario',enc,'estado','PRESENTE','motivo','Validado por teniente'));
 d:=public.asistencia_api('detalle',jsonb_build_object('actividad',aid));
 if jsonb_array_length(d->'historial')<>5 then raise exception 'TEST FAIL: auditoría incompleta'; end if;
 if (d->'actividad'->>'version')::integer<>5 then raise exception 'TEST FAIL: version'; end if;
 -- A commander is also forbidden from validating themself.
 begin
  perform public.asistencia_api('marcar',jsonb_build_object('actividad',aid,'version',5,'voluntario',ten,'estado','PRESENTE','motivo','No permitido'));
  raise exception 'TEST FAIL: mando se marca';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',cap,true);
 perform public.asistencia_api('designar',jsonb_build_object('actividad',b->>'id','version',1,'encargado',enc));
 perform public.asistencia_api('designar',jsonb_build_object('actividad',b->>'id','version',2,'encargado',ten));
 perform set_config('request.jwt.claim.sub',enc,true);
 begin
  perform public.asistencia_api('detalle',jsonb_build_object('actividad',b->>'id'));
  raise exception 'TEST FAIL: encargado conserva permiso revocado';
 exception when insufficient_privilege then null; end;
end $test$;
reset role;
update public.voluntarios_autorizados set habilitado=false where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
do $test$ begin
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 begin perform public.asistencia_api('inicio');raise exception 'TEST FAIL: cuenta deshabilitada';
 exception when insufficient_privilege then null; end;
end $test$;
reset role;
set local role anon;
do $test$ begin
 begin perform public.asistencia_api('inicio');raise exception 'TEST FAIL: acceso anónimo';
 exception when insufficient_privilege then null; end;
end $test$;
reset role;
select 'PASS: roles, autoasistencia, escritura directa, ámbito, cierre, correcciones, auditoría, versión, revocación, cuenta deshabilitada y anónimo' as resultado;
rollback;
