import AcademicGroupService from '../services/AcademicGroupService.js';

export class AcademicGroupController {
  constructor() {
    this.service = new AcademicGroupService();
  }

  async create(req, res) {
    try {
      const { course_id, name, description } = req.body;
      const role = req.user.role || 'student';
      const data = await this.service.createGroup({ course_id, name, description }, req.user.id, role);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async addMember(req, res) {
    try {
      const { groupId, studentId } = req.body;
      const role = req.user.role || 'student';
      const data = await this.service.addMember(groupId, studentId, req.user.id, role);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getByCourse(req, res) {
    try {
      const role = req.user.role || 'student';
      const data = await this.service.getGroupsByCourse(req.params.id, req.user.id, role);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async getMyGroups(req, res) {
    try {
      const data = await this.service.getMyGroups(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
