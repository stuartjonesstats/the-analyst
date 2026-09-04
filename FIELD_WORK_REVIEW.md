# Field Work editorial review

Field Work is an opt-in gallery of external work created by people using The Analyst. Inclusion is an editorial decision, not a grade, credential, ranking, or endorsement of every conclusion in the linked work.

## Current launch state

Field Work is deliberately dormant while the active learner base develops. The public build omits it from navigation unless `NEXT_PUBLIC_FIELD_WORK=true`. Before enabling that switch, add a varied opening set of real, approved entries and move `docs/field-work-submission-template.yml` to `.github/ISSUE_TEMPLATE/field-work-submission.yml` so the public intake exists where the page says it does.

Before adding an entry to `web/lib/field-work.ts`, confirm all of the following:

- The submitted URL is HTTPS, publicly reachable, and points to the artifact described.
- The submitter confirms that they created or control the work and permit The Analyst to link to it and quote their submitted synopsis.
- The work contains no credentials, private employer or client material, protected data, or third-party personal data.
- The work is relevant to an assignment or Priority Brief and contains enough context for a reader to understand the decision and approach.
- The repository, notebook, article, or page provides reasonable source attribution and does not present itself as an official answer from The Analyst.
- The selected preview text is accurate, accessible, and does not reveal more personal information than the submitter deliberately supplied.
- Any assignment spoilers are clearly signposted in the linked work or the Field Work card.

Prefer a varied gallery across skill level, assignment, artifact type, and defensible approach. Do not rank entries or privilege polish over clear reasoning and reproducibility.

Honor correction or removal requests promptly. Remove broken or unsafe links rather than archiving copies of the submitted work.
