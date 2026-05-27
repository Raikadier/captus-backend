import AdminService from '../services/AdminService.js';
import { OperationResult } from '../shared/OperationResult.js';
import { ctrl } from '../shared/asyncHandler.js';

const svc = new AdminService();

/** Resolves the institutionId for the authenticated admin — throws if none. */
async function resolveInstitutionId(req) {
  const inst = await svc.getMyInstitution(req.user.id);
  if (!inst) throw new Error('El administrador no tiene una institución asignada.');
  return inst.id;
}

export default class AdminController {

  // ── Institution ─────────────────────────────────────────────────────────

  getInstitution = ctrl(async (req) => {
    const inst = await svc.getMyInstitution(req.user.id);
    if (!inst) throw new Error('Sin institución. Crea una primero.');
    return inst;
  }, { ok: 200, fail: 404 });

  createInstitution = ctrl(async (req) => {
    return svc.createInstitution(req.body, req.user.id);
  }, { ok: 201 });

  updateInstitution = ctrl(async (req) => {
    return svc.updateInstitution(req.params.id, req.body, req.user.id);
  });

  getDashboardStats = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.getDashboardStats(institutionId);
  }, { ok: 200, fail: 500 });

  // ── Users ───────────────────────────────────────────────────────────────

  getMembers = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.getMembers(institutionId, req.query.role || null);
  }, { ok: 200, fail: 500 });

  inviteUser = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    const { email, role } = req.body;
    if (!email) throw new Error('El email es requerido.');
    return svc.inviteUserByEmail(email, institutionId, role || 'student');
  }, { ok: 201 });

  removeUser = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    await svc.removeUserFromInstitution(req.params.userId, institutionId);
    return new OperationResult(true, 'Usuario removido de la institución.');
  });

  changeUserRole = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.changeUserRole(req.params.userId, institutionId, req.body.role);
  });

  // ── Courses ─────────────────────────────────────────────────────────────

  getCourses = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    const courses = await svc.getInstitutionCourses(institutionId);
    return courses.map(c => ({
      ...c,
      name:              c.title ?? c.name,
      teacher_id:        c.teacher?.id   ?? c.teacher_id ?? null,
      teacher_name:      c.teacher?.name ?? null,
      grading_scale_id:  c.grading_scale_id ?? null,
      enrollments_count: c.enrollments?.[0]?.count ?? 0,
    }));
  }, { ok: 200, fail: 500 });

  deleteCourse = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    await svc.deleteCourse(req.params.courseId, institutionId);
    return new OperationResult(true, 'Curso eliminado.');
  });

  createCourse = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    const course = await svc.createCourseAsAdmin(req.body, req.user.id, institutionId);
    return { ...course, name: course.title ?? course.name };
  }, { ok: 201 });

  updateCourse = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    const course = await svc.updateCourse(req.params.courseId, req.body, institutionId);
    return { ...course, name: course.title ?? course.name };
  });

  getCourseStudents = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.getCourseStudents(req.params.courseId, institutionId);
  });

  unenrollStudent = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    await svc.unenrollStudent(req.params.courseId, req.params.studentId, institutionId);
    return new OperationResult(true, 'Estudiante desinscrito del curso.');
  });

  broadcastNotification = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    const { title, body, role } = req.body;
    const count = await svc.broadcastNotification(institutionId, { title, body, role });
    return new OperationResult(true, `Notificación enviada a ${count} miembros.`, { count });
  });

  assignTeacher = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    const { teacherId } = req.body;
    if (!teacherId) throw new Error('teacherId es requerido.');
    return svc.assignTeacherToCourse(req.params.courseId, teacherId, institutionId);
  });

  bulkEnroll = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    const { emails } = req.body;
    if (!Array.isArray(emails) || !emails.length) throw new Error('Se requiere un array de emails.');
    return svc.bulkEnrollStudents(req.params.courseId, emails, institutionId);
  });

  // ── Grading Scales ───────────────────────────────────────────────────────

  getGradingScales = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.getGradingScales(institutionId);
  }, { ok: 200, fail: 500 });

  createGradingScale = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.createGradingScale(req.body, institutionId);
  }, { ok: 201 });

  updateGradingScale = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.updateGradingScale(req.params.scaleId, req.body, institutionId);
  });

  deleteGradingScale = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    await svc.deleteGradingScale(req.params.scaleId, institutionId);
    return new OperationResult(true, 'Escala eliminada.');
  });

  setDefaultGradingScale = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.setDefaultGradingScale(req.params.scaleId, institutionId);
  });

  // ── Academic Periods ─────────────────────────────────────────────────────

  getPeriods = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.getPeriods(institutionId);
  }, { ok: 200, fail: 500 });

  createPeriod = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.createPeriod(req.body, institutionId);
  }, { ok: 201 });

  updatePeriod = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.updatePeriod(req.params.periodId, req.body, institutionId);
  });

  deletePeriod = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    await svc.deletePeriod(req.params.periodId, institutionId);
    return new OperationResult(true, 'Periodo eliminado.');
  });

  setActivePeriod = ctrl(async (req) => {
    const institutionId = await resolveInstitutionId(req);
    return svc.setActivePeriod(req.params.periodId, institutionId);
  });
}
