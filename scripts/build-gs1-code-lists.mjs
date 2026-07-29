#!/usr/bin/env node
// Generates lib/gs1-code-lists.ts from the GS1 extended attribute master code list.
//
//   node scripts/build-gs1-code-lists.mjs
//
// Only the code lists the demo categories actually reference are emitted — the
// full file is 128 lists / 1,987 values, and bundling all of it into a
// prototype's client JS buys nothing.
//
// The source CSV has two data-quality artifacts that are corrected here and
// reported on stdout, so the fixes stay visible rather than silently baked in:
//
//   1. ~5% of codes contain Greek/Cyrillic capitals that look identical to
//      ASCII (Henley is "GM03CLNTH<GREEK NU>"). Almost certainly an OCR or
//      copy-paste artifact upstream.
//   2. The Open/Closed Toe codes read "GM030PCL.." — a digit zero where the
//      "O" of OPCL belongs.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = join(HERE, "gs1_extended_attribute_master_code_list.csv")
const OUT_PATH = join(HERE, "..", "lib", "gs1-code-lists.ts")

// Code lists referenced by the Sleepwear, Footwear and Jewellery categories.
// Keep in sync with lib/category-attributes.ts.
const WANTED = [
  // Shared across categories
  "Care Instructions Code List",
  "Closure Code List",
  "Fabric or Material Code List",
  "Fiber Code List",
  "Fit Code List",
  "Gender Code List",
  "Length Description Code List",
  "Lining Material Code List",
  "Occasion Code List",
  "Special Embellishment Code List",
  "Water Repellent Code List",
  // Sleepwear
  "Sleepwear Type Code List",
  "Collar/Neck Type Code List",
  "Sleeve Type Code List",
  "Waistband Type Code List",
  "Leg Type Code List",
  "Knit Type Code List",
  // Footwear
  "Shoe Type Code List",
  "Sho Style Code List",
  "Heel Height Range Code List",
  "Heel Material Code List",
  "Heel Type Code List",
  "Open/Closed Toe Code List",
  "Outsole Type Code List",
  "Sole Type Code List",
  "Toe Shape Code List",
  "Toe Style Code List",
  "Boot Shaft Type Code List",
  "Sport Code List",
  // Jewellery
  "Jewelry Type Code List",
  "Bracelet Type Code List",
  "Necklace Type Code List",
  "Earring Type Code List",
  "Ring Type Code List",
  "Metal Code List",
  "Metal Composition Code List",
  "Band Type Code List",
  "Watch Case Shape Code List",
  "Crown Code List",
  "Number of Settings Code List",
]

// The source CSV's "Sho Style Code List" is a typo; render it correctly.
const LIST_NAME_FIXES = { "Sho Style": "Shoe Style" }

// Greek/Cyrillic capitals that are visually identical to ASCII capitals.
const HOMOGLYPHS = {
  "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H",
  "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O",
  "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X", "Β": "B",
  "А": "A", "В": "B", "Е": "E", "З": "3", "К": "K",
  "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C",
  "Т": "T", "У": "Y", "Х": "X", "І": "I", "Ѕ": "S",
}

function parseCsv(text) {
  // The file is simple (no embedded commas or quotes in any field), but parse
  // defensively anyway so a future export with quoted values still works.
  const rows = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "")
  for (const line of lines) {
    const cells = []
    let cur = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        cells.push(cur); cur = ""
      } else cur += ch
    }
    cells.push(cur)
    rows.push(cells.map((c) => c.trim()))
  }
  const header = rows.shift()
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])))
}

const normalizations = []

function normalizeCode(code, listName, label) {
  let out = ""
  let changed = false
  for (const ch of code) {
    const ascii = HOMOGLYPHS[ch]
    if (ascii) { out += ascii; changed = true } else out += ch
  }
  // "GM030PCL.." — digit zero standing in for the O of OPCL.
  if (/^GM030PCL/.test(out)) {
    out = out.replace(/^GM030PCL/, "GM03OPCL")
    changed = true
  }
  if (changed) normalizations.push({ listName, label, from: code, to: out })
  return out
}

const rows = parseCsv(readFileSync(CSV_PATH, "utf8"))
const wanted = new Set(WANTED)
const byList = new Map()
const seenLists = new Set()

for (const row of rows) {
  const listName = row["Code List Name"]
  seenLists.add(listName)
  if (!wanted.has(listName)) continue
  const label = row["Code List Value"]
  const code = normalizeCode(row["Code"], listName, label)
  if (!byList.has(listName)) byList.set(listName, [])
  byList.get(listName).push({ label, code })
}

const missing = WANTED.filter((n) => !byList.has(n))
if (missing.length) {
  console.error("✗ Code lists not found in the CSV:\n  " + missing.join("\n  "))
  process.exit(1)
}

// Strip the trailing " Code List" and apply the Sho Style typo fix so keys read
// as the attribute names the UI shows.
const keyFor = (listName) => {
  const base = listName.replace(/ Code List$/, "")
  return LIST_NAME_FIXES[base] ?? base
}

const sortedKeys = [...byList.keys()].sort((a, b) => keyFor(a).localeCompare(keyFor(b)))
let totalValues = 0

const body = sortedKeys
  .map((listName) => {
    // "Other" is a GS1 catch-all; keep it, but sort it last so real values lead.
    const values = [...byList.get(listName)].sort((a, b) => {
      const aOther = a.label === "Other" || a.label.startsWith("Other ")
      const bOther = b.label === "Other" || b.label.startsWith("Other ")
      if (aOther !== bOther) return aOther ? 1 : -1
      return a.label.localeCompare(b.label)
    })
    totalValues += values.length
    const entries = values
      .map((v) => `    { label: ${JSON.stringify(v.label)}, code: ${JSON.stringify(v.code)} },`)
      .join("\n")
    return `  ${JSON.stringify(keyFor(listName))}: [\n${entries}\n  ],`
  })
  .join("\n")

const out = `// GENERATED FILE — do not edit by hand.
//
// Source: scripts/gs1_extended_attribute_master_code_list.csv
// Regenerate with: node scripts/build-gs1-code-lists.mjs
//
// ${byList.size} of ${seenLists.size} GS1 code lists (${totalValues} of ${rows.length} values) — only those
// referenced by the demo categories. Values and codes are verbatim from the
// source apart from the ASCII normalizations the generator reports.

export interface Gs1Value {
  label: string
  code: string
}

/** Keyed by GS1 code list name, which is also the attribute label shown in the UI. */
export const GS1_CODE_LISTS: Record<string, Gs1Value[]> = {
${body}
}

/** Values for an attribute, or an empty array when it is free-text. */
export function getCodeListValues(codeListName: string | undefined): Gs1Value[] {
  return codeListName ? (GS1_CODE_LISTS[codeListName] ?? []) : []
}
`

writeFileSync(OUT_PATH, out)

console.log(`✓ Wrote lib/gs1-code-lists.ts`)
console.log(`  ${byList.size} code lists, ${totalValues} values (source: ${seenLists.size} lists, ${rows.length} values)`)
console.log(`\n  Normalized ${normalizations.length} codes with non-ASCII or malformed characters:`)
for (const n of normalizations) {
  console.log(`    ${n.from}  →  ${n.to}   (${keyFor(n.listName)}: ${n.label})`)
}
