/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE grades (
      id UUID PRIMARY KEY,
      enrollment_id UUID NOT NULL REFERENCES enrollments (id) ON DELETE RESTRICT,
      assessment_id UUID NOT NULL REFERENCES assessments (id) ON DELETE RESTRICT,
      score NUMERIC(4, 2) NOT NULL,
      CONSTRAINT grades_score_chk CHECK (score >= 0 AND score <= 10),
      CONSTRAINT grades_enrollment_assessment_unique UNIQUE (enrollment_id, assessment_id)
    );

    CREATE INDEX grades_enrollment_id_idx ON grades (enrollment_id);
    CREATE INDEX grades_assessment_id_idx ON grades (assessment_id);
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS grades;`);
};
