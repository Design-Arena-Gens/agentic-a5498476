"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";

type CallStatus = "queued" | "success" | "error";

type CallLogEntry = {
  id: string;
  createdAt: string;
  status: CallStatus;
  recipientName: string;
  recipientNumber: string;
  objective: string;
  notes?: string;
  responseMessage: string;
};

const callRequestSchema = z.object({
  callerName: z.string().trim().min(2, "Caller name is required"),
  callerNumber: z.string().trim().optional(),
  recipientName: z.string().trim().min(2, "Recipient name is required"),
  recipientNumber: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,14}$/, "Enter an E.164 phone number, e.g. +15551234567"),
  objective: z.string().trim().min(5, "Please describe what the agent should say"),
  notes: z.string().trim().optional()
});

type CallRequestFormState = z.infer<typeof callRequestSchema>;

const defaultForm: CallRequestFormState = {
  callerName: "Agentic Assistant",
  callerNumber: "",
  recipientName: "",
  recipientNumber: "",
  objective: "",
  notes: ""
};

export default function HomePage() {
  const [form, setForm] = useState<CallRequestFormState>(defaultForm);
  const [logs, setLogs] = useState<CallLogEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const totalCalls = useMemo(() => logs.length, [logs]);
  const successfulCalls = useMemo(
    () => logs.filter((log) => log.status === "success").length,
    [logs]
  );

  const onChange = (field: keyof CallRequestFormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const resetForm = () => {
    setForm(defaultForm);
    setFormErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = callRequestSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const optimisticLog: CallLogEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "queued",
      recipientName: result.data.recipientName,
      recipientNumber: result.data.recipientNumber,
      objective: result.data.objective,
      notes: result.data.notes,
      responseMessage: "Sending call request..."
    };
    setLogs((prev) => [optimisticLog, ...prev]);

    try {
      const response = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data)
      });

      const payload = (await response.json()) as { success: boolean; message: string };

      setLogs((prev) =>
        prev.map((log) =>
          log.id === optimisticLog.id
            ? {
                ...log,
                status: payload.success ? "success" : "error",
                responseMessage: payload.message
              }
            : log
        )
      );

      if (payload.success) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      setLogs((prev) =>
        prev.map((log) =>
          log.id === optimisticLog.id
            ? {
                ...log,
                status: "error",
                responseMessage:
                  "Unexpected error communicating with the call service. Check server logs."
              }
            : log
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <h1>Agentic Call Assistant</h1>
        <p>
          Launch a voice call in seconds. Define the objective, and the agent will craft a friendly
          script, dial your contact, and deliver the message.
        </p>
      </section>

      <section className="grid">
        <form className="card form" onSubmit={handleSubmit}>
          <h2>Call Blueprint</h2>
          <p className="helper">
            Provide the details and the assistant will handle the rest. All phone numbers must be in
            E.164 format (e.g. +15551234567).
          </p>

          <div className="field">
            <label htmlFor="callerName">Agent identity</label>
            <input
              id="callerName"
              value={form.callerName}
              onChange={(event) => onChange("callerName")(event.target.value)}
              placeholder="Agentic Assistant"
            />
            {formErrors.callerName ? <span className="error">{formErrors.callerName}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="callerNumber">Callback number (optional)</label>
            <input
              id="callerNumber"
              value={form.callerNumber ?? ""}
              onChange={(event) => onChange("callerNumber")(event.target.value)}
              placeholder="+15551234567"
            />
          </div>

          <div className="field">
            <label htmlFor="recipientName">Recipient</label>
            <input
              id="recipientName"
              value={form.recipientName}
              onChange={(event) => onChange("recipientName")(event.target.value)}
              placeholder="Jamie Rivera"
            />
            {formErrors.recipientName ? (
              <span className="error">{formErrors.recipientName}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="recipientNumber">Recipient number</label>
            <input
              id="recipientNumber"
              value={form.recipientNumber}
              onChange={(event) => onChange("recipientNumber")(event.target.value)}
              placeholder="+15559876543"
            />
            {formErrors.recipientNumber ? (
              <span className="error">{formErrors.recipientNumber}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="objective">Objective</label>
            <textarea
              id="objective"
              value={form.objective}
              onChange={(event) => onChange("objective")(event.target.value)}
              placeholder="Confirm tomorrow's 10 AM meeting and share dial-in details."
              rows={4}
            />
            {formErrors.objective ? <span className="error">{formErrors.objective}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="notes">Additional notes</label>
            <textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(event) => onChange("notes")(event.target.value)}
              placeholder="Be warm and mention that this is a quick automated reminder."
              rows={3}
            />
          </div>

          <div className="actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Placing call…" : "Place call"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              className="secondary"
              onClick={resetForm}
            >
              Reset
            </button>
          </div>
        </form>

        <aside className="card activity">
          <h2>Activity Feed</h2>
          <div className="stats">
            <div className="stat">
              <span className="stat-number">{totalCalls}</span>
              <span className="stat-label">Total calls</span>
            </div>
            <div className="stat">
              <span className="stat-number accent">{successfulCalls}</span>
              <span className="stat-label">Success</span>
            </div>
          </div>

          <div className="log">
            {logs.length === 0 ? (
              <p className="helper">No calls yet. Submit the form to queue your first call.</p>
            ) : (
              logs.map((log) => (
                <article className={`log-entry status-${log.status}`} key={log.id}>
                  <header>
                    <div>
                      <strong>{log.recipientName}</strong>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="badge">{log.status}</span>
                  </header>
                  <p>{log.objective}</p>
                  {log.notes ? <p className="notes">Notes: {log.notes}</p> : null}
                  <footer>{log.responseMessage}</footer>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
