begin;
-- All fixtures and changes are rolled back. No credentials or real RUT are used.
insert into auth.users(id) values
 ('20000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000003'),('20000000-0000-4000-8000-000000000004');
insert into public.voluntarios_autorizados(user_id,nombre,cargo,habilitado) values
 ('20000000-0000-4000-8000-000000000001','PRUEBA AYUDANTE','AYUDANTE',true),
 ('20000000-0000-4000-8000-000000000002','PRUEBA VOLUNTARIO','VOLUNTARIO',true),
 ('20000000-0000-4000-8000-000000000003','PRUEBA CAPITAN','CAPITÁN',true),
 ('20000000-0000-4000-8000-000000000004','PRUEBA TENIENTE','TENIENTE PRIMERO',true);
set local role anon;
do $test$
declare p jsonb:=jsonb_build_object('id','20000000-0000-4000-8000-000000000010','nombre','PRUEBA FICTICIA','rut','11.111.111-1','patente','ABCD12','consentimiento',true,'acompanantes',jsonb_build_array(jsonb_build_object('nombre','ACOMPANANTE FICTICIO','rut','22222222-2'))); a jsonb; b jsonb;
begin
 a:=public.registro_visitas_enviar(p); b:=public.registro_visitas_enviar(p);
 if a<>b or a->>'personas'<>'2' or a->>'vehiculos'<>'1' or a ? 'titular_rut' or a ? 'acompanantes' then raise exception 'TEST FAIL: receipt or retry'; end if;
 begin perform public.registro_visitas_enviar(p||'{"nombre":"MODIFICADO"}');raise exception 'TEST FAIL: changed replay';exception when invalid_parameter_value then null;end;
 begin perform public.registro_visitas_enviar(p||'{"rut":"11111111-2"}');raise exception 'TEST FAIL: invalid RUT';exception when invalid_parameter_value then null;end;
 begin perform public.registro_visitas_enviar(p||'{"consentimiento":false}');raise exception 'TEST FAIL: no consent';exception when invalid_parameter_value then null;end;
 begin perform public.registro_visitas_enviar(p||'{"acompanantes":[{"nombre":"REPETIDO","rut":"11111111-1"}]}');raise exception 'TEST FAIL: repeated RUT';exception when invalid_parameter_value then null;end;
 begin perform public.registro_visitas_enviar(p||jsonb_build_object('acompanantes',(select jsonb_agg('{}'::jsonb) from generate_series(1,11))));raise exception 'TEST FAIL: too many guests';exception when invalid_parameter_value then null;end;
 begin perform public.registro_visitas_enviar(p||'{"patente":"BAD"}');raise exception 'TEST FAIL: bad plate';exception when invalid_parameter_value then null;end;
 begin perform public.registro_visitas_consultar();raise exception 'TEST FAIL: anonymous read';exception when insufficient_privilege then null;end;
 begin perform titular_rut from registro_visitas_privado.inscripciones;raise exception 'TEST FAIL: direct read';exception when insufficient_privilege then null;end;
 begin delete from registro_visitas_privado.inscripciones;raise exception 'TEST FAIL: delete';exception when insufficient_privilege then null;end;
 begin update registro_visitas_privado.inscripciones set titular_nombre='X';raise exception 'TEST FAIL: update';exception when insufficient_privilege then null;end;
end $test$;
reset role;
do $$begin if (select count(*) from registro_visitas_privado.inscripciones where id='20000000-0000-4000-8000-000000000010')<>1 then raise exception 'TEST FAIL: duplicate insert';end if;end$$;
insert into registro_visitas_privado.inscripciones(id,creado_en,titular_nombre,titular_rut,acompanantes,origen_hash)
select gen_random_uuid(),'2020-01-01 03:00:00+00'::timestamptz+g*interval '1 millisecond','FICTICIO PAGINACION','111111111','[]','test' from generate_series(1,501) g;
set local role authenticated;
do $test$
declare d jsonb; e jsonb; ultimo jsonb; uid text;
begin
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
 begin perform public.registro_visitas_consultar();raise exception 'TEST FAIL: unauthorized role';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
 d:=public.registro_visitas_consultar('{"desde":"2020-01-01","hasta":"2020-01-01","exportar":true}');
 if jsonb_array_length(d->'filas')<>500 or d->>'mas'<>'true' then raise exception 'TEST FAIL: page one';end if;
 ultimo:=(d->'filas')->499;
 e:=public.registro_visitas_consultar(jsonb_build_object('desde','2020-01-01','hasta','2020-01-01','corte',d->>'corte','cursor_fecha',ultimo->>'creado_en','cursor_id',ultimo->>'id','exportar',true));
 if jsonb_array_length(e->'filas')<>1 or e->>'mas'<>'false' then raise exception 'TEST FAIL: page two';end if;
 e:=public.registro_visitas_consultar('{"desde":"2019-12-31","hasta":"2019-12-31"}');
 if jsonb_array_length(e->'filas')<>0 then raise exception 'TEST FAIL: Chile date boundary';end if;
 foreach uid in array array['20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004'] loop
  perform set_config('request.jwt.claim.sub',uid,true);perform public.registro_visitas_consultar('{"desde":"2019-01-01","hasta":"2019-01-01"}');
 end loop;
 begin perform titular_rut from registro_visitas_privado.inscripciones;raise exception 'TEST FAIL: authenticated direct read';exception when insufficient_privilege then null;end;
end $test$;
reset role;
update public.voluntarios_autorizados set habilitado=false where user_id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
do $test$ begin
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
 begin perform public.registro_visitas_consultar();raise exception 'TEST FAIL: disabled reader';exception when insufficient_privilege then null;end;
end $test$;
reset role;
do $$begin if (select count(*) from registro_visitas_privado.accesos where actor='20000000-0000-4000-8000-000000000001')<>3 then raise exception 'TEST FAIL: read audit';end if;end$$;
rollback;
select 'PASS: persistence, idempotency, validation, privacy, roles, revocation, pagination, Chile dates and audit; all fixtures rolled back' as resultado;
