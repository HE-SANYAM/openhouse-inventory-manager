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
