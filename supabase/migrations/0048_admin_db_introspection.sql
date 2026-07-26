-- Superadmin Database Admin — schema introspection RPCs.
--
-- Powers the superadmin "Database" panel (view/edit/delete any record in any
-- public table). Row CRUD itself goes through PostgREST on the service-role
-- client; these functions only expose the schema metadata PostgREST cannot
-- (table list, columns, primary keys). SECURITY DEFINER + service_role-only.


-- ── List every base table in the public schema (with an approx row count) ──
create or replace function public.admin_list_tables()
returns table(table_name text, row_estimate bigint)
language sql
security definer
set search_path = public
as $$
  select c.relname::text as table_name,
         greatest(c.reltuples, 0)::bigint as row_estimate
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname;
$$;

revoke all on function public.admin_list_tables() from public, anon, authenticated;
grant execute on function public.admin_list_tables() to service_role;


-- ── Columns + primary key for one public table ─────────────────────────────
-- Returns { columns: [{name, dataType, udtName, isNullable, isIdentity,
-- isGenerated, default, ordinal}], primaryKey: [colName, ...] }.
-- Raises UNKNOWN_TABLE if the name is not a real public base table (guards the
-- caller against arbitrary / injected names).
create or replace function public.admin_table_columns(p_table text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_result json;
begin
  select exists(
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = p_table and c.relkind = 'r'
  ) into v_exists;

  if not v_exists then
    raise exception 'UNKNOWN_TABLE:%', p_table using errcode = 'undefined_table';
  end if;

  select json_build_object(
    'columns', coalesce((
      select json_agg(json_build_object(
        'name',        col.column_name,
        'dataType',    col.data_type,
        'udtName',     col.udt_name,
        'isNullable',  (col.is_nullable = 'YES'),
        'isIdentity',  (col.is_identity = 'YES'),
        'isGenerated', (col.is_generated <> 'NEVER'),
        'default',     col.column_default,
        'ordinal',     col.ordinal_position
      ) order by col.ordinal_position)
      from information_schema.columns col
      where col.table_schema = 'public' and col.table_name = p_table
    ), '[]'::json),
    'primaryKey', coalesce((
      select json_agg(a.attname order by array_position(i.indkey, a.attnum))
      from pg_index i
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = ('public.' || quote_ident(p_table))::regclass
        and i.indisprimary
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_table_columns(text) from public, anon, authenticated;
grant execute on function public.admin_table_columns(text) to service_role;
