# 10 — Roles & Permissions: Gap Check

Compared directly against the decided target model. **Matches** means it's built exactly as decided; **Differs** means it's built, but differently; **Not built** means it doesn't exist or isn't enforced at all.

## Platform roles (Makhzoon team)

| Role | Target | Actual | Verdict |
|---|---|---|---|
| Superadmin | Full access to everything, incl. team management | Matches exactly — always full access, cannot even be dialed down | **Matches** |
| Makhzoon Admin | Full org/subscription/support access; no team management; view-only on system logs | Matches closely — can't manage the Makhzoon team, and the log screen only offers viewing, so "view-only" is guaranteed structurally | **Matches** |
| Makhzoon Support | View-only on orgs/billing; can transfer into an org to **view only**, not edit; full access to tickets | View-only on orgs/billing is correct. But once Support (or Admin) transfers into a client org, they currently get **full edit rights** in that org — not read-only. Ticket "close" access is also technically possible even though it's meant to be restricted. | **Differs — real gap** |

## Organization roles

| Role | Target | Actual | Verdict |
|---|---|---|---|
| Owner | Full access to every included module; only role that can manage billing or remove itself | Full module access matches. But **no one** can manage billing at the org level today — subscription changes are Makhzoon-staff-only, not exposed to Owner at all. And no one — Owner included — can currently remove/delete themselves; that action doesn't exist yet. | **Differs — real gap** |
| Admin | Full access to Usool/Raseed/Haraka/Requests (incl. approve/reject)/Support/Reports; manages Staff; no billing; can't touch Owner | Everything matches except Requests — which, as covered in [04 — Requests](04-requests.md), doesn't exist as a module at all. Admin correctly cannot modify or remove an Owner account. | **Mostly matches (Requests missing)** |
| Staff | Usool/Raseed: view+create. Haraka: create (sales) only, can't void own. Requests: create own, no approve. Support: create + view own. Reports/People/Logs: none. | Support, Reports, People, and Logs all match. Usool/Raseed default to **view-only**, not view+create. Haraka defaults to **zero access** out of the box — a new Staff account can't even open a register. And void/refund is a single on/off switch with no "can't void your own sale" distinction anywhere in the system. | **Differs on Usool, Raseed, Haraka** |

**One more thing worth fixing:** if a Staff account is ever created without an explicit permission record attached, the system's fallback is to grant that person *view access to everything* — not the restricted defaults described above. This only matters if some account-creation path can skip setting permissions, but it's worth a quick check since the failure mode is "too much access," not too little.

## Per-user permission overrides

**Confirmed to exist, at both levels.** An org admin can adjust one specific person's access away from their role's default — for example, giving a single Staff member the ability to add new inventory items without promoting them to Admin — through a permissions screen with module-grouped checkboxes. The same override mechanism exists separately for Makhzoon's own platform-side roles. Access is not strictly tied to role today; role only sets the starting point.
