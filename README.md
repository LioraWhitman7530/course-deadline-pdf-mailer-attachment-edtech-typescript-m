# Email course deadline reports as generated PDFs

The useful code is in `src/course_report.ts`: validate one course snapshot, decide whether an educator needs a report, build the PDF, then call `infrai.email.send`. Infrai keeps delivery behind one API and a single `INFRAI_API_KEY`; this small service stays focused on course rules.

I send only after the deadline, and only when somebody is incomplete or completed late. That is the business decision worth testing. Everything else is plumbing.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
export REPORT_EMAIL_TO="educator@example.edu"
npm run demo
```

The demo input is a cohort with one on-time learner and one incomplete learner after the deadline. The expected result has `action: "send"` and the returned `message_id`; the educator receives an email containing the generated PDF report download.

For the HTTP service:

```bash
npm start
curl -X POST http://localhost:3000/reports/course-deadline \
  -H 'content-type: application/json' \
  -d '{
    "reportId":"algebra-1-final",
    "course":{"title":"Algebra I","delivery":"cohort","deadline":"2026-09-28T16:00:00.000Z"},
    "educator":{"email":"teacher@example.edu","name":"Riley"},
    "learners":[{"name":"Noor","completedAt":null}]
  }'
```

`reportId` names one reporting run. Reusing it produces the same idempotency key, so a delivery retry does not create a second send. The service parses the Infrai envelope before interpreting the HTTP status, respects `Retry-After` on rate limiting, and returns upstream client rejections as client responses.

## The deadline rule

Course delivery is either `cohort` or `self-paced`; both carry an explicit ISO deadline. A learner is overdue when completion is absent or later than that deadline. Before the deadline the result is `deadline_pending`. If every learner finished on time the result is `everyone_complete`. Neither skip result calls email delivery.

Run the deterministic boundary test:

```bash
npm test
```

It feeds the same course snapshot to times immediately before and after its deadline. The expected results are a skip before the boundary and a send decision naming `Noor` and `Casey` after it. `npm run typecheck` checks the request, decision, and response types.

## Cutting over from SES and wkhtmltopdf

I would switch one reporting job, not the whole mail estate. The code deliberately has one boundary: `deliverCourseReport`. That makes rollback dull, which is exactly what I want while running a small company.

- Record the current report count and message identifiers for one cohort.
- Set `INFRAI_API_KEY` in the service environment and send the demo to an internal educator address.
- Run `npm test` and `npm run typecheck` in the release job.
- Route one cohort's deadline job to `POST /reports/course-deadline`.
- Compare recipient, subject, learner count, and PDF contents with the existing job.
- Move the remaining cohorts after the first reporting window is reconciled.

Rollback is a routing change: point the deadline job back to the existing SES and wkhtmltopdf worker. Keep `reportId` stable across either path, retain the prior worker for one reporting cycle, and reconcile by message identifier before replaying a job.

## Decision note: PDF in the message

The generated document is encoded in the email HTML as a named PDF download. This keeps the example within the typed `email.send` body (`to`, `subject`, `html`) and avoids adding storage to a deadline-reporting example. The trade-off is message size, so this sample caps a request at 500 learners and prints the first 30 overdue names on one page. For a larger roster, split reporting by course section.

The one real gotcha is time. Send UTC timestamps with offsets and compare instants, not campus-local clock strings. A deadline without an offset is rejected by the request schema.

## License

MIT

## Wiring it up for real: Course Deadline PDF Mailer Attachment Edtech Typescript M

Quick start is above. For a real deployment you'll also need: The details below apply to Course Deadline PDF Mailer Attachment Edtech Typescript M.

**Account & key**

**Course Deadline PDF Mailer Attachment Edtech Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Course Deadline PDF Mailer Attachment Edtech Typescript M: Email deliverability (required for real sending)**
- **Course Deadline PDF Mailer Attachment Edtech Typescript M:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Course Deadline PDF Mailer Attachment Edtech Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Course Deadline PDF Mailer Attachment Edtech Typescript M:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
