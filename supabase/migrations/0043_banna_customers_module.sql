-- Allow the Banna custom-fields system to scope fields/values to the
-- Haraka customers module, so orgs can define custom fields on customer
-- profiles (e.g. "Preferred contact method"), same as assets/inventory/requests.

alter table public.custom_fields
  drop constraint if exists custom_fields_module_check;
alter table public.custom_fields
  add constraint custom_fields_module_check
    check (module in ('assets', 'inventory', 'requests', 'customers'));

alter table public.custom_field_values
  drop constraint if exists custom_field_values_record_type_check;
alter table public.custom_field_values
  add constraint custom_field_values_record_type_check
    check (record_type in ('assets', 'inventory', 'requests', 'customers'));
