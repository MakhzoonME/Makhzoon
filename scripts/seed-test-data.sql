-- ═══════════════════════════════════════════════════════════════════════
-- Makhzoon — Seed Test Data
-- 20 Organizations × (Owner + Admin + Staff) × 15+ Assets each
-- Covers all statuses, types, and configurations.
--
-- Password for ALL users: QAZwsx@1212
-- Emails: *@test.com
--
-- Run in Supabase SQL Editor (service_role — bypasses RLS).
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  -- ── Arrays to track generated IDs ──────────────────────────────────
  org_ids            uuid[] := '{}';
  owner_ids          uuid[] := '{}';
  admin_ids          uuid[] := '{}';
  staff_ids          uuid[] := '{}';
  org_asset_ids      uuid[];
  org_warranty_ids   uuid[];
  org_inv_item_ids   uuid[];

  org_id     uuid;
  owner_id   uuid;
  admin_id   uuid;
  staff_id   uuid;
  asset_id   uuid;
  warranty_id uuid;
  inv_item_id uuid;

  i int; j int; k int;

  -- ── Constants ──────────────────────────────────────────────────────
  cats       text[] := array['devices','hardware','furniture','software'];
  locs       text[] := array['Main Office','Warehouse','Branch Office','Remote'];
  vendors_t  text[] := array['TechMart Solutions','Office Depot Pro','Global Systems Inc','Digital Warehouse','Corporate Supplies Co'];
  units_t    text[] := array['each','box','pack','pair','roll'];
  asset_pool text[] := array[
    'Dell Latitude 5430 Laptop','HP LaserJet Pro M404dn','Standing Desk Pro','Office Chair Ergonomic',
    'Cisco Meraki MX64 Firewall','MacBook Pro 16" M3','Samsung 27" Monitor','Logitech C920 Webcam',
    'Server Rack 42U','UPS APC 1500VA','Canon ImageRUNNER C3530i','Conference Room Speaker',
    'Apple iPad Pro 12.9"','BenQ Projector MH760','Poly Studio Soundbar','LG 65" 4K Display',
    'Samsung Galaxy Tab S9','Dell Precision 5820 Tower','HP EliteBook 840 G10','Asus ZenBook Pro',
    'MikroTik Router CCR1036','Synology DS1823xs+ NAS','Cisco Catalyst 9200 Switch','APC Smart-UPS 3000',
    'Herman Miller Aeron Chair','IKEA Bekant Desk 160cm','Yealink MP56 Teams Phone','Logitech Zone Wireless Headset'
  ];

  superadmin_id uuid := gen_random_uuid();
  pkg_starter   uuid;
  pkg_business  uuid;
  pkg_enterprise uuid;
  pkg_id        uuid;

begin
  -- ═══════════════════════════════════════════════════════════════════
  -- 1. Packages (3 tiers)
  -- ═══════════════════════════════════════════════════════════════════
  pkg_starter := gen_random_uuid();
  insert into public.packages (id, name, description, is_active, limits, features) values
    (pkg_starter, 'Starter', 'For small teams just getting started', true,
     '{"maxAssets":50,"maxUsers":5,"maxWarranties":25,"maxRequests":10}'::jsonb,
     '{"dashboard":true,"assets":true,"inventory":false,"warranties":false,"requests":false,"reports":false,"support":true,"auditLogs":false,"maintenance":false,"assetCheckouts":false,"assetNotes":false,"pos":false}'::jsonb);

  pkg_business := gen_random_uuid();
  insert into public.packages (id, name, description, is_active, limits, features) values
    (pkg_business, 'Business', 'Growing organizations that need full asset tracking',
     true,
     '{"maxAssets":500,"maxUsers":25,"maxWarranties":200,"maxRequests":100}'::jsonb,
     '{"dashboard":true,"assets":true,"inventory":true,"warranties":true,"requests":true,"reports":true,"support":true,"auditLogs":true,"maintenance":true,"assetCheckouts":true,"assetNotes":true,"pos":false}'::jsonb);

  pkg_enterprise := gen_random_uuid();
  insert into public.packages (id, name, description, is_active, limits, features) values
    (pkg_enterprise, 'Enterprise', 'Full platform with POS and unlimited everything',
     true,
     '{"maxAssets":-1,"maxUsers":-1,"maxWarranties":-1,"maxRequests":-1}'::jsonb,
     '{"dashboard":true,"assets":true,"inventory":true,"warranties":true,"requests":true,"reports":true,"support":true,"auditLogs":true,"maintenance":true,"assetCheckouts":true,"assetNotes":true,"pos":true}'::jsonb);

  -- ═══════════════════════════════════════════════════════════════════
  -- 2. Superadmin (platform access)
  -- ═══════════════════════════════════════════════════════════════════
  -- NOTE on the auth.users insert shape:
  -- GoTrue's Go driver scans the eight token columns (`confirmation_token`,
  -- `recovery_token`, `email_change`, `email_change_token_new`,
  -- `email_change_token_current`, `phone_change`, `phone_change_token`,
  -- `reauthentication_token`) into plain `string` — NULL crashes the row
  -- scan with "converting NULL to string is unsupported" → login fails with
  -- "Database error querying schema". Always seed them as ''. Also:
  --   - `instance_id` must equal the default GoTrue tenant or login can't
  --     find the user (silently returns invalid_credentials).
  --   - `raw_app_meta_data.providers` must list 'email' so GoTrue knows
  --     password auth is enabled for this user.
  --   - A matching auth.identities row with email_verified:true is required
  --     by modern GoTrue for the password grant.
  insert into auth.users (
    instance_id, id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token,
    role, aud, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', superadmin_id, 'superadmin@test.com',
    crypt('QAZwsx@1212', gen_salt('bf', 10)),
    now(), '{"display_name":"Super Admin"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '', '', '', '', '', '', '', '',
    'authenticated', 'authenticated', now(), now()
  );
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), superadmin_id::text, superadmin_id,
    jsonb_build_object('sub', superadmin_id::text, 'email', 'superadmin@test.com', 'email_verified', true),
    'email', now(), now(), now()
  );
  insert into public.users (id, email, display_name, role, status) values
    (superadmin_id, 'superadmin@test.com', 'Super Admin', 'super_admin', 'active');
  insert into public.superadmin_users (id, email, display_name, role, status) values
    (superadmin_id, 'superadmin@test.com', 'Super Admin', 'super_admin', 'active');

  -- ═══════════════════════════════════════════════════════════════════
  -- 3. Loop: 20 Organizations
  -- ═══════════════════════════════════════════════════════════════════
  <<org_loop>>
  for i in 1..20 loop
    -- ── Organization ─────────────────────────────────────────────
    org_id := gen_random_uuid();
    org_ids := array_append(org_ids, org_id);

    insert into public.organizations (id, name, subdomain, contact_email, description, category, package_details, created_by)
    values (
      org_id,
      'Org-' || i || ' ' || case (i % 4)
        when 1 then 'Tech Solutions'
        when 2 then 'Retail Hub'
        when 3 then 'HealthCare Plus'
        else 'EduLearn Academy'
      end,
      'org' || i,
      'org' || i || '@test.com',
      'Seed organization #' || i || ' for testing all modules and statuses.',
      case (i % 4) when 1 then 'technology' when 2 then 'retail' when 3 then 'healthcare' else 'education' end,
      '{}'::jsonb,
      superadmin_id
    );

    -- ── Organization Config ──────────────────────────────────────
    insert into public.organization_configs (organization_id, asset_statuses, locations, categories, created_by)
    values (
      org_id,
      '[
        {"id":"active","label":"Active","color":"#22c55e"},
        {"id":"inactive","label":"Inactive","color":"#9ca3af"},
        {"id":"maintenance","label":"Under Maintenance","color":"#f59e0b"},
        {"id":"retired","label":"Retired","color":"#ef4444"}
      ]'::jsonb,
      format(
        '[
          {"id":"loc-%s-1","name":"Main Office"},
          {"id":"loc-%s-2","name":"Warehouse"},
          {"id":"loc-%s-3","name":"Branch Office"},
          {"id":"loc-%s-4","name":"Remote"}
        ]', i, i, i, i)::jsonb,
      '[
        {"id":"devices","name":"Devices"},
        {"id":"hardware","name":"Hardware"},
        {"id":"furniture","name":"Furniture"},
        {"id":"software","name":"Software"}
      ]'::jsonb,
      superadmin_id
    );

    -- ── Subscription (rotate through statuses) ───────────────────
    pkg_id := case
        when i <= 7  then pkg_starter
        when i <= 14 then pkg_business
        else              pkg_enterprise
      end;
    insert into public.subscriptions (organization_id, package_id, features, package_details, start_date, end_date, status, created_by)
    values (
      org_id,
      pkg_id,
      -- Subscription features are the org's source of truth for module gating
      -- (read by the sidebar / auth routes). Seed them from the package so the
      -- plan's modules actually appear; '{}' here would hide every module.
      (select features from public.packages where id = pkg_id),
      '{}'::jsonb,
      '2025-01-01'::timestamptz,
      case
        when i % 3 = 1 then '2026-12-31'::timestamptz   -- ACTIVE
        when i % 3 = 2 then '2024-12-31'::timestamptz   -- EXPIRED
        else                 '2026-06-30'::timestamptz   -- ACTIVE (different end)
      end,
      case (i % 3) when 1 then 'ACTIVE' when 2 then 'EXPIRED' else 'SUSPENDED' end,
      superadmin_id
    );

    -- ── Tax Rates ───────────────────────────────────────────────
    insert into public.tax_rates (organization_id, name, rate, is_default, created_by) values
      (org_id, 'VAT 15%', 0.15, true, superadmin_id),
      (org_id, 'VAT 5%',  0.05, false, superadmin_id);

    -- ── Auth: Owner ─────────────────────────────────────────────
    -- (See superadmin block above for why this insert sets every
    -- token column to '' and includes instance_id, raw_app_meta_data,
    -- and the matching auth.identities row.)
    owner_id := gen_random_uuid();
    owner_ids := array_append(owner_ids, owner_id);
    insert into auth.users (
      instance_id, id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      role, aud, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', owner_id, 'owner' || i || '@test.com',
      crypt('QAZwsx@1212', gen_salt('bf', 10)),
      now(), format('{"display_name":"Owner %s"}', i)::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '', '', '', '', '', '', '', '',
      'authenticated', 'authenticated', now(), now()
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), owner_id::text, owner_id,
      jsonb_build_object('sub', owner_id::text, 'email', 'owner' || i || '@test.com', 'email_verified', true),
      'email', now(), now(), now()
    );
    insert into public.users (id, organization_id, email, display_name, role, status, created_by) values
      (owner_id, org_id, 'owner' || i || '@test.com', 'Owner ' || i, 'org_owner', 'active', superadmin_id);

    -- ── Auth: Admin ─────────────────────────────────────────────
    admin_id := gen_random_uuid();
    admin_ids := array_append(admin_ids, admin_id);
    insert into auth.users (
      instance_id, id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      role, aud, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', admin_id, 'admin' || i || '@test.com',
      crypt('QAZwsx@1212', gen_salt('bf', 10)),
      now(), format('{"display_name":"Admin %s"}', i)::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '', '', '', '', '', '', '', '',
      'authenticated', 'authenticated', now(), now()
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), admin_id::text, admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin' || i || '@test.com', 'email_verified', true),
      'email', now(), now(), now()
    );
    insert into public.users (id, organization_id, email, display_name, role, status, created_by) values
      (admin_id, org_id, 'admin' || i || '@test.com', 'Admin ' || i, 'admin', 'active', owner_id);

    -- ── Auth: Staff ─────────────────────────────────────────────
    staff_id := gen_random_uuid();
    staff_ids := array_append(staff_ids, staff_id);
    insert into auth.users (
      instance_id, id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      role, aud, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', staff_id, 'staff' || i || '@test.com',
      crypt('QAZwsx@1212', gen_salt('bf', 10)),
      now(), format('{"display_name":"Staff %s"}', i)::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '', '', '', '', '', '', '', '',
      'authenticated', 'authenticated', now(), now()
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), staff_id::text, staff_id,
      jsonb_build_object('sub', staff_id::text, 'email', 'staff' || i || '@test.com', 'email_verified', true),
      'email', now(), now(), now()
    );
    insert into public.users (id, organization_id, email, display_name, role, status, created_by) values
      (staff_id, org_id, 'staff' || i || '@test.com', 'Staff ' || i, 'staff', 'active', superadmin_id);

    -- ──────────────────────────────────────────────────────────────
    -- Assets (15–18 per org = 300+ total)
    -- Cover statuses: active, inactive, maintenance, retired
    -- ──────────────────────────────────────────────────────────────
    org_asset_ids := '{}';
    for j in 1..15 + (i % 4) loop
      asset_id := gen_random_uuid();
      org_asset_ids := array_append(org_asset_ids, asset_id);

      insert into public.assets (
        id, organization_id, name, category, status, serial_number,
        purchase_date, purchase_cost, assigned_to, location, notes,
        created_by, created_by_email, created_by_name, created_by_role
      ) values (
        asset_id, org_id,
        asset_pool[1 + ((j - 1 + i) % array_length(asset_pool, 1))],
        cats[1 + ((j - 1) % array_length(cats, 1))],
        case (j % 4)
          when 0 then 'active'
          when 1 then 'active'
          when 2 then 'inactive'
          when 3 then 'maintenance'
          else        'retired'
        end,
        'SN-' || i || '-' || lpad(j::text, 4, '0'),
        '2024-01-01'::timestamptz + make_interval(months => j - 1),
        ((j * 700 + 200 + i * 100) % 15000 + 200)::numeric,
        case when j % 3 = 0 then 'Staff Member' else null end,
        locs[1 + ((j - 1) % array_length(locs, 1))],
        'Asset #' || j || ' for organization ' || i,
        admin_id, 'admin' || i || '@test.com', 'Admin ' || i, 'admin'
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────
    -- Asset Notes (1 per asset for first 10 assets)
    -- ──────────────────────────────────────────────────────────────
    for j in 1..least(10, array_length(org_asset_ids, 1)) loop
      insert into public.asset_notes (organization_id, asset_id, text, created_by, created_by_email)
      values (org_id, org_asset_ids[j], 'Initial setup note for asset', admin_id, 'admin' || i || '@test.com');
    end loop;

    -- ──────────────────────────────────────────────────────────────
    -- Maintenance Records (1 per asset for first 8 assets)
    -- ──────────────────────────────────────────────────────────────
    for j in 1..least(8, array_length(org_asset_ids, 1)) loop
      insert into public.maintenance_records (
        organization_id, asset_id, type, description, performed_by, cost, date, created_by, created_by_email
      ) values (
        org_id, org_asset_ids[j],
        case (j % 3) when 1 then 'repair' when 2 then 'inspection' else 'upgrade' end,
        'Routine ' || case (j % 3) when 1 then 'repair' when 2 then 'inspection' else 'upgrade' end || ' performed',
        'Tech Support Team',
        (50 + j * 100 + i * 50)::numeric,
        '2025-06-01'::timestamptz + make_interval(months => j - 1),
        admin_id, 'admin' || i || '@test.com'
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────
    -- Asset Checkouts (1 per asset for first 6 assets)
    -- ──────────────────────────────────────────────────────────────
    for j in 1..least(6, array_length(org_asset_ids, 1)) loop
      insert into public.asset_checkouts (
        organization_id, asset_id, checked_out_to, checked_out_by, checked_out_by_email,
        due_date, notes, checked_out_at, returned_at, returned_by
      ) values (
        org_id, org_asset_ids[j],
        'Employee #' || j,
        admin_id, 'admin' || i || '@test.com',
        '2025-12-31'::timestamptz,
        'Checked out for project work',
        '2025-01-15'::timestamptz + make_interval(months => j - 1),
        case when j % 2 = 0 then '2025-06-15'::timestamptz + make_interval(months => j - 1) else null end,
        case when j % 2 = 0 then staff_id else null end
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────
    -- Warranties (1 per asset for first 12 assets)
    -- Cover: active, expiring soon, expired, future
    -- ──────────────────────────────────────────────────────────────
    org_warranty_ids := '{}';
    for j in 1..least(12, array_length(org_asset_ids, 1)) loop
      warranty_id := gen_random_uuid();
      org_warranty_ids := array_append(org_warranty_ids, warranty_id);
      insert into public.warranties (
        id, organization_id, asset_id, vendor, start_date, end_date, reminder, notes, created_by
      ) values (
        warranty_id, org_id, org_asset_ids[j],
        vendors_t[1 + ((j - 1) % array_length(vendors_t, 1))],
        '2024-06-01'::timestamptz + make_interval(months => j - 1),
        case (j % 4)
          when 0 then '2027-06-01'::timestamptz   -- active (far future)
          when 1 then '2026-08-01'::timestamptz   -- active (near future)
          when 2 then '2025-06-01'::timestamptz   -- expired
          else        '2026-11-01'::timestamptz   -- expiring soon
        end,
        true, 'Warranty for ' || asset_pool[1 + ((j - 1 + i) % array_length(asset_pool, 1))],
        admin_id
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────
    -- Requests (3 per org — all types + all statuses)
    -- ──────────────────────────────────────────────────────────────
    insert into public.requests (organization_id, type, description, status, created_by, updated_by)
    values (org_id, 'BUY_NEW', 'Request to purchase new equipment', 'APPROVED', staff_id, admin_id);

    insert into public.requests (organization_id, type, asset_id, description, status, decision_by, decision_at, created_by)
    values (org_id, 'RETIRE', org_asset_ids[1], 'Request to retire old asset', 'PENDING', null, null, staff_id);

    insert into public.requests (organization_id, type, inventory_item_id, description, status, created_by)
    values (org_id, 'REFILL', null, 'Request to restock supplies', 'REJECTED', staff_id);

    insert into public.requests (organization_id, type, asset_id, warranty_id, description, status, created_by)
    values (org_id, 'EXTEND_WARRANTY', org_asset_ids[2], org_warranty_ids[1], 'Request to extend warranty coverage', 'PENDING', staff_id);

    -- ──────────────────────────────────────────────────────────────
    -- Inventory Items (6 per org — all stock_statuses + units)
    -- ──────────────────────────────────────────────────────────────
    org_inv_item_ids := '{}';
    for j in 1..6 loop
      inv_item_id := gen_random_uuid();
      org_inv_item_ids := array_append(org_inv_item_ids, inv_item_id);
      insert into public.inventory_items (
        id, organization_id, name, category, sku, unit,
        quantity_on_hand, minimum_threshold, reorder_quantity,
        location, supplier, unit_cost, stock_status, created_by,
        created_by_email, created_by_name
      ) values (
        inv_item_id, org_id,
        case j
          when 1 then 'Premium Copy Paper A4 (5000 sheets)'
          when 2 then 'Ballpoint Pens (Blue, Box of 50)'
          when 3 then 'Heavy Duty Stapler'
          when 4 then 'Sticky Notes 3x3 (Pack of 12)'
          when 5 then 'Expanding File Folders (Box of 25)'
          else        'Office Glue Sticks (Pack of 20)'
        end,
        case j when 1 then 'supplies' when 2 then 'supplies' when 3 then 'tools' when 4 then 'supplies' when 5 then 'supplies' else 'supplies' end,
        'SKU-' || i || '-' || lpad(j::text, 3, '0'),
        units_t[1 + ((j - 1) % array_length(units_t, 1))],
        case (j % 3)
          when 0 then 100   -- ok
          when 1 then 5     -- low  (threshold = 10)
          else        0     -- out
        end,
        10,  -- threshold
        50,  -- reorder qty
        'Warehouse Shelf ' || j,
        vendors_t[1 + ((j - 1) % array_length(vendors_t, 1))],
        (5 + j * 15 + i)::numeric,
        case (j % 3) when 0 then 'ok' when 1 then 'low' else 'out' end,
        admin_id, 'admin' || i || '@test.com', 'Admin ' || i
      );

      -- ── Inventory Transactions (1 per item — all types) ────────
      insert into public.inventory_transactions (
        organization_id, item_id, item_name, type, quantity,
        quantity_before, quantity_after, reason, note,
        performed_by, performed_by_email, performed_by_name, performed_by_role
      ) values (
        org_id, inv_item_id,
        case j
          when 1 then 'Premium Copy Paper A4 (5000 sheets)'
          when 2 then 'Ballpoint Pens (Blue, Box of 50)'
          when 3 then 'Heavy Duty Stapler'
          when 4 then 'Sticky Notes 3x3 (Pack of 12)'
          when 5 then 'Expanding File Folders (Box of 25)'
          else        'Office Glue Sticks (Pack of 20)'
        end,
        case (j % 3) when 0 then 'in' when 1 then 'out' else 'adjustment' end,
        case (j % 3) when 0 then 50 when 1 then 10 else 5 end,
        case (j % 3) when 0 then 50 else 105 end,
        case (j % 3) when 0 then 100 when 1 then 95 else 100 end,
        'Initial stock setup',
        case (j % 3) when 0 then 'Purchase order received' when 1 then 'Staff consumption' else 'Inventory count adjustment' end,
        admin_id, 'admin' || i || '@test.com', 'Admin ' || i, 'admin'
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────
    -- Purchases (2 per org — cover all purchase statuses)
    -- ──────────────────────────────────────────────────────────────
    insert into public.purchases (
      organization_id, supplier_name, supplier_contact, invoice_number,
      invoice_date, status, lines, subtotal, tax_total, total,
      update_item_unit_cost, created_by, created_by_email, created_by_name
    ) values (
      org_id, vendors_t[1 + (i % array_length(vendors_t, 1))], '+966-55-123-4567',
      'INV-' || i || '-001',
      '2025-03-15'::timestamptz, 'received',
      format(
        '[{"itemId":"%s","itemName":"Premium Copy Paper A4","sku":"SKU-%s-001","barcode":null,"quantity":10,"unitCost":25,"taxRateId":null,"taxAmount":0,"lineTotal":250,"notes":null}]',
        org_inv_item_ids[1], i
      )::jsonb,
      250, 0, 250, true,
      admin_id, 'admin' || i || '@test.com', 'Admin ' || i
    );

    insert into public.purchases (
      organization_id, supplier_name, invoice_number,
      invoice_date, status, lines, subtotal, tax_total, total,
      update_item_unit_cost, created_by, created_by_email, created_by_name
    ) values (
      org_id, vendors_t[1 + ((i + 1) % array_length(vendors_t, 1))],
      'INV-' || i || '-002',
      '2025-05-01'::timestamptz, 'draft',
      format(
        '[{"itemId":"%s","itemName":"Office Chairs","sku":"SKU-%s-002","barcode":null,"quantity":5,"unitCost":350,"taxRateId":null,"taxAmount":0,"lineTotal":1750,"notes":"Pending approval"}]',
        org_inv_item_ids[2], i
      )::jsonb,
      1750, 0, 1750, false,
      admin_id, 'admin' || i || '@test.com', 'Admin ' || i
    );

    -- ──────────────────────────────────────────────────────────────
    -- POS Customers (3 per org)
    -- ──────────────────────────────────────────────────────────────
    insert into public.pos_customers (organization_id, name, phone, email, created_by) values
      (org_id, 'Ahmed Al-Saud', '+966-50-111-1111', 'ahmed.a@example.com', admin_id),
      (org_id, 'Sara Al-Qahtani', '+966-55-222-2222', 'sara.q@example.com', admin_id),
      (org_id, 'Khalid Al-Otaibi', '+966-53-333-3333', 'khalid.o@example.com', admin_id);

    -- ──────────────────────────────────────────────────────────────
    -- POS Sessions (1 per org)
    -- ──────────────────────────────────────────────────────────────
    insert into public.pos_sessions (organization_id, location_id, cashier_id, cashier_name, opened_at, status) values
      (org_id, 'Main Office', staff_id, 'Staff ' || i, '2025-06-01 08:00:00+00', 'open');

    -- ──────────────────────────────────────────────────────────────
    -- Support Ticket (1 per org)
    -- ──────────────────────────────────────────────────────────────
    declare
      ticket_id uuid := gen_random_uuid();
    begin
      insert into public.support_tickets (id, organization_id, subject, description, status, priority, created_by) values
        (ticket_id, org_id, 'Need help with asset setup', 'We are having trouble setting up our new assets in the system.', 'OPEN', 'MEDIUM', owner_id);
      insert into public.ticket_messages (ticket_id, organization_id, body, author_id, author_name, author_role) values
        (ticket_id, org_id, 'Hi team, can you please guide us through the asset import process?', owner_id, 'Owner ' || i, 'org_owner'),
        (ticket_id, org_id, 'Sure, I will send you the documentation shortly.', superadmin_id, 'Super Admin', 'super_admin');
    end;

    -- ──────────────────────────────────────────────────────────────
    -- Audit Log (2 per org — typical actions)
    -- ──────────────────────────────────────────────────────────────
    insert into public.audit_logs (organization_id, user_id, role, action, module, record_id, new_value, timestamp) values
      (org_id, admin_id, 'admin', 'create', 'asset', org_asset_ids[1]::text,
       json_build_object('name', asset_pool[1 + (i % array_length(asset_pool, 1))])::jsonb, now()),
      (org_id, admin_id, 'admin', 'update', 'asset', org_asset_ids[2]::text,
       format('{"status":"inactive"}')::jsonb, now());

  end loop org_loop;

  raise notice '✅ Seed complete: 20 orgs, 60 users, 300+ assets, warranties, inventory & more.';
  raise notice '   Password for all accounts: QAZwsx@1212';
  raise notice '   Superadmin: superadmin@test.com';
  raise notice '   Org owners: owner1@test.com … owner20@test.com';
  raise notice '   Admins:     admin1@test.com … admin20@test.com';
  raise notice '   Staff:      staff1@test.com … staff20@test.com';
end $$;
