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
export const STUDENTS = [
  { id: 's1', name: 'Amara Okonjo', grade: 3, initials: 'AO' },
  { id: 's2', name: 'Ben Castellanos', grade: 2, initials: 'BC' },
  { id: 's3', name: 'Priya Raghunathan', grade: 4, initials: 'PR' },
  { id: 's4', name: 'Dorian Wells', grade: 3, initials: 'DW' },
  { id: 's5', name: 'Mei-Lin Chow', grade: 2, initials: 'MC' },
]
