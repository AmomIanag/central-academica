/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE disciplines (
      id UUID PRIMARY KEY,
      term_id UUID NOT NULL REFERENCES terms (id) ON DELETE RESTRICT,
      professor_id UUID NOT NULL REFERENCES professors (id) ON DELETE RESTRICT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      CONSTRAINT disciplines_term_code_unique UNIQUE (term_id, code)
    );

    CREATE INDEX disciplines_term_id_idx ON disciplines (term_id);
    CREATE INDEX disciplines_professor_id_idx ON disciplines (professor_id);
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS disciplines;`);
};
