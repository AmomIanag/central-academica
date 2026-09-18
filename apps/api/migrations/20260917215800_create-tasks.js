/**
 * Personal student tasks. Distinct from academic assessments/grades.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE tasks (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
      discipline_id UUID NULL,
      title TEXT NOT NULL,
      description TEXT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      due_on DATE NULL,
      due_at TIMESTAMPTZ NULL,
      completed_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT tasks_priority_chk CHECK (priority IN ('low', 'normal', 'high')),
      CONSTRAINT tasks_due_exclusive_chk CHECK (NOT (due_on IS NOT NULL AND due_at IS NOT NULL)),
      CONSTRAINT tasks_title_chk CHECK (title = btrim(title) AND char_length(title) BETWEEN 1 AND 160),
      CONSTRAINT tasks_description_chk CHECK (
        description IS NULL
        OR (description = btrim(description) AND char_length(description) BETWEEN 1 AND 4000)
      ),
      CONSTRAINT tasks_enrollment_fk
        FOREIGN KEY (user_id, discipline_id)
        REFERENCES enrollments (user_id, discipline_id)
        ON DELETE RESTRICT
    );

    -- List and ownership lookups always filter by user_id.
    CREATE INDEX tasks_user_id_idx ON tasks (user_id);

    -- Agenda/date-only range filters: due_on compared as DATE.
    CREATE INDEX tasks_user_due_on_idx ON tasks (user_id, due_on);

    -- Agenda/datetime range filters: due_at compared as UTC instants.
    CREATE INDEX tasks_user_due_at_idx ON tasks (user_id, due_at);

    -- Filter by associated enrolled discipline.
    CREATE INDEX tasks_user_discipline_id_idx ON tasks (user_id, discipline_id);

    -- Dashboard/summary and pending lists; status is derived from completed_at.
    CREATE INDEX tasks_user_pending_idx ON tasks (user_id) WHERE completed_at IS NULL;
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS tasks;`);
};
