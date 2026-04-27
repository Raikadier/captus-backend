import AdminService from '../services/AdminService.js';

const svc = new AdminService();

// Helper to get institutionId from the authenticated admin
async function resolveInstitutionId(req) {
  const inst = await svc.getMyInstitution(req.user.id);
  if (!inst) throw new Error('El administrador no tiene una institución asignada.');
  return inst.id;
}

export default class AdminController {

  // ── Institution ─────────────────────────────────────────────────────────

  async getInstitution(req, res) {
    try {
      const inst = await svc.getMyInstitution(req.user.id);
      if (!inst) return res.status(404).json({ error: 'Sin institución. Crea una primero.' });
      res.json(inst);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async createInstitution(req, res) {
    try {
      const inst = await svc.createInstitution(req.body, req.user.id);
      res.status(201).json(inst);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async updateInstitution(req, res) {
    try {
      const inst = await svc.updateInstitution(req.params.id, req.body, req.user.id);
      res.json(inst);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async getDashboardStats(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      const stats = await svc.getDashboardStats(institutionId);
      res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // ── Users ───────────────────────────────────────────────────────────────

  async getMembers(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      const { role } = req.query;
      const members = await svc.getMembers(institutionId, role || null);
      res.json(members);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async inviteUser(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      const { email, role } = req.body;
      if (!email) return res.status(400).json({ error: 'El email es requerido.' });
      const user = await svc.inviteUserByEmail(email, institutionId, role || 'student');
      res.status(201).json(user);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async removeUser(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      await svc.removeUserFromInstitution(req.params.userId, institutionId);
      res.json({ message: 'Usuario removido de la institución.' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async changeUserRole(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      const { role } = req.body;
      const user = await svc.changeUserRole(req.params.userId, institutionId, role);
      res.json(user);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  // ── Courses ─────────────────────────────────────────────────────────────

  async getCourses(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      const courses = await svc.getInstitutionCourses(institutionId);
      res.json(courses);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async createCourse(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      const course = await svc.createCourseAsAdmin(req.body, req.user.id, institutionId);
      res.status(201).json(course);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async assignTeacher(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      const { teacherId } = req.body;
      if (!teacherId) return res.status(400).json({ error: 'teacherId es requerido.' });
      const course = await svc.assignTeacherToCourse(req.params.courseId, teacherId, institutionId);
      res.json(course);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async bulkEnroll(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      const { emails } = req.body;
      if (!Array.isArray(emails) || !emails.length) {
        return res.status(400).json({ error: 'Se requiere un array de emails.' });
      }
      const result = await svc.bulkEnrollStudents(req.params.courseId, emails, institutionId);
      res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  // ── Grading Scales ───────────────────────────────────────────────────────

  async getGradingScales(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      res.json(await svc.getGradingScales(institutionId));
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async createGradingScale(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      res.status(201).json(await svc.createGradingScale(req.body, institutionId));
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async updateGradingScale(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      res.json(await svc.updateGradingScale(req.params.scaleId, req.body, institutionId));
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async deleteGradingScale(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      await svc.deleteGradingScale(req.params.scaleId, institutionId);
      res.json({ message: 'Escala eliminada.' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async setDefaultGradingScale(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      res.json(await svc.setDefaultGradingScale(req.params.scaleId, institutionId));
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  // ── Academic Periods ─────────────────────────────────────────────────────

  async getPeriods(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      res.json(await svc.getPeriods(institutionId));
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async createPeriod(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      res.status(201).json(await svc.createPeriod(req.body, institutionId));
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async updatePeriod(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      res.json(await svc.updatePeriod(req.params.periodId, req.body, institutionId));
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async deletePeriod(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      await svc.deletePeriod(req.params.periodId, institutionId);
      res.json({ message: 'Periodo eliminado.' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async setActivePeriod(req, res) {
    try {
      const institutionId = await resolveInstitutionId(req);
      res.json(await svc.setActivePeriod(req.params.periodId, institutionId));
    } catch (e) { res.status(400).json({ error: e.message }); }
  }
}
