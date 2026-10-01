import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { infrai, type SendEmailResult } from "./infrai_email.js";

export const reportRequestSchema = z.object({
  reportId: z.string().min(1).max(80),
  course: z.object({
    title: z.string().min(1).max(120),
    delivery: z.enum(["cohort", "self-paced"]),
    deadline: z.string().datetime(),
  }),
  educator: z.object({
    email: z.string().email(),
    name: z.string().min(1).max(80),
  }),
  learners: z.array(
    z.object({
      name: z.string().min(1).max(80),
      completedAt: z.string().datetime().nullable(),
    }),
  ).min(1).max(500),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

export type ReportDecision =
  | { action: "skip"; reason: "deadline_pending" | "everyone_complete" }
  | { action: "send"; overdueLearners: string[] };

export function decideReportDelivery(
  request: ReportRequest,
  now: Date,
): ReportDecision {
  const deadline = new Date(request.course.deadline);
  if (now < deadline) return { action: "skip", reason: "deadline_pending" };

  const overdueLearners = request.learners
    .filter((learner) => {
      if (!learner.completedAt) return true;
      return new Date(learner.completedAt) > deadline;
    })
    .map((learner) => learner.name);

  return overdueLearners.length === 0
    ? { action: "skip", reason: "everyone_complete" }
    : { action: "send", overdueLearners };
}

async function buildPdf(request: ReportRequest, overdueLearners: string[]) {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const deadline = new Date(request.course.deadline).toISOString();

  page.drawText(request.course.title, { x: 48, y: 730, size: 20, font: bold });
  page.drawText(`Delivery: ${request.course.delivery}`, { x: 48, y: 695, size: 11, font: regular });
  page.drawText(`Deadline: ${deadline}`, { x: 48, y: 676, size: 11, font: regular });
  page.drawText(`Overdue learners: ${overdueLearners.length}`, {
    x: 48,
    y: 638,
    size: 14,
    font: bold,
    color: rgb(0.7, 0.15, 0.12),
  });
  overdueLearners.slice(0, 30).forEach((name, index) => {
    page.drawText(`${index + 1}. ${name}`, {
      x: 64,
      y: 610 - index * 17,
      size: 10,
      font: regular,
    });
  });

  return document.save();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] as string);
}

export async function deliverCourseReport(
  input: unknown,
  now = new Date(),
): Promise<ReportDecision | (SendEmailResult & { action: "send" })> {
  const request = reportRequestSchema.parse(input);
  const decision = decideReportDelivery(request, now);
  if (decision.action === "skip") return decision;

  const pdf = await buildPdf(request, decision.overdueLearners);
  const encodedPdf = Buffer.from(pdf).toString("base64");
  const safeTitle = escapeHtml(request.course.title);
  const safeName = escapeHtml(request.educator.name);
  const html = `<p>Hi ${safeName},</p><p>${safeTitle} has ${decision.overdueLearners.length} overdue learner(s).</p><p><a download="${escapeHtml(request.reportId)}.pdf" href="data:application/pdf;base64,${encodedPdf}">Download the PDF report</a></p>`;
  const idempotencyKey = createHash("sha256")
    .update(`course-report:${request.reportId}`)
    .digest("hex");
  const sent = await infrai.email.send(
    {
      to: request.educator.email,
      subject: `${request.course.title}: deadline report`,
      html,
      idempotency_key: idempotencyKey,
    },
  );

  return { action: "send", message_id: sent.message_id };
}
