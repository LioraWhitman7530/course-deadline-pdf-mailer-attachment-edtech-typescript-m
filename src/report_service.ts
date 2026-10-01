import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ZodError } from "zod";
import { deliverCourseReport } from "./course_report.js";
import { InfraiError } from "./infrai_email.js";

const service = new Hono();

service.post("/reports/course-deadline", async (context) => {
  try {
    const body = await context.req.json();
    const result = await deliverCourseReport(body);
    return context.json(result, result.action === "send" ? 202 : 200);
  } catch (error) {
    if (error instanceof ZodError) {
      return context.json({ error: "invalid_request", issues: error.issues }, 400);
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return context.json({ error: error.code, message: error.message }, status as 400);
    }
    console.error(error);
    return context.json({ error: "report_delivery_failed" }, 500);
  }
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: service.fetch, port });
console.log(`Course report service listening on http://localhost:${port}`);
