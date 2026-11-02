
-- Attendance data is private; only the validated API can read or write it.
create schema if not exists asistencia_privada;
revoke all on schema asistencia_privada from public, anon, authenticated;
grant usage on schema asistencia_privada to authenticated;
create table asistencia_privada.actividades (
 id uuid primary key default gen_random_uuid(),
 titulo text not null check(length(trim(titulo)) between 3 and 160),
 tipo text not null check(tipo in ('EMERGENCIA','EJERCICIO','REUNIÓN','GUARDIA','OTRA')),
 fecha timestamptz not null,
 encargado uuid not null references public.voluntarios_autorizados(user_id),
 creada_por uuid not null references public.voluntarios_autorizados(user_id),
 creada_en timestamptz not null default now(),
 cerrada_en timestamptz,
 version integer not null default 1
);
create table asistencia_privada.registros (
 actividad uuid not null references asistencia_privada.actividades(id),
 voluntario uuid not null references public.voluntarios_autorizados(user_id),
 estado text not null check(estado in ('PRESENTE','AUSENTE','JUSTIFICADO')),
 registrado_por uuid not null references public.voluntarios_autorizados(user_id),
 registrado_en timestamptz not null default now(),
 primary key(actividad,voluntario),
 check(voluntario <> registrado_por)
);
create table asistencia_privada.historial (
 id uuid primary key default gen_random_uuid(),
 actividad uuid not null references asistencia_privada.actividades(id),
 actor uuid not null,
 actor_nombre text not null,
 accion text not null,
 antes jsonb,
 despues jsonb,
 motivo text not null default '',
 fecha timestamptz not null default now()
);
create index on asistencia_privada.actividades(fecha desc);
create index on asistencia_privada.historial(actividad,fecha);
alter table asistencia_privada.actividades enable row level security;
alter table asistencia_privada.registros enable row level security;
alter table asistencia_privada.historial enable row level security;
revoke all on all tables in schema asistencia_privada from public,anon,authenticated;
-- Definer is intentionally private: atomic authorization, locking and immutable audit
-- cannot be achieved by granting unrestricted table writes to clients.
create function asistencia_privada.api(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid := auth.uid(); perfil public.voluntarios_autorizados%rowtype;
 mando boolean; a asistencia_privada.actividades%rowtype;
 target uuid; estado text; motivo text; antes jsonb; despues jsonb;
 result jsonb; actividad_id uuid; nombre text;
begin
 if u is null then raise exception 'Debes iniciar sesión.' using errcode='42501'; end if;
 select * into perfil from public.voluntarios_autorizados where user_id=u and habilitado;
 if not found then raise exception 'Cuenta no autorizada.' using errcode='42501'; end if;
 mando := perfil.cargo in ('CAPITÁN','TENIENTE PRIMERO','TENIENTE SEGUNDO','TENIENTE TERCERO','TENIENTE CUARTO');
 nombre := coalesce(perfil.nombre,perfil.cargo);
 if p_action='inicio' then
   select coalesce(jsonb_agg(x order by x.fecha desc),'[]'::jsonb) into result from (
     select a.id,a.titulo,a.tipo,a.fecha,a.encargado,a.cerrada_en,a.version,
       coalesce(v.nombre,v.cargo) as encargado_nombre,
       r.estado as mi_estado
     from asistencia_privada.actividades a
     join public.voluntarios_autorizados v on v.user_id=a.encargado
     left join asistencia_privada.registros r on r.actividad=a.id and r.voluntario=u
     order by a.fecha desc limit 200
   ) x;
   return jsonb_build_object('usuario',u,'nombre',nombre,'cargo',perfil.cargo,'mando',mando,'actividades',result);
 end if;
 if p_action='personas' then
   if not mando then raise exception 'Solo capitán y tenientes pueden designar encargados.' using errcode='42501'; end if;
   select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'nombre',coalesce(v.nombre,v.cargo),'cargo',cargo) order by v.nombre),'[]') into result
   from public.voluntarios_autorizados v where habilitado;
   return result;
 end if;
 if p_action='crear' then
   if not mando then raise exception 'Solo capitán y tenientes pueden crear actividades.' using errcode='42501'; end if;
   target := (p_data->>'encargado')::uuid;
   if not exists(select 1 from public.voluntarios_autorizados where user_id=target and habilitado) then
     raise exception 'El encargado debe tener una cuenta habilitada.';
   end if;
   insert into asistencia_privada.actividades(titulo,tipo,fecha,encargado,creada_por)
   values(trim(p_data->>'titulo'),p_data->>'tipo',(p_data->>'fecha')::timestamptz,target,u)
   returning * into a;
   insert into asistencia_privada.historial(actividad,actor,actor_nombre,accion,despues)
   values(a.id,u,nombre,'CREAR',to_jsonb(a));
   return to_jsonb(a);
 end if;
 actividad_id := (p_data->>'actividad')::uuid;
 -- All mutations and reads of a list serialize against its close/reassignment.
 select * into a from asistencia_privada.actividades where id=actividad_id for update;
 if not found then raise exception 'Actividad no encontrada.'; end if;
 if not (mando or a.encargado=u) then
   raise exception 'Esta actividad no está a tu cargo.' using errcode='42501';
 end if;
 if p_action='detalle' then
   select coalesce(jsonb_agg(jsonb_build_object(
     'id',v.user_id,'nombre',coalesce(v.nombre,v.cargo),'cargo',v.cargo,
     'habilitado',v.habilitado,'estado',r.estado,'registrado_en',r.registrado_en,
     'registrado_por',coalesce(autor.nombre,autor.cargo)) order by v.nombre),'[]') into result
   from public.voluntarios_autorizados v
   left join asistencia_privada.registros r on r.voluntario=v.user_id and r.actividad=a.id
   left join public.voluntarios_autorizados autor on autor.user_id=r.registrado_por
   where v.habilitado or r.voluntario is not null;
   return jsonb_build_object('actividad',to_jsonb(a),'personas',result,'historial',
     (select coalesce(jsonb_agg(h order by h.fecha desc),'[]') from (
       select log.actor_nombre,log.accion,log.antes,log.despues,log.motivo,log.fecha from asistencia_privada.historial log where log.actividad=a.id
       order by log.fecha desc limit 300
     ) h));
 end if;
 if (p_data->>'version')::integer is distinct from a.version then
   raise exception 'La lista cambió. Actualiza antes de guardar.' using errcode='40001';
 end if;
 motivo := trim(coalesce(p_data->>'motivo',''));
 if length(motivo)>500 then raise exception 'El motivo admite hasta 500 caracteres.'; end if;
 if p_action='designar' then
   if not mando then raise exception 'Solo capitán y tenientes pueden designar encargados.' using errcode='42501'; end if;
   if a.cerrada_en is not null then raise exception 'La actividad ya está cerrada.'; end if;
   target := (p_data->>'encargado')::uuid;
   if not exists(select 1 from public.voluntarios_autorizados where user_id=target and habilitado) then raise exception 'Encargado no habilitado.'; end if;
   antes:=jsonb_build_object('encargado',a.encargado);
   update asistencia_privada.actividades set encargado=target,version=version+1 where id=a.id;
   despues:=jsonb_build_object('encargado',target);
 elsif p_action='marcar' then
   target:=(p_data->>'voluntario')::uuid; estado:=p_data->>'estado';
   if target=u then raise exception 'No puedes registrar ni corregir tu propia asistencia. Debe validarla otro responsable.' using errcode='42501'; end if;
   if a.cerrada_en is not null and not mando then raise exception 'La lista está cerrada. Solo capitán y tenientes pueden corregirla.' using errcode='42501'; end if;
   if not exists(select 1 from public.voluntarios_autorizados where user_id=target and habilitado) then raise exception 'Voluntario no habilitado.'; end if;
   if estado is null or estado not in ('PRESENTE','AUSENTE','JUSTIFICADO') then raise exception 'Estado no válido.'; end if;
   select to_jsonb(r) into antes from asistencia_privada.registros r where actividad=a.id and voluntario=target;
   if (antes is not null or a.cerrada_en is not null) and length(motivo)<5 then
      raise exception 'Explica el motivo de la corrección (mínimo 5 caracteres).';
   end if;
   insert into asistencia_privada.registros(actividad,voluntario,estado,registrado_por)
   values(a.id,target,estado,u)
   on conflict(actividad,voluntario) do update set estado=excluded.estado,registrado_por=u,registrado_en=now()
   returning to_jsonb(registros.*) into despues;
   update asistencia_privada.actividades set version=version+1 where id=a.id;
 elsif p_action='cerrar' then
   if a.cerrada_en is not null then raise exception 'La lista ya está cerrada.'; end if;
   antes:=to_jsonb(a);
   update asistencia_privada.actividades set cerrada_en=now(),version=version+1 where id=a.id returning to_jsonb(actividades.*) into despues;
 else
   raise exception 'Acción no válida.';
 end if;
 insert into asistencia_privada.historial(actividad,actor,actor_nombre,accion,antes,despues,motivo)
 values(a.id,u,nombre,case when p_action='marcar' and (antes is not null or a.cerrada_en is not null) then 'CORREGIR' else upper(p_action) end,antes,despues,motivo);
 return jsonb_build_object('ok',true,'actividad',a.id);
end $$;
revoke all on function asistencia_privada.api(text,jsonb) from public,anon,authenticated;
grant execute on function asistencia_privada.api(text,jsonb) to authenticated;
create function public.asistencia_api(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path=''
as $$ select asistencia_privada.api(p_action,p_data) $$;
revoke all on function public.asistencia_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.asistencia_api(text,jsonb) to authenticated;
create policy sin_acceso_directo on asistencia_privada.actividades for all to authenticated using(false) with check(false);
create policy sin_acceso_directo on asistencia_privada.registros for all to authenticated using(false) with check(false);
create policy sin_acceso_directo on asistencia_privada.historial for all to authenticated using(false) with check(false);