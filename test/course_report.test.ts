import assert from "node:assert/strict";
import test from "node:test";
import { decideReportDelivery, reportRequestSchema } from "../src/course_report.js";

const request = reportRequestSchema.parse({
  reportId: "cohort-17-final",
  course: {
    title: "Algebra I",
    delivery: "cohort",
    deadline: "2026-10-01T16:00:00.000Z",
  },
  educator: { email: "teacher@example.edu", name: "Riley" },
  learners: [
    { name: "Lee", completedAt: "2026-10-01T15:30:00.000Z" },
    { name: "Noor", completedAt: null },
    { name: "Casey", completedAt: "2026-10-01T17:00:00.000Z" },
  ],
});

test("waits until the course deadline", () => {
  assert.deepEqual(
    decideReportDelivery(request, new Date("2026-10-01T15:59:59.000Z")),
    { action: "skip", reason: "deadline_pending" },
  );
});

test("reports missing and late completions after the deadline", () => {
  assert.deepEqual(
    decideReportDelivery(request, new Date("2026-10-01T18:00:00.000Z")),
    { action: "send", overdueLearners: ["Noor", "Casey"] },
  );
});
