# Top-Line Summary

Six things worth knowing before reading the rest of this audit:

1. **Requests doesn't exist.** It was fully built, then deliberately deleted from the app before this branch. There's currently no approval workflow anywhere in the product — reviving it is new-build work, not a bug fix.

2. **Module access by subscription is genuinely configurable.** A Superadmin can create packages and toggle every module and Haraka sub-module through a real screen, and it's enforced for every role, including Owner, at both the screen level and the API level.

3. **Impersonation isn't view-only.** When a Makhzoon Support or Admin team member transfers into a client org to help with a ticket, they currently get full edit rights inside that org — not the read-only access the target model calls for.

4. **Owners can't manage their own billing.** Changing or cancelling a subscription is currently restricted to the Makhzoon platform team only — not exposed to the org Owner at all, which is the opposite of the target design.

5. **Usool, Raseed, and the base Haraka POS are the most complete parts of the product** — registers, checkouts, warranties, purchase orders, stock audits, void/refund, and split payments are all real, working, server-enforced features.

6. **Staff accounts default to less access than intended.** Out of the box a Staff member can't even open a POS register, and a Staff account created without an explicit permission record silently gets view access to everything.

See the individual docs for the full breakdown of each area.
