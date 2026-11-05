-- Independent visitor registrations. Never store response data in this repository.
create schema if not exists registro_visitas_privado;
revoke all on schema registro_visitas_privado from public, anon, authenticated;
grant usage on schema registro_visitas_privado to anon, authenticated;

create function registro_visitas_privado.rut_valido(valor text) returns boolean
language plpgsql immutable set search_path='' as $$
declare limpio text:=upper(replace(replace(coalesce(valor,''),'.',''),'-','')); suma integer:=0; factor integer:=2; i integer; dv integer;
begin
 if limpio !~ '^[0-9]{7,8}[0-9K]$' or left(limpio,length(limpio)-1)::bigint=0 then return false; end if;
 for i in reverse length(limpio)-1..1 loop
   suma:=suma+substr(limpio,i,1)::integer*factor; factor:=case when factor=7 then 2 else factor+1 end;
 end loop;
 dv:=11-(suma%11);
 return right(limpio,1)=case when dv=11 then '0' when dv=10 then 'K' else dv::text end;
end $$;

create table registro_visitas_privado.inscripciones (
 id uuid primary key,
 creado_en timestamptz not null default clock_timestamp(),
 titular_nombre text not null check(length(titular_nombre) between 2 and 100),
 titular_rut text not null check(registro_visitas_privado.rut_valido(titular_rut)),
 patente text check(patente is null or patente ~ '^([A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2}|[A-Z]{3}[0-9]{3})$'),
 acompanantes jsonb not null check(jsonb_typeof(acompanantes)='array' and jsonb_array_length(acompanantes)<=10),
 aviso_version text not null default '2026-11-05',
 origen_hash text not null
);
create index visitas_fecha_id on registro_visitas_privado.inscripciones(creado_en,id);
create index visitas_origen_fecha on registro_visitas_privado.inscripciones(origen_hash,creado_en);
alter table registro_visitas_privado.inscripciones enable row level security;
revoke all on registro_visitas_privado.inscripciones from public,anon,authenticated;

create table registro_visitas_privado.accesos (
 id bigint generated always as identity primary key,
 actor uuid not null,
 fecha timestamptz not null default clock_timestamp(),
 accion text not null,
 cantidad integer not null
);
alter table registro_visitas_privado.accesos enable row level security;
revoke all on registro_visitas_privado.accesos from public,anon,authenticated;

-- Deliberate public WRITE boundary: accepts validated registrations, never reads PII
-- back to a visitor. Private table access remains revoked and protected by RLS.
create function registro_visitas_privado.enviar(p_datos jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare clave uuid; nombre text; rut text; placa text; invitados jsonb:='[]'; persona jsonb; normal jsonb; item_rut text; item_nombre text;
 actual registro_visitas_privado.inscripciones%rowtype; cabeceras jsonb; origen text; vistos text[];
begin
 if p_datos is null or octet_length(p_datos::text)>12000 or jsonb_typeof(p_datos)<>'object' then raise exception 'Formulario no válido.' using errcode='22023'; end if;
 if p_datos->'consentimiento' is distinct from 'true'::jsonb then raise exception 'Debes aceptar el aviso de uso de datos.' using errcode='22023'; end if;
 clave:=(p_datos->>'id')::uuid;
 if clave is null then raise exception 'Falta el identificador del envío.' using errcode='22023'; end if;
 nombre:=trim(p_datos->>'nombre');
 rut:=upper(replace(replace(trim(p_datos->>'rut'),'.',''),'-',''));
 if nombre is null or length(nombre) not between 2 and 100 or not registro_visitas_privado.rut_valido(rut) then raise exception 'Revisa el nombre y RUT del titular.' using errcode='22023'; end if;
 placa:=nullif(upper(regexp_replace(coalesce(p_datos->>'patente',''),'[ -]','','g')),'');
 if placa is not null and placa !~ '^([A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2}|[A-Z]{3}[0-9]{3})$' then raise exception 'Revisa el formato de la patente.' using errcode='22023'; end if;
 if jsonb_typeof(p_datos->'acompanantes') is distinct from 'array' or jsonb_array_length(p_datos->'acompanantes')>10 then raise exception 'Se admiten hasta 10 acompañantes.' using errcode='22023'; end if;
 vistos:=array[rut];
 for persona in select value from jsonb_array_elements(p_datos->'acompanantes') loop
  item_nombre:=trim(persona->>'nombre'); item_rut:=upper(replace(replace(trim(persona->>'rut'),'.',''),'-',''));
  if item_nombre is null or length(item_nombre) not between 2 and 100 or not registro_visitas_privado.rut_valido(item_rut) or item_rut=any(vistos) then raise exception 'Revisa nombres y RUT de acompañantes; no repitas personas.' using errcode='22023'; end if;
  vistos:=array_append(vistos,item_rut);
  invitados:=invitados||jsonb_build_array(jsonb_build_object('nombre',item_nombre,'rut',item_rut));
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(clave::text,0));
 select * into actual from registro_visitas_privado.inscripciones where id=clave;
 if found then
   if actual.titular_nombre is distinct from nombre or actual.titular_rut is distinct from rut or actual.patente is distinct from placa or actual.acompanantes is distinct from invitados then raise exception 'Este identificador ya fue utilizado. Actualiza la página para un nuevo registro.' using errcode='22023'; end if;
   return jsonb_build_object('id',actual.id,'creado_en',actual.creado_en,'personas',1+jsonb_array_length(actual.acompanantes),'vehiculos',case when actual.patente is null then 0 else 1 end);
 end if;
 cabeceras:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 origen:=md5(coalesce(cabeceras->>'cf-connecting-ip',split_part(cabeceras->>'x-forwarded-for',',',1),'sin-origen')||current_date::text);
 perform pg_advisory_xact_lock(hashtextextended(origen,1));
 if (select count(*) from registro_visitas_privado.inscripciones where origen_hash=origen and creado_en>clock_timestamp()-interval '10 minutes')>=30 then raise exception 'Demasiados envíos desde esta conexión. Espera unos minutos.' using errcode='P0001'; end if;
 insert into registro_visitas_privado.inscripciones(id,titular_nombre,titular_rut,patente,acompanantes,origen_hash)
 values(clave,nombre,rut,placa,invitados,origen) returning * into actual;
 return jsonb_build_object('id',actual.id,'creado_en',actual.creado_en,'personas',1+jsonb_array_length(invitados),'vehiculos',case when placa is null then 0 else 1 end);
end $$;

-- All administrative reads recheck the live, server-owned authorization roster.
create function registro_visitas_privado.consultar(p_filtros jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor_id uuid:=auth.uid(); perfil public.voluntarios_autorizados%rowtype;
 desde timestamptz; hasta timestamptz; corte timestamptz; cursor_fecha timestamptz; cursor_id uuid; filas jsonb; cantidad integer;
begin
 if actor_id is null then raise exception 'Inicia sesión para consultar registros.' using errcode='42501'; end if;
 select * into perfil from public.voluntarios_autorizados where user_id=actor_id and habilitado;
 if not found or coalesce(perfil.cargo,'') not in ('CAPITÁN','TENIENTE PRIMERO','AYUDANTE') then raise exception 'Tu cuenta no tiene permiso para consultar o descargar inscripciones.' using errcode='42501'; end if;
 desde:=coalesce(((p_filtros->>'desde')::date::timestamp at time zone 'America/Santiago'),'2000-01-01'::timestamptz);
 hasta:=coalesce((((p_filtros->>'hasta')::date+1)::timestamp at time zone 'America/Santiago'),'2100-01-01'::timestamptz);
 corte:=least(coalesce((p_filtros->>'corte')::timestamptz,clock_timestamp()),clock_timestamp());
 cursor_fecha:=(p_filtros->>'cursor_fecha')::timestamptz; cursor_id:=(p_filtros->>'cursor_id')::uuid;
 if hasta<=desde or (cursor_fecha is null)<>(cursor_id is null) then raise exception 'Revisa el rango de fechas.' using errcode='22023'; end if;
 select coalesce(jsonb_agg(x order by x.creado_en,x.id),'[]'::jsonb) into filas from (
  select id,creado_en,titular_nombre,titular_rut,patente,acompanantes
  from registro_visitas_privado.inscripciones
  where creado_en>=desde and creado_en<hasta and creado_en<=corte
  and (cursor_fecha is null or (creado_en,id)>(cursor_fecha,cursor_id))
  order by creado_en,id limit 500
 ) x;
 cantidad:=jsonb_array_length(filas);
 insert into registro_visitas_privado.accesos(actor,accion,cantidad) values(actor_id,case when p_filtros->>'exportar'='true' then 'EXPORTAR' else 'CONSULTAR' end,cantidad);
 return jsonb_build_object('filas',filas,'corte',corte,'nombre',perfil.nombre,'cargo',perfil.cargo,'mas',cantidad=500);
end $$;

revoke all on all functions in schema registro_visitas_privado from public,anon,authenticated;
grant execute on function registro_visitas_privado.enviar(jsonb) to anon,authenticated;
grant execute on function registro_visitas_privado.consultar(jsonb) to authenticated;
create function public.registro_visitas_enviar(p_datos jsonb) returns jsonb language sql security invoker set search_path='' as $$ select registro_visitas_privado.enviar(p_datos) $$;
create function public.registro_visitas_consultar(p_filtros jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select registro_visitas_privado.consultar(p_filtros) $$;
revoke all on function public.registro_visitas_enviar(jsonb) from public,anon,authenticated;
revoke all on function public.registro_visitas_consultar(jsonb) from public,anon,authenticated;
grant execute on function public.registro_visitas_enviar(jsonb) to anon,authenticated;
grant execute on function public.registro_visitas_consultar(jsonb) to authenticated;
notify pgrst,'reload schema';
