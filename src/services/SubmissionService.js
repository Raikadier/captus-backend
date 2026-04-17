import SubmissionRepository from '../repositories/SubmissionRepository.js';
import AssignmentRepository from '../repositories/AssignmentRepository.js';
import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';
import AcademicGroupRepository from '../repositories/AcademicGroupRepository.js';
import NotificationService from './NotificationService.js';
import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export default class SubmissionService {
    constructor(submissionRepo, assignmentRepo, courseRepo, enrollmentRepo, groupRepo) {
        this.repo = submissionRepo || new SubmissionRepository();
        this.assignmentRepo = assignmentRepo || new AssignmentRepository();
        this.courseRepo = courseRepo || new CourseRepository();
        this.enrollmentRepo = enrollmentRepo || new EnrollmentRepository();
        this.groupRepo = groupRepo || new AcademicGroupRepository();
    }

    async submitAssignment(data, studentId) {
        const { assignment_id, file_url, group_id } = data;

        const assignment = await this.assignmentRepo.getById(assignment_id);
        if (!assignment) throw new Error('Tarea no encontrada');

        // Validate enrollment
        const isEnrolled = await this.enrollmentRepo.isEnrolled(assignment.course_id, studentId);
        if (!isEnrolled) throw new Error('No estás inscrito en este curso');

        // Check duplicates and Group Logic
        if (assignment.is_group_assignment) {
            if (!group_id) throw new Error('Esta tarea es grupal, se requiere ID de grupo');

            const { data: membership, error } = await requireSupabaseClient()
                .from('course_group_members')
                .select('id')
                .eq('group_id', group_id)
                .eq('student_id', studentId)
                .single();

            if (error || !membership) throw new Error('No perteneces al grupo indicado');

            const existing = await this.repo.findByGroup(group_id, assignment_id);
            if (existing) throw new Error('El grupo ya ha realizado una entrega');

        } else {
            const existing = await this.repo.findByStudent(studentId, assignment_id);
            if (existing) throw new Error('Ya has realizado una entrega para esta tarea');
        }

        const submissionData = {
            assignment_id,
            file_url,
            student_id: assignment.is_group_assignment ? null : studentId,
            group_id: assignment.is_group_assignment ? group_id : null,
            submitted_at: new Date()
        };

        const newSubmission = await this.repo.save(submissionData);

        // Check if ALL students/groups have submitted
        await this._checkAllSubmitted(assignment);

        return newSubmission;
    }

    async _checkAllSubmitted(assignment) {
        // 1. Get total expected entities (Students or Groups)
        let totalExpected = 0;
        let totalSubmitted = 0;

        const client = requireSupabaseClient();

        if (assignment.is_group_assignment) {
            // Count groups in course
            const { count } = await client
                .from('course_groups')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', assignment.course_id);
            totalExpected = count;

            // Count submissions for this assignment (one per group)
            const { count: subCount } = await client
                .from('assignment_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('assignment_id', assignment.id);
            totalSubmitted = subCount;

        } else {
            // Count students in course
            const { count } = await client
                .from('course_enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', assignment.course_id);
            totalExpected = count;

            // Count submissions
            const { count: subCount } = await client
                .from('assignment_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('assignment_id', assignment.id);
            totalSubmitted = subCount;
        }

        if (totalExpected > 0 && totalSubmitted >= totalExpected) {
            // Notify Teacher
            const course = await this.courseRepo.getById(assignment.course_id);
            if (course) {
                await NotificationService.notify({
                    user_id: course.teacher_id,
                    title: 'Todas las entregas completadas',
                    body: `Todos los estudiantes/grupos han entregado la tarea: ${assignment.title}`,
                    event_type: 'all_submitted',
                    entity_id: assignment.id,
                    metadata: { course_id: assignment.course_id }
                });
            }
        }
    }

    async getSubmissions(assignmentId, userId, role) {
        const assignment = await this.assignmentRepo.getById(assignmentId);
        if (!assignment) throw new Error('Tarea no encontrada');
        const course = await this.courseRepo.getById(assignment.course_id);

        if (role === 'teacher') {
            if (course.teacher_id !== userId) throw new Error('No autorizado');
            return await this.repo.findByAssignment(assignmentId);
        } else {
            // Student View
            if (!assignment.is_group_assignment) {
                return await this.repo.findByStudent(userId, assignmentId);
            } else {
                const { data: groups, error } = await requireSupabaseClient()
                    .from('course_group_members')
                    .select(`
                    group_id,
                    group:group_id ( course_id )
                `)
                    .eq('student_id', userId);

                if (error) throw new Error(error.message);

                const validGroup = groups.find(g => g.group && g.group.course_id === assignment.course_id);

                if (!validGroup) {
                    return null;
                }

                return await this.repo.findByGroup(validGroup.group_id, assignmentId);
            }
        }
    }

    async gradeSubmission(submissionId, grade, feedback, teacherId) {
        const submission = await this.repo.getById(submissionId);
        if (!submission) throw new Error('Entrega no encontrada');

        const assignment = await this.assignmentRepo.getById(submission.assignment_id);
        const course = await this.courseRepo.getById(assignment.course_id);

        if (course.teacher_id !== teacherId) throw new Error('No autorizado');

        const updated = await this.repo.update(submissionId, {
            grade,
            feedback,
            graded: true
        });

        await this._notifyGrade(updated, assignment);

        return updated;
    }

    async _notifyGrade(submission, assignment) {
        const client = requireSupabaseClient();

        let userIds = [];
        if (submission.student_id) {
            userIds.push(submission.student_id);
        } else if (submission.group_id) {
            const { data: members } = await client
                .from('course_group_members')
                .select('student_id')
                .eq('group_id', submission.group_id);

            if (members) {
                userIds = members.map(m => m.student_id);
            }
        }

        if (userIds.length === 0) return;

        for (const uid of userIds) {
            await NotificationService.notify({
                user_id: uid,
                title: `Calificación: ${assignment.title}`,
                body: `Tu tarea ha sido calificada con: ${submission.grade}`,
                event_type: 'submission_graded',
                entity_id: submission.id,
                metadata: { assignment_id: submission.assignment_id }
            });
        }
    }

    async getPendingReviews(teacherId) {
        return await this.repo.findPendingByTeacher(teacherId);
    }
}
