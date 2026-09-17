/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE enrollments (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
      discipline_id UUID NOT NULL REFERENCES disciplines (id) ON DELETE RESTRICT,
      CONSTRAINT enrollments_user_discipline_unique UNIQUE (user_id, discipline_id)
    );

    CREATE INDEX enrollments_user_id_idx ON enrollments (user_id);
    CREATE INDEX enrollments_discipline_id_idx ON enrollments (discipline_id);
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS enrollments;`);
};
