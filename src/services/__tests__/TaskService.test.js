import { jest } from '@jest/globals';import { TaskService } from '../TaskService';
import { OperationResult } from '../../shared/OperationResult';

describe('TaskService Unit Tests', () => {
  let taskService;
  let mockTaskRepo;
  let mockSubTaskRepo;
  let mockPriorityRepo;
  let mockCategoryRepo;
  let mockStatisticsRepo;

  beforeEach(() => {
    mockTaskRepo = {
      save: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getAllByUserId: jest.fn(),
    };
    mockSubTaskRepo = {
      getAllByTaskId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockPriorityRepo = {};
    mockCategoryRepo = {};
    mockStatisticsRepo = {};

    taskService = new TaskService(
      mockTaskRepo,
      mockSubTaskRepo,
      mockPriorityRepo,
      mockCategoryRepo,
      mockStatisticsRepo
    );
  });

  describe('validateTask', () => {
    it('should return false if task is null', () => {
      const result = taskService.validateTask(null);
      expect(result.success).toBe(false);
      expect(result.message).toBe("La tarea no puede ser nula.");
    });

    it('should return false if title is empty on creation', () => {
      const result = taskService.validateTask({ title: '', user_id: 1, due_date: '2050-01-01' });
      expect(result.success).toBe(false);
    });

    it('should validate a correct task creation', () => {
      const result = taskService.validateTask({ title: 'New Task', user_id: 1, due_date: '2050-01-01' });
      expect(result.success).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return task if found and user matches', async () => {
      mockTaskRepo.getById.mockResolvedValue({ id_Task: 1, id_User: 123, title: 'Found Task' });
      
      const result = await taskService.getById(1, { id: 123 });
      
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Found Task');
      expect(mockTaskRepo.getById).toHaveBeenCalledWith(1);
    });

    it('should return false if task belongs to a different user', async () => {
      mockTaskRepo.getById.mockResolvedValue({ id_Task: 1, id_User: 999, title: 'Other user task' });
      
      const result = await taskService.getById(1, { id: 123 });
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Tarea no encontrada.');
    });
  });

  describe('updateTaskState (Complete Task)', () => {
    // White block test: Testing inner flow logic when a parent task is completed
    it('should mark all subtasks as completed when parent task is completed', async () => {
      mockTaskRepo.getById.mockResolvedValue({ id_Task: 1, id_User: 123, title: 'Task', state: false });
      mockSubTaskRepo.getAllByTaskId.mockResolvedValue([
        { id_SubTask: 10, state: false },
        { id_SubTask: 11, state: true }
      ]);
      mockTaskRepo.update.mockResolvedValue(true);
      
      // We stub out updateStatisticsOnCompletion and sendTaskNotification to avoid external calls
      taskService.updateStatisticsOnCompletion = jest.fn();
      taskService.sendTaskNotification = jest.fn().mockResolvedValue();
      taskService.loadTaskRelations = jest.fn().mockResolvedValue();

      const result = await taskService.updateTaskState(1, true, { id: 123 });
      
      expect(result.success).toBe(true);
      expect(mockSubTaskRepo.getAllByTaskId).toHaveBeenCalledWith(1);
      // It should only update the subtask that is false
      expect(mockSubTaskRepo.update).toHaveBeenCalledTimes(1);
      expect(mockSubTaskRepo.update).toHaveBeenCalledWith({ id_SubTask: 10, state: true });
    });
  });
});
