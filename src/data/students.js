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
  // Elementary · Kindergarten
  { id: 's1', name: 'Elias Braun', grade: 0, initials: 'EB' },
  { id: 's2', name: 'Maya Okafor', grade: 0, initials: 'MO' },
  { id: 's3', name: 'Theo Lindqvist', grade: 0, initials: 'TL' },
  { id: 's4', name: 'Amina Sesay', grade: 0, initials: 'AS' },
  { id: 's5', name: 'Jonah Pierce', grade: 0, initials: 'JP' },

  // Elementary · Grade 1
  { id: 's6', name: 'Noor Haddad', grade: 1, initials: 'NH' },
  { id: 's7', name: 'Tomas Ferreira', grade: 1, initials: 'TF' },
  { id: 's8', name: 'Iris Kaplan', grade: 1, initials: 'IK' },
  { id: 's9', name: 'Malik Osei', grade: 1, initials: 'MO' },
  { id: 's10', name: 'Rosa Delgado', grade: 1, initials: 'RD' },

  // Elementary · Grade 2
  { id: 's11', name: 'Ben Castellanos', grade: 2, initials: 'BC' },
  { id: 's12', name: 'Mei-Lin Chow', grade: 2, initials: 'MC' },
  { id: 's13', name: 'Aaliyah Freeman', grade: 2, initials: 'AF' },
  { id: 's14', name: 'Nikhil Rao', grade: 2, initials: 'NR' },
  { id: 's15', name: 'Clara Bergstrom', grade: 2, initials: 'CB' },

  // Elementary · Grade 3
  { id: 's16', name: 'Amara Okonjo', grade: 3, initials: 'AO' },
  { id: 's17', name: 'Dorian Wells', grade: 3, initials: 'DW' },
  { id: 's18', name: 'Yusuf Karim', grade: 3, initials: 'YK' },
  { id: 's19', name: 'Lena Petrov', grade: 3, initials: 'LP' },
  { id: 's20', name: 'Caleb Ruiz', grade: 3, initials: 'CR' },

  // Elementary · Grade 4
  { id: 's21', name: 'Priya Raghunathan', grade: 4, initials: 'PR' },
  { id: 's22', name: 'Grace Mwangi', grade: 4, initials: 'GM' },
  { id: 's23', name: 'Owen Kavanagh', grade: 4, initials: 'OK' },
  { id: 's24', name: 'Sofia Marchetti', grade: 4, initials: 'SM' },
  { id: 's25', name: 'Andre Duval', grade: 4, initials: 'AD' },

  // Elementary · Grade 5
  { id: 's26', name: 'Oliver Nakamura', grade: 5, initials: 'ON' },
  { id: 's27', name: 'Zara Iqbal', grade: 5, initials: 'ZI' },
  { id: 's28', name: 'Marcus Bell', grade: 5, initials: 'MB' },
  { id: 's29', name: 'Hana Yoshida', grade: 5, initials: 'HY' },
  { id: 's30', name: 'Diego Salazar', grade: 5, initials: 'DS' },

  // Middle · Grade 6
  { id: 's31', name: 'Andre Whitfield', grade: 6, initials: 'AW' },
  { id: 's32', name: 'Lucia Moreno', grade: 6, initials: 'LM' },
  { id: 's33', name: 'Simone Achebe', grade: 6, initials: 'SA' },
  { id: 's34', name: 'Ethan Nordstrom', grade: 6, initials: 'EN' },
  { id: 's35', name: 'Farah Nasser', grade: 6, initials: 'FN' },

  // Middle · Grade 7
  { id: 's36', name: 'Kofi Boateng', grade: 7, initials: 'KB' },
  { id: 's37', name: 'Hannah Delgado', grade: 7, initials: 'HD' },
  { id: 's38', name: 'Julian Reyes', grade: 7, initials: 'JR' },
  { id: 's39', name: 'Nadia Petrosyan', grade: 7, initials: 'NP' },
  { id: 's40', name: 'Isaac Lindgren', grade: 7, initials: 'IL' },

  // Middle · Grade 8
  { id: 's41', name: 'Ravi Sundaram', grade: 8, initials: 'RS' },
  { id: 's42', name: 'Imani Clarke', grade: 8, initials: 'IC' },
  { id: 's43', name: 'Victor Almeida', grade: 8, initials: 'VA' },
  { id: 's44', name: 'Chloe Bergman', grade: 8, initials: 'CB' },
  { id: 's45', name: 'Omar Fadel', grade: 8, initials: 'OF' },

  // High · Grade 9
  { id: 's46', name: 'Jasmine Carter', grade: 9, initials: 'JC' },
  { id: 's47', name: 'Leo Vasquez', grade: 9, initials: 'LV' },
  { id: 's48', name: 'Anika Deshmukh', grade: 9, initials: 'AD' },
  { id: 's49', name: 'Connor Blaine', grade: 9, initials: 'CB' },
  { id: 's50', name: 'Yara Mansour', grade: 9, initials: 'YM' },

  // High · Grade 10
  { id: 's51', name: 'Mateo Rivas', grade: 10, initials: 'MR' },
  { id: 's52', name: 'Naomi Kirby', grade: 10, initials: 'NK' },
  { id: 's53', name: 'Sebastian Hoang', grade: 10, initials: 'SH' },
  { id: 's54', name: 'Talia Rosenberg', grade: 10, initials: 'TR' },
  { id: 's55', name: 'Darius Cole', grade: 10, initials: 'DC' },

  // High · Grade 11
  { id: 's56', name: 'Aisha Bello', grade: 11, initials: 'AB' },
  { id: 's57', name: 'Nathan Okamoto', grade: 11, initials: 'NO' },
  { id: 's58', name: 'Elena Vukovic', grade: 11, initials: 'EV' },
  { id: 's59', name: 'Jamal Prescott', grade: 11, initials: 'JP' },
  { id: 's60', name: 'Ruby Sinclair', grade: 11, initials: 'RS' },

  // High · Grade 12
  { id: 's61', name: 'Daniel Kowalski', grade: 12, initials: 'DK' },
  { id: 's62', name: 'Simone Laurent', grade: 12, initials: 'SL' },
  { id: 's63', name: 'Tobias Amari', grade: 12, initials: 'TA' },
  { id: 's64', name: 'Priya Venkatesan', grade: 12, initials: 'PV' },
  { id: 's65', name: 'Ezra Whitfield', grade: 12, initials: 'EW' },
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
