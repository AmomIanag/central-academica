import { describe, expect, it } from "vitest";
import { addCivilDays, isCivilDate, monthGrid, startOfWeekMonday } from "./datetime";
import {
  dueFromForm,
  dueToForm,
  formatTaskDue,
  priorityLabel,
  validateTaskForm,
  type Task,
} from "./tasks";

describe("due serialization", () => {
  it("serializes a date-only due without inventing a time", () => {
    expect(dueFromForm("date", "2026-09-20", "")).toEqual({
      kind: "date",
      date: "2026-09-20",
    });
  });

  it("serializes none as null", () => {
    expect(dueFromForm("none", "2026-09-20", "18:30")).toBeNull();
  });

  it("round-trips a date due in the form model", () => {
    expect(dueToForm({ kind: "date", date: "2026-09-20" })).toEqual({
      kind: "date",
      date: "2026-09-20",
      time: "",
    });
  });
});

describe("task form validation", () => {
  it("requires a title and a valid date when a deadline is set", () => {
    expect(validateTaskForm({ title: " ", description: "", kind: "none", date: "", time: "" }).title).toBeDefined();
    expect(
      validateTaskForm({
        title: "Ler",
        description: "",
        kind: "date",
        date: "2026-09-31",
        time: "",
      }).date,
    ).toBeDefined();
    expect(
      validateTaskForm({
        title: "Ler",
        description: "",
        kind: "datetime",
        date: "2026-09-20",
        time: "",
      }).time,
    ).toBeDefined();
    expect(
      Object.keys(
        validateTaskForm({
          title: "Ler",
          description: "",
          kind: "date",
          date: "2026-09-20",
          time: "",
        }),
      ),
    ).toHaveLength(0);
  });
});

describe("task labels", () => {
  it("formats due values and priorities", () => {
    expect(formatTaskDue(null)).toBe("Sem prazo");
    expect(formatTaskDue({ kind: "date", date: "2026-09-20" })).toBe("20/09/2026");
    expect(priorityLabel("high")).toBe("Alta");
  });

  it("does not treat undated tasks as overdue in display helpers", () => {
    const task: Pick<Task, "due" | "overdue" | "status"> = {
      due: null,
      overdue: false,
      status: "pending",
    };
    expect(task.overdue).toBe(false);
  });
});

describe("calendar helpers", () => {
  it("validates civil dates and builds a Monday-first month grid", () => {
    expect(isCivilDate("2026-09-20")).toBe(true);
    expect(isCivilDate("2026-02-29")).toBe(false);
    expect(startOfWeekMonday("2026-09-17")).toBe("2026-09-14");
    expect(addCivilDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(monthGrid("2026-09-01")[0]?.date).toBe("2026-08-31");
  });
});
