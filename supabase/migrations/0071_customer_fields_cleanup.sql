-- Removes the retired "Tax number" default customer field, and repairs two
-- data issues that could leave a customer's edit form blank:
--  1. Pre-0057 rows never got backfilled with is_default=true, which made
--     ensureDefaultCustomerFields() try to re-insert them and collide with
--     the (organization_id, module, field_key) unique index.
--  2. Name/Phone/Email could previously be toggled invisible from the fields
--     admin page with no guard, hiding the entire customer form.

delete from custom_fields
where module = 'customers' and field_key = 'tax_number';

update custom_fields
set is_default = true
where module = 'customers'
  and field_key in ('name', 'phone', 'email', 'notes')
  and is_default = false;

update custom_fields
set is_active = true
where module = 'customers'
  and field_key in ('name', 'phone', 'email')
  and is_active = false;

update custom_fields
set required = true
where module = 'customers' and field_key in ('name', 'phone') and required = false;

update custom_fields
set required = false
where module = 'customers' and field_key = 'email' and required = true;
