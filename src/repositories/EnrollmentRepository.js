import BaseRepository from './BaseRepository.js';

export default class EnrollmentRepository extends BaseRepository {
  constructor() {
    super('course_enrollments', { primaryKey: 'id' });
  }

  async isEnrolled(courseId, studentId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return !!data;
  }

  async getCourseStudents(courseId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        student_id,
        enrolled_at,
        student:student_id (
          id,
          name,
          email
        )
      `)
      .eq('course_id', courseId);

    if (error) throw new Error(error.message);
    // Flatten structure for easier consumption
    return data.map(row => ({
      ...row.student,
      enrolled_at: row.enrolled_at
    }));
  }
}
