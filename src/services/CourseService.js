import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';
import { requireSupabaseClient } from '../lib/supabaseAdmin.js';
import crypto from 'crypto';

export default class CourseService {
  constructor(courseRepo, enrollmentRepo) {
    this.courseRepo = courseRepo || new CourseRepository();
    this.enrollmentRepo = enrollmentRepo || new EnrollmentRepository();
  }

  async createCourse(data, teacherId) {
    // Generate unique invite code
    let inviteCode;
    let isUnique = false;

    while (!isUnique) {
      inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
      const existing = await this.courseRepo.findByInviteCode(inviteCode);
      if (!existing) isUnique = true;
    }

    const courseData = {
      ...data,
      teacher_id: teacherId,
      invite_code: inviteCode
    };

    return await this.courseRepo.save(courseData);
  }

  async getCoursesForUser(userId, role) {
    if (role === 'teacher') {
      const courses = await this.courseRepo.findByTeacher(userId);
      // Transform data for teacher view (add counts)
      return courses.map(course => ({
        ...course,
        students: course.enrollments?.[0]?.count || 0,
        pendingTasks: 0 // Placeholder as per original logic
      }));
    } else {
      const enrollments = await this.courseRepo.findByStudent(userId);
      // Transform data for student view
      return enrollments.map(item => ({
        ...item.courses,
        professor: item.courses?.teacher?.name || 'Profesor',
        progress: 0,
        enrolled_at: item.enrolled_at
      }));
    }
  }

  async getCourseDetail(courseId, userId, role) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');

    // Access Control
    if (role === 'teacher') {
      if (course.teacher_id !== userId) throw new Error('No tienes permiso para ver este curso');
    } else {
      const isEnrolled = await this.enrollmentRepo.isEnrolled(courseId, userId);
      if (!isEnrolled) throw new Error('No estás inscrito en este curso');
    }

    return course;
  }

  async updateCourse(courseId, data, teacherId) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');
    if (course.teacher_id !== teacherId) throw new Error('No tienes permiso para editar este curso');

    return await this.courseRepo.update(courseId, data);
  }

  async deleteCourse(courseId, teacherId) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');
    if (course.teacher_id !== teacherId) throw new Error('No tienes permiso para eliminar este curso');

    return await this.courseRepo.delete(courseId);
  }

  async getCourseGrades(courseId, teacherId) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');
    if (course.teacher_id !== teacherId) throw new Error('No tienes permiso para descargar las notas de este curso');

    const supabase = requireSupabaseClient();

    // Get enrolled students
    const students = await this.enrollmentRepo.getCourseStudents(courseId);

    // Get all submissions for this course via assignments → group submissions
    const { data: assignments } = await supabase
      .from('course_assignments')
      .select('id, title')
      .eq('course_id', courseId);

    if (!assignments?.length) {
      return students.map(s => ({
        student_id: s.id,
        studentName: s.name || 'Estudiante',
        studentEmail: s.email || 'N/A',
        grade: null,
        enrolledAt: s.enrolled_at,
      }));
    }

    const assignmentIds = assignments.map(a => a.id);

    // Get submissions for these assignments (group-based)
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, group_id, grade, graded')
      .in('assignment_id', assignmentIds)
      .eq('graded', true);

    // Get group members to map group → student
    if (!submissions?.length) {
      return students.map(s => ({
        student_id: s.id,
        studentName: s.name || 'Estudiante',
        studentEmail: s.email || 'N/A',
        grade: null,
        enrolledAt: s.enrolled_at,
      }));
    }

    const groupIds = [...new Set(submissions.map(s => s.group_id).filter(Boolean))];
    const { data: groupMembers } = await supabase
      .from('course_group_members')
      .select('group_id, student_id')
      .in('group_id', groupIds);

    // Build: studentId → [grades]
    const studentGrades = {};
    for (const sub of submissions) {
      if (!sub.group_id || sub.grade === null) continue;
      const members = groupMembers?.filter(m => m.group_id === sub.group_id) ?? [];
      for (const member of members) {
        if (!studentGrades[member.student_id]) studentGrades[member.student_id] = [];
        studentGrades[member.student_id].push(sub.grade);
      }
    }

    return students.map(s => {
      const grades = studentGrades[s.id] ?? [];
      const avg = grades.length
        ? grades.reduce((a, b) => a + b, 0) / grades.length
        : null;
      return {
        student_id: s.id,
        studentName: s.name || 'Estudiante',
        studentEmail: s.email || 'N/A',
        grade: avg,
        enrolledAt: s.enrolled_at,
      };
    });
  }
}
