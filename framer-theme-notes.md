# Framer Reference Theme Notes

Reference: https://jacobschneider.framer.media/

## Structure

The reference uses a long-form agency portfolio structure with a persistent top navigation, a very large typographic hero, a compact call-to-action pair, a logo strip, metric counters, numbered editorial sections, a project grid, service rows, pricing cards, testimonials, a shader/demo preview, and a high-contrast footer. The hierarchy is carried by oversized headings and wide whitespace rather than dense cards.

## Visual language

The page is predominantly near-black with white/gray typography, thin low-contrast grid lines, and occasional saturated gradient/shader imagery. The hero features the name as an enormous display wordmark with a large empty field and a small floating preview panel. Content uses numbered section labels such as `(01) ABOUT` and `(02) PROJECTS`. Metrics are huge and minimal, such as `25+` and `$50M`, with restrained supporting labels.

## Interaction cues

The top navigation is simple and horizontal on desktop and collapses to a `(+ ) Menu` affordance on smaller layouts. Buttons use compact text labels such as `Contact us`, `View work`, and `ALL WORK`; links are understated and rely on scale, color, or underline transitions. Project cards use large visual previews with concise metadata. The page contains an interactive shader preview card and motion-oriented copy including smooth animations, interaction, and visual rhythm.

## Adaptation decisions for Open House Tracker

Use a monochrome near-black / graphite foundation instead of the prior navy-and-gold MNTN palette. Retain warm accent color only for key tracker actions and status emphasis. Replace the landing hero with a large tracker wordmark and a compact floating “latest snapshot” preview. Recast dashboard sections as numbered editorial chapters: `(01) OVERVIEW`, `(02) INVENTORY`, `(03) OCR REVIEW`, `(04) LEDGER`. Use metric counters and oversized typography to surface active units, new units, sold units, and price changes. Present inventory and activity as visual project-like rows with hover emphasis, while preserving existing auth, upload, OCR review, reset, history, and sign-out behavior. Ensure the mobile navigation uses an explicit menu or horizontal overflow pattern rather than simply hiding desktop links.
