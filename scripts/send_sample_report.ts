import { deliverCourseReport } from "../src/course_report.js";

const recipient = process.env.REPORT_EMAIL_TO;
if (!recipient) throw new Error("REPORT_EMAIL_TO is required");

const result = await deliverCourseReport(
  {
    reportId: "typescript-2026-09-29",
    course: {
      title: "Practical TypeScript",
      delivery: "cohort",
      deadline: "2026-09-28T16:00:00.000Z",
    },
    educator: { email: recipient, name: "Morgan" },
    learners: [
      { name: "Ari", completedAt: "2026-09-28T12:10:00.000Z" },
      { name: "Sam", completedAt: null },
    ],
  },
  new Date("2026-09-29T09:00:00.000Z"),
);

console.log(result);
