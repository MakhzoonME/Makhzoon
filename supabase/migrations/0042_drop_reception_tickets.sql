-- Remove the Reception Tickets feature (superseded by the register's
-- hold/recall cart for front-desk intake). Drops what 0038/0039/0040
-- created; those migration files are left untouched (already applied).

DELETE FROM platform_list_items WHERE list_key = 'reception_ticket_status';

DROP TABLE IF EXISTS haraka_reception_tickets;
DROP TABLE IF EXISTS haraka_reception_ticket_counters;
