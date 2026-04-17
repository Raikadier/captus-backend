import BaseRepository from './BaseRepository.js';

export default class SubmissionRepository extends BaseRepository {
  constructor() {
    super('assignment_submissions', { primaryKey: 'id' });
  }

  async findByAssignment(assignmentId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        student:student_id (
          id,
          name,
          email
        ),
        group:group_id (
          id,
          name
        )
      `)
      .eq('assignment_id', assignmentId);

    if (error) throw new Error(error.message);
    return data;
  }

  async findByStudent(studentId, assignmentId) {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('student_id', studentId);

    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Return single if assignmentId provided, else list
    return assignmentId ? (data[0] || null) : data;
  }

  async findByGroup(groupId, assignmentId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('group_id', groupId)
      .eq('assignment_id', assignmentId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
  }

  async findPendingByTeacher(teacherId) {
    // Join submissions -> assignments -> courses
    // Filter by course.teacher_id = teacherId AND submission.graded = false
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        assignment:assignment_id (
          id,
          title,
          course_id,
          course:course_id (
            id,
            title,
            teacher_id
          )
        ),
        student:student_id (
          name
        ),
        group:group_id (
          name
        )
      `)
      .eq('graded', false)
      .not('submitted_at', 'is', null); // Ensure it's submitted

    if (error) throw new Error(error.message);

    // Client-side filter for teacher_id (Supabase deep filtering has limits)
    // Or we could use !inner join if Supabase supports it well, but client filter is safer for now
    return data.filter(sub => sub.assignment?.course?.teacher_id === teacherId);
  }
}
