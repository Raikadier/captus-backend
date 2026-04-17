import BaseRepository from './BaseRepository.js';

export default class AssignmentRepository extends BaseRepository {
  constructor() {
    super('course_assignments', { primaryKey: 'id' });
  }

  async findByCourse(courseId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  async getUpcomingDeadlines(days = 3) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        id,
        title,
        due_date,
        course_id,
        courses (
          title,
          course_enrollments (
            user_id
          )
        )
      `)
      .lte('due_date', future.toISOString())
      .gte('due_date', now.toISOString());

    if (error) throw new Error(error.message);
    return data || [];
  }
}
