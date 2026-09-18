/**
 * V2.2 academic model.
 *
 * Disciplines become annual, user-owned offerings for an academic year.
 * Assessment slots are CP/GS in semester 1 and 2. Score scale becomes 0–100.
 *
 * Existing V1 assessments (Checkpoint 1/2, Challenge) and 0–10 scores cannot
 * map honestly onto the annual CP/GS slots. This environment was verified as
 * fictitious seed-only data before replacement (single student, one enrollment
 * per discipline, scores in 0–10, V1 assessment names only).
 *
 * Users, enrollments, discipline IDs, professors, terms and tasks are preserved.
 *
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
      unexpected_assessments INTEGER;
      out_of_scale INTEGER;
      shared_disciplines INTEGER;
      orphan_disciplines INTEGER;
    BEGIN
      SELECT COUNT(*) INTO unexpected_assessments
      FROM assessments
      WHERE name NOT IN ('Checkpoint 1', 'Checkpoint 2', 'Challenge');

      IF unexpected_assessments > 0 THEN
        RAISE EXCEPTION
          'Refusing V2.2 migration: found % non-seed assessment names',
          unexpected_assessments;
      END IF;

      SELECT COUNT(*) INTO out_of_scale
      FROM grades
      WHERE score < 0 OR score > 10;

      IF out_of_scale > 0 THEN
        RAISE EXCEPTION
          'Refusing V2.2 migration: found % scores outside the V1 0–10 scale',
          out_of_scale;
      END IF;

      SELECT COUNT(*) INTO shared_disciplines
      FROM (
        SELECT discipline_id
        FROM enrollments
        GROUP BY discipline_id
        HAVING COUNT(*) > 1
      ) shared;

      IF shared_disciplines > 0 THEN
        RAISE EXCEPTION
          'Refusing V2.2 migration: % disciplines have more than one enrollment',
          shared_disciplines;
      END IF;

      SELECT COUNT(*) INTO orphan_disciplines
      FROM disciplines d
      WHERE NOT EXISTS (
        SELECT 1 FROM enrollments e WHERE e.discipline_id = d.id
      );

      IF orphan_disciplines > 0 THEN
        RAISE EXCEPTION
          'Refusing V2.2 migration: % disciplines have no enrollment to derive ownership',
          orphan_disciplines;
      END IF;
    END $$;

    ALTER TABLE disciplines
      ADD COLUMN owner_user_id UUID REFERENCES users (id) ON DELETE RESTRICT,
      ADD COLUMN academic_year INTEGER;

    UPDATE disciplines d
    SET
      owner_user_id = e.user_id,
      academic_year = t.year
    FROM enrollments e, terms t
    WHERE e.discipline_id = d.id
      AND t.id = d.term_id;

    ALTER TABLE disciplines
      ALTER COLUMN owner_user_id SET NOT NULL,
      ALTER COLUMN academic_year SET NOT NULL;

    ALTER TABLE disciplines
      DROP CONSTRAINT disciplines_term_code_unique;

    ALTER TABLE disciplines
      ADD CONSTRAINT disciplines_owner_year_code_unique
        UNIQUE (owner_user_id, academic_year, code);

    CREATE INDEX disciplines_owner_user_id_idx ON disciplines (owner_user_id);
    CREATE INDEX disciplines_academic_year_idx ON disciplines (academic_year);

    ALTER TABLE enrollments
      ADD COLUMN total_classes INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN absences INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE enrollments
      ADD CONSTRAINT enrollments_total_classes_chk CHECK (total_classes >= 0),
      ADD CONSTRAINT enrollments_absences_chk CHECK (absences >= 0),
      ADD CONSTRAINT enrollments_absences_lte_classes_chk CHECK (absences <= total_classes);

    ALTER TABLE grades DROP CONSTRAINT grades_score_chk;
    ALTER TABLE grades ALTER COLUMN score TYPE NUMERIC(5, 2);
    ALTER TABLE grades
      ADD CONSTRAINT grades_score_chk CHECK (score >= 0 AND score <= 100);

    ALTER TABLE assessments
      ADD COLUMN semester SMALLINT,
      ADD COLUMN kind TEXT;

    DELETE FROM grades;
    DELETE FROM assessments;

    INSERT INTO assessments (
      id, discipline_id, name, weight, due_on, sort_order, semester, kind
    )
    SELECT
      (
        CASE
          WHEN d.id::text LIKE 'a4444444-4444-4444-8444-00000000000%' THEN
            'a6666666-6666-4666-8666-000000000' ||
            right(d.id::text, 1) ||
            slot.semester::text ||
            slot.kind_n
          ELSE
            substr(md5(d.id::text || slot.semester::text || slot.kind), 1, 8) || '-' ||
            substr(md5(d.id::text || slot.semester::text || slot.kind), 9, 4) || '-' ||
            '4' || substr(md5(d.id::text || slot.semester::text || slot.kind), 13, 3) || '-' ||
            '8' || substr(md5(d.id::text || slot.semester::text || slot.kind), 17, 3) || '-' ||
            substr(md5(d.id::text || slot.semester::text || slot.kind), 21, 12)
        END
      )::uuid,
      d.id,
      slot.kind,
      slot.weight,
      NULL,
      slot.sort_order,
      slot.semester,
      slot.kind
    FROM disciplines d
    CROSS JOIN (
      VALUES
        (1, 'CP', '1', 0.4000, 1),
        (1, 'GS', '2', 0.6000, 2),
        (2, 'CP', '1', 0.4000, 3),
        (2, 'GS', '2', 0.6000, 4)
    ) AS slot(semester, kind, kind_n, weight, sort_order);

    ALTER TABLE assessments
      ALTER COLUMN semester SET NOT NULL,
      ALTER COLUMN kind SET NOT NULL;

    ALTER TABLE assessments
      ADD CONSTRAINT assessments_semester_chk CHECK (semester IN (1, 2)),
      ADD CONSTRAINT assessments_kind_chk CHECK (kind IN ('CP', 'GS')),
      ADD CONSTRAINT assessments_discipline_semester_kind_unique
        UNIQUE (discipline_id, semester, kind);
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE assessments
      DROP CONSTRAINT IF EXISTS assessments_discipline_semester_kind_unique,
      DROP CONSTRAINT IF EXISTS assessments_semester_chk,
      DROP CONSTRAINT IF EXISTS assessments_kind_chk;

    ALTER TABLE assessments
      DROP COLUMN IF EXISTS semester,
      DROP COLUMN IF EXISTS kind;

    ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_score_chk;

    UPDATE grades
    SET score = score / 10
    WHERE score > 10;

    ALTER TABLE grades ALTER COLUMN score TYPE NUMERIC(4, 2);
    ALTER TABLE grades
      ADD CONSTRAINT grades_score_chk CHECK (score >= 0 AND score <= 10);

    ALTER TABLE enrollments
      DROP CONSTRAINT IF EXISTS enrollments_absences_lte_classes_chk,
      DROP CONSTRAINT IF EXISTS enrollments_absences_chk,
      DROP CONSTRAINT IF EXISTS enrollments_total_classes_chk;

    ALTER TABLE enrollments
      DROP COLUMN IF EXISTS total_classes,
      DROP COLUMN IF EXISTS absences;

    DROP INDEX IF EXISTS disciplines_academic_year_idx;
    DROP INDEX IF EXISTS disciplines_owner_user_id_idx;

    ALTER TABLE disciplines
      DROP CONSTRAINT IF EXISTS disciplines_owner_year_code_unique;

    ALTER TABLE disciplines
      ADD CONSTRAINT disciplines_term_code_unique UNIQUE (term_id, code);

    ALTER TABLE disciplines
      DROP COLUMN IF EXISTS owner_user_id,
      DROP COLUMN IF EXISTS academic_year;
  `);
};
