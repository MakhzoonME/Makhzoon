-- ════════════════════════════════════════════════════════════════════════
-- 0058_service_ops_feature_flags.sql
-- Two new opt-in feature flags, same shape as 0030's 'banna' flag:
--   • vehicleIntake — plate-photo capture + vehicle matching on Haraka
--     Service Jobs (car-care intake). Independent of 'deliveryAgents' since
--     a services org may want balanced routing without plate capture.
--   • loyalty       — points/tiers/barcode/wallet-pass module. Fully
--     independent of Haraka; usable by retail orgs too.
-- Unlike 'banna' these default to false (opt-in per org), not backfilled
-- true, since they're vertical-specific rather than a general rollout.
-- ════════════════════════════════════════════════════════════════════════

update public.packages
set features = features || '{"vehicleIntake": false, "loyalty": false}'::jsonb
where (features ->> 'vehicleIntake') is null
   or (features ->> 'loyalty') is null;
