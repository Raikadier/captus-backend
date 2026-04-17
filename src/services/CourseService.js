import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';
import crypto from 'crypto';
import { OperationResult } from '../shared/OperationResult.js';

export default class CourseService {
  constructor(courseRepo, enrollmentRepo) {
    this.courseRepo = courseRepo || new CourseRepository();
    this.enrollmentRepo = enrollmentRepo || new EnrollmentRepository();
  }

  async createCourse(data, teacherId) {
    try {
      if (!data?.title || data.title.trim() === '') {
        return new OperationResult(false, 'El título del curso es requerido.');
      }
      if (!teacherId) {
        return new OperationResult(false, 'El ID del profesor es requerido.');
      }

      let inviteCode;
      let isUnique = false;
      while (!isUnique) {
        inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const existing = await this.courseRepo.findByInviteCode(inviteCode);
        if (!existing) isUnique = true;
      }

      const courseData = { ...data, teacher_id: teacherId, invite_code: inviteCode };
      const course = await this.courseRepo.save(courseData);
      return new OperationResult(true, 'Curso creado exitosamente.', course);
    } catch (error) {
      return new OperationResult(false, `Error al crear el curso: ${error.message}`);
    }
  }

  async getCoursesForUser(userId, role) {
    try {
      if (!userId) return new OperationResult(false, 'ID de usuario requerido.');

      let courses;
      if (role === 'teacher') {
        const rawCourses = await this.courseRepo.findByTeacher(userId);
        courses = rawCourses.map(course => ({
          ...course,
          students: course.enrollments?.[0]?.count || 0,
          pendingTasks: 0
        }));
      } else {
        const enrollments = await this.courseRepo.findByStudent(userId);
        courses = enrollments.map(item => ({
          ...item.courses,
          professor: item.courses?.teacher?.name || 'Profesor',
          progress: 0,
          enrolled_at: item.enrolled_at
        }));
      }

      return new OperationResult(true, 'Cursos obtenidos exitosamente.', courses);
    } catch (error) {
      return new OperationResult(false, `Error al obtener cursos: ${error.message}`);
    }
  }

  async getCourseDetail(courseId, userId, role) {
    try {
      const course = await this.courseRepo.getById(courseId);
      if (!course) return new OperationResult(false, 'Curso no encontrado.');

      if (role === 'teacher') {
        if (course.teacher_id !== userId) {
          return new OperationResult(false, 'No tienes permiso para ver este curso.');
        }
      } else {
        const isEnrolled = await this.enrollmentRepo.isEnrolled(courseId, userId);
        if (!isEnrolled) return new OperationResult(false, 'No estás inscrito en este curso.');
      }

      return new OperationResult(true, 'Curso encontrado.', course);
    } catch (error) {
      return new OperationResult(false, `Error al obtener el curso: ${error.message}`);
    }
  }

  async updateCourse(courseId, data, teacherId) {
    try {
      const course = await this.courseRepo.getById(courseId);
      if (!course) return new OperationResult(false, 'Curso no encontrado.');
      if (course.teacher_id !== teacherId) {
        return new OperationResult(false, 'No tienes permiso para editar este curso.');
      }

      const updated = await this.courseRepo.update(courseId, data);
      return new OperationResult(true, 'Curso actualizado exitosamente.', updated);
    } catch (error) {
      return new OperationResult(false, `Error al actualizar el curso: ${error.message}`);
    }
  }

  async deleteCourse(courseId, teacherId) {
    try {
      const course = await this.courseRepo.getById(courseId);
      if (!course) return new OperationResult(false, 'Curso no encontrado.');
      if (course.teacher_id !== teacherId) {
        return new OperationResult(false, 'No tienes permiso para eliminar este curso.');
      }

      await this.courseRepo.delete(courseId);
      return new OperationResult(true, 'Curso eliminado exitosamente.');
    } catch (error) {
      return new OperationResult(false, `Error al eliminar el curso: ${error.message}`);
    }
  }

  async getCourseGrades(courseId, teacherId) {
    try {
      const course = await this.courseRepo.getById(courseId);
      if (!course) return new OperationResult(false, 'Curso no encontrado.');
      if (course.teacher_id !== teacherId) {
        return new OperationResult(false, 'No tienes permiso para descargar las notas de este curso.');
      }

      const enrollments = await this.enrollmentRepo.getCourseStudents(courseId);
      const grades = enrollments.map(e => ({
        studentName: e.name || 'Estudiante',
        studentEmail: e.email || 'N/A',
        grade: e.grade || 0,
        enrolledAt: e.enrolled_at
      }));

      return new OperationResult(true, 'Notas obtenidas exitosamente.', grades);
    } catch (error) {
      return new OperationResult(false, `Error al obtener notas: ${error.message}`);
    }
  }
}
