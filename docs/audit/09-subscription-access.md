# 09 — Subscription-Based Module Access

**Status: Configurable, enforced everywhere**

This is one of the stronger parts of the platform: which modules an org can see is genuinely data, editable through a real screen, not something buried in code.

## Is the mapping configurable or hardcoded?

**Configurable.** Subscription packages (and each org's actual entitlement) live in the database, not in application code. A Superadmin can change what a package includes without any engineering deploy. The only thing that is fixed in code is the underlying list of possible modules/features that exist to be turned on or off — which is expected, since those are the modules that have actually shipped.

## Does a Superadmin package editor exist?

**Yes, and it's fully built.** A Superadmin can create or edit a package: pricing, trial length, usage limits, and — the key part — a module-access checklist grouped exactly like the app's own navigation (Usool + its sub-features, Raseed, Haraka's four sub-modules with a "how many are included free" setting, add-ons, Banna, Loyalty). A separate screen lets a Superadmin assign or change which package a specific org is on, and override individual features for that one org.

## Confirmed: hidden for every role, including Owner

When an org's package doesn't include a module, it's hidden for every role in that org, including Owner — and this isn't just a hidden menu item. It's enforced twice: once in what gets shown in navigation, and again on the server, so even directly hitting a blocked feature's underlying address is refused. This holds true across every module checked, with no role-based exception.
