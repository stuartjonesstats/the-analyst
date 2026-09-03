# Portable `.analystcase` submissions

## Purpose

A learner can download one portable case file from the workbench and give it to
an instructor through the institution's existing LMS, email, shared drive, or
other submission channel. The Analyst does not require an account or invent a
second course-management system.

The file is UTF-8 JSON with the extension `.analystcase` and media type
`application/vnd.theanalyst.case+json`.

## Version 1 contents

- format and schema version;
- export timestamp;
- scenario ID, slug, revision, and data-catalog snapshot;
- SQL, Python, scratch-note, and polished final-brief files;
- SHA-256 hash for each learner-authored file;
- the case evidence register;
- the most recent successful displayed SQL result and run count;
- the most recent successful Python stdout, stderr, display value, figures, and
  run count;
- required-handoff inventory;
- browser runtime versions; and
- narrowly worded mechanical execution records.

The source Parquets are not copied into every submission. The scenario and
catalog revisions identify the governed data pack needed to reproduce the work.

## Review boundary

The public instructor viewer reads a submission locally, checks that the file
contents still match their stored hashes, and exposes the recorded work. It does
not silently execute learner code and does not assign a score.

A matching hash establishes internal file consistency, not authorship or an
institutional digital signature. Institutions that require tamper-evident
submission times or identity should continue to use their LMS for transport.

Execution records establish that the browser completed a run. They do not
establish that the grain, estimand, inference, model, recommendation, or prose is
correct. Those decisions remain instructor-reviewed under
[`checking_policy.md`](checking_policy.md).

## Privacy and storage

Export happens in the learner's browser. No sign-in is required, and downloading
a submission does not send its contents to The Analyst. The instructor viewer
also opens the file locally. Learners should still follow their institution's
rules for storing and transmitting submitted work.

## Evolution rules

- Schema changes require a version change.
- A viewer must reject unsupported versions rather than guessing.
- Scenario revisions and catalog snapshots must remain explicit.
- New deterministic records must describe exactly what was observed.
- Analytical-quality checks may not be smuggled into the format as keyword,
  regex, or model-scored judgments.
