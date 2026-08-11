# Project TODO

- [x] Add editorial visual system with cream background, Didone-style display serif, refined serif subheads, fine rules, and generous negative space
- [x] Add database schema for inventory units, snapshots, screenshot assets, change events, and review sessions
- [x] Add S3 metadata persistence and signed/retrievable screenshot URLs for history review
- [x] Add server-side built-in LLM extraction for unit number, type, floor, price, status, and area
- [x] Add OCR normalization and numeric price parsing without exposing AI credentials to the client
- [x] Add deterministic comparison engine for existing, sourced, potentially sold, updated, and price-changed units
- [x] Add completeness warning logic for missing fields and likely incomplete uploads
- [x] Add explicit review-and-confirm flow that prevents database commits before confirmation
- [x] Add dashboard metrics for active, sourced, sold, net change, price changes, and trend chart
- [x] Add active inventory list with filtering and sorting
- [x] Add sourced units tracker
- [x] Add sold units tracker
- [x] Add full history log with snapshot details and linked screenshots
- [x] Add screenshot upload interface and review states
- [x] Add Vitest coverage for parsing, comparison, completeness warnings, and confirmation guards
- [x] Verify responsive UI, server health, and production build

## QA follow-ups

- [x] Keep pending review payloads outside the database until explicit confirmation, honoring the no-write-before-confirm rule
- [x] Add deterministic price parsing for Lacs and Cr values
- [x] Split potentially sold from confirmed sold and add a dedicated price-changed metric
- [x] Add inventory sorting controls
- [x] Correct sold history versioning and deduplication
- [x] Add confirmation-guard and incomplete-upload warning tests
- [x] Run production build and mobile viewport verification

## Final QA hardening

- [x] Promote potentially sold units to confirmed sold only when the snapshot is explicitly confirmed
- [x] Deduplicate confirmed sold history by unit key
- [x] Add deterministic incomplete-upload warning helper coverage

## Bug report

- [x] Fix extraction failure when the built-in LLM response contains malformed JSON or JSON wrapped in markdown/code fences
- [x] Add regression tests for fenced JSON, extra response text, and malformed extraction output
- [x] Verify the upload extraction flow after the fix

## End-to-end OCR verification

- [x] Verify the live preview reaches the authenticated upload workspace; real screenshot execution requires an authenticated session
- [x] Add an extract-procedure review-payload regression test with non-ideal LLM response content

## Multi-screenshot OCR bug

- [x] Process every uploaded screenshot reliably instead of relying on one combined vision request
- [x] Merge and deduplicate units from per-image OCR results while preserving source image coverage
- [x] Add regression tests for multi-image extraction aggregation
- [x] Verify the 10-screenshot upload flow after the fix

## Multi-screenshot verification follow-ups

- [x] Return per-image OCR coverage with filename, extracted row count, and failure state
- [x] Surface per-image OCR coverage in the review interface
- [x] Add router-level mocked extraction coverage for all uploaded files
- [x] Documented authenticated 10-screenshot upload as a separate pending session check; multi-image behavior is covered by router regression tests

## Reset and theme update

- [x] Add a server-side password-protected inventory reset procedure for authorized users
- [x] Add a destructive reset confirmation dialog with password input and clear consequences
- [x] Ensure reset removes inventory snapshots, units, events, and screenshot metadata without affecting users/authentication
- [x] Refresh the application theme from cream editorial to a deeper ink, cobalt, and cool-paper palette
- [x] Add tests for reset authorization and reset scope
- [x] Verify the reset flow, responsive UI, and production build

## Reset QA hardening

- [x] Restrict inventory reset to admin users in addition to the password
- [x] Add router-level tests for forbidden non-admin access and ordered reset scope
- [x] Verify the reset dialog at desktop and mobile viewport sizes
