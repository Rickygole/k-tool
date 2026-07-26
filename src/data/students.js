/**
 * Mock roster. There is no database and no auth in this build -- both are explicit non-goals.
 * A real deployment would read this from a roster sync (Clever, ClassLink, OneRoster); the
 * shape below is deliberately the subset such a sync would provide.
 *
 * `grade` here is the student's enrolled grade, which is NOT the same thing as the grade level
 * of the passage they read. Norms are looked up against the passage grade the teacher chose,
 * so a fourth grader reading a grade-2 passage is scored against grade-2 expectations and the
 * report says so.
 */

/**
 * School levels, in the order a teacher navigates them: level -> grade -> student.
 *
 * `hasOrfNorms` is the important field here and it is not cosmetic. Hasbrouck & Tindal 2017
 * publishes oral reading fluency norms for grades 1-6 ONLY, because ORF stops discriminating
 * usefully once decoding is fluent -- by middle school a struggling reader's difficulty is
 * usually comprehension or vocabulary rather than word recognition, and words-per-minute no
 * longer measures it.
 *
 * A middle or high school student still gets a real WCPM, a real accuracy figure, and a
 * percentile -- but that percentile is computed from the PASSAGE's grade, which is how score()
 * is called (`grade: passage.grade`). Since every passage here is grade 2-4, the band always
 * resolves; what does not exist is any comparison against the student's own year group.
 *
 * That distinction is the whole reason this flag exists. "Reads grade-3 text at a typical
 * grade-3 rate" is a true and useful statement about a tenth grader. "50th percentile" without
 * that qualifier would imply a national comparison that has never been published for grade 10.
 * The interface says which one it means at the point of selection.
 */
export const SCHOOL_LEVELS = [
  {
    key: 'elementary',
    label: 'Elementary School',
    blurb: 'Kindergarten through Grade 5',
    grades: [0, 1, 2, 3, 4, 5],
    hasOrfNorms: true,
  },
  {
    key: 'middle',
    label: 'Middle School',
    blurb: 'Grades 6 through 8',
    grades: [6, 7, 8],
    hasOrfNorms: false,
  },
  {
    key: 'high',
    label: 'High School',
    blurb: 'Grades 9 through 12',
    grades: [9, 10, 11, 12],
    hasOrfNorms: false,
  },
]

/** Grade 0 is kindergarten. Rendered as "K" wherever a grade is shown. */
export function gradeLabel(grade) {
  return grade === 0 ? 'K' : String(grade)
}

export const STUDENTS = [
  // Elementary
  { id: 's1', name: 'Amara Okonjo', grade: 3, initials: 'AO' },
  { id: 's2', name: 'Ben Castellanos', grade: 2, initials: 'BC' },
  { id: 's3', name: 'Priya Raghunathan', grade: 4, initials: 'PR' },
  { id: 's4', name: 'Dorian Wells', grade: 3, initials: 'DW' },
  { id: 's5', name: 'Mei-Lin Chow', grade: 2, initials: 'MC' },
  { id: 's6', name: 'Elias Braun', grade: 0, initials: 'EB' },
  { id: 's7', name: 'Noor Haddad', grade: 1, initials: 'NH' },
  { id: 's8', name: 'Tomas Ferreira', grade: 1, initials: 'TF' },
  { id: 's9', name: 'Grace Mwangi', grade: 4, initials: 'GM' },
  { id: 's10', name: 'Oliver Nakamura', grade: 5, initials: 'ON' },
  { id: 's11', name: 'Zara Iqbal', grade: 5, initials: 'ZI' },

  // Middle
  { id: 's12', name: 'Andre Whitfield', grade: 6, initials: 'AW' },
  { id: 's13', name: 'Lucia Moreno', grade: 6, initials: 'LM' },
  { id: 's14', name: 'Kofi Boateng', grade: 7, initials: 'KB' },
  { id: 's15', name: 'Hannah Delgado', grade: 7, initials: 'HD' },
  { id: 's16', name: 'Ravi Sundaram', grade: 8, initials: 'RS' },

  // High
  { id: 's17', name: 'Jasmine Carter', grade: 9, initials: 'JC' },
  { id: 's18', name: 'Mateo Rivas', grade: 10, initials: 'MR' },
  { id: 's19', name: 'Aisha Bello', grade: 11, initials: 'AB' },
  { id: 's20', name: 'Daniel Kowalski', grade: 12, initials: 'DK' },
]

/** The level a grade belongs to, or null if it is outside K-12. */
export function levelForGrade(grade) {
  return SCHOOL_LEVELS.find((l) => l.grades.includes(grade)) ?? null
}

/** Students in one grade, ordered by name. */
export function studentsInGrade(grade) {
  return STUDENTS.filter((s) => s.grade === grade).sort((a, b) => a.name.localeCompare(b.name))
}

/** How many students each grade holds -- shown on the grade cards so empty grades are visible. */
export function gradeCounts(levelKey) {
  const level = SCHOOL_LEVELS.find((l) => l.key === levelKey)
  if (!level) return []
  return level.grades.map((grade) => ({ grade, count: studentsInGrade(grade).length }))
}
