# 01 — Usool: Asset & Warranty Management

**Status: Fully working**

The most mature module in the product. Every piece of the asset lifecycle — register, assign, check out, service, retire — is real and connected, not a mockup.

## What a user can see & do

- An overview dashboard with asset counts and quick actions.
- A searchable, filterable asset register with CSV export and bulk actions (move, duplicate, delete).
- An add/edit form, and a per-asset detail page organized into tabs: Details, Warranties, Maintenance, Checkouts, Notes, Audit history.
- Check an asset out to a person and check it back in, with full history.
- Log maintenance events (repair, service, inspection, upgrade) with cost.
- Generate and download a QR code per asset — scanning it opens that asset's page.
- Run a physical "Asset Audit": pull in every active asset, walk through marking each Found or Missing, and finalize.
- Bulk-import assets from a CSV, with a downloadable template and a validation preview before anything is committed.

## What's captured

Name, category, status, serial number, purchase date & cost, who it's assigned to (free text, not linked to a People record), location, notes, and attached documents (receipts/invoices) — plus a full history of who changed what and when.

## Business rules & limits

- **Confirmed:** asset statuses, categories, and locations are genuinely configurable per organization today — an org admin can add, rename, recolor, or remove values from Settings without asking engineering. This is the bar the rest of the app is measured against in [11 — Hardcoded vs. configurable](11-hardcoded-vs-configurable.md).
- **One soft spot:** the retire and checkout logic is written to key off the exact words "Active" and "Retired." If an org renames those specific status values in their custom list, checkout/retire behavior could quietly break — worth a guardrail before it's promoted as fully customizable.
