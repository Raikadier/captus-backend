import BaseRepository from './BaseRepository.js';

export default class AcademicGroupRepository extends BaseRepository {
  constructor() {
    super('course_groups', { primaryKey: 'id' });
  }

  async findByCourse(courseId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        members:course_group_members(
           student_id,
           joined_at
        )
      `)
      .eq('course_id', courseId);

    if (error) throw new Error(error.message);
    return data;
  }

  async addMember(groupId, studentId) {
    const { data, error } = await this.client
      .from('course_group_members')
      .insert({ group_id: groupId, student_id: studentId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async removeMember(groupId, studentId) {
    const { error } = await this.client
      .from('course_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('student_id', studentId);

    if (error) throw new Error(error.message);
    return true;
  }
  async findByStudent(studentId) {
    const { data, error } = await this.client
      .from('course_group_members')
      .select(`
        group_id,
        group:group_id (
          *,
          members:course_group_members(count)
        )
      `)
      .eq('student_id', studentId);

    if (error) throw new Error(error.message);

    // Flatten and format
    return data.map(item => ({
      ...item.group,
      members: item.group.members[0].count // Approximate member count
    }));
  }
}
