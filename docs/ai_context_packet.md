# Optional AI help packets

## Purpose

The workbench can download a focused Markdown context file for a learner who
wants help from an external AI assistant. The learner chooses **AI Help Packet**,
writes one concrete question, selects the work they want to disclose, reviews
the downloaded file, and attaches it to a tool allowed by their course or
institution.

The Analyst creates the file in the browser. It does not choose an AI provider,
open another service, upload the file, or send learner work anywhere.

## Always included

- the assignment brief, decision standard, cutoff, and required handoff;
- the exact DuckDB and Pyodide workbench contract;
- the assignment's extract and selection notes;
- the public data dictionary for tables mounted in that assignment;
- relationships whose two endpoints are both mounted; and
- workplace messages already revealed to that learner.

This gives an AI assistant enough context to discuss fully qualified DuckDB
table names and Python's `from analyst import table` interface without telling
the learner to use nonexistent file paths.

## Learner-selected material

SQL, Python, scratch notes, the final-brief draft, the current error, and the
evidence register are all explicit choices. None is silently inferred from an
uploaded submission. Displayed SQL rows are a separate, default-off choice and
are capped at the first 25. Python output is text-only; figures are not embedded.

## Deliberate exclusions

The packet contains no learner identity fields, raw Parquet files, uploaded
artifacts, binary or data-URL figures, unrevealed messages, instructor notes,
hidden mechanisms, answer keys, or full execution history. Learner-authored
blocks are labeled as untrusted quoted material, and the complete packet is
capped at 200,000 characters with visible omission markers.

Do not substitute a formal `.analystcase` submission or portfolio archive for
this packet. Those exports are designed for restoration, assessment, and human
review and may contain substantially more material than a focused question
requires.

## Coaching contract included in the file

The generated context asks the external assistant to act as a senior-analyst
coach: diagnose before rewriting, distinguish evidence from claims, avoid
inventing data or execution, keep grain and time visible, and suggest checks the
learner can run. It also asks the assistant not to search for instructor
materials or complete the entire submission or final decision.

This prompt is guidance, not an enforcement boundary. AI advice can be wrong.
The learner remains responsible for running the work, inspecting the result,
and recording what advice was used or rejected and how it was verified.
