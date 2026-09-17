/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE assessments (
      id UUID PRIMARY KEY,
      discipline_id UUID NOT NULL REFERENCES disciplines (id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      weight NUMERIC(5, 4) NOT NULL,
      due_on DATE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT assessments_weight_chk CHECK (weight > 0 AND weight <= 1)
    );

    CREATE INDEX assessments_discipline_id_idx ON assessments (discipline_id);
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS assessments;`);
};
