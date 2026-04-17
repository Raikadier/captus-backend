import BaseRepository from './BaseRepository.js';

export default class CourseRepository extends BaseRepository {
  constructor() {
    super('courses', { primaryKey: 'id' });
  }

  async findByTeacher(teacherId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        enrollments:course_enrollments(count)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return data;
  }

  async findByStudent(studentId) {
    // Supabase join syntax: course_enrollments -> courses -> users (teacher)
    const { data, error } = await this.client
      .from('course_enrollments')
      .select(`
        course_id,
        enrolled_at,
        courses:course_id (
          *,
          teacher:teacher_id (
            name,
            email
          )
        )
      `)
      .eq('student_id', studentId);

    if (error) throw new Error(error.message);

    return data;
  }

  async findByInviteCode(code) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('invite_code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
  }
}
