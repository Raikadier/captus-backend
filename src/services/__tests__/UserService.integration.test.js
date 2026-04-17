import { jest } from '@jest/globals';
import UserService from '../UserService.js';

/**
 * Integration tests for UserService
 * Tests the complete user workflow including:
 * - User retrieval (by ID, all users)
 * - User creation/update from auth
 * - User account deletion with full cascade (statistics, achievements, categories, tasks)
 * - Email registration check
 * - User profile updates
 * 
 * This test file uses jest.fn() for mocking repository dependencies.
 */

describe('UserService Integration Tests', () => {
    let userService;
    let mockUserRepo;
    let mockCategoryService;
    let mockStatisticsService;
    let mockTaskService;
    let mockUserAchievementsRepo;

    // Test data
    const testUserId = 1;
    const testUserEmail = 'testuser@example.com';

    const testUser = {
        id: testUserId,
        email: testUserEmail,
        name: 'Test User',
        role: 'student',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        carrer: 'Computer Science',
        bio: 'Test bio',
        avatar_url: 'https://example.com/avatar.png'
    };

    const testAuthUser = {
        id: testUserId,
        email: testUserEmail,
        user_metadata: {
            name: 'Test User',
            full_name: 'Test User',
            role: 'student',
            avatar_url: 'https://example.com/avatar.png'
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    };

    const testUsersList = [
        { ...testUser, id: 1, email: 'user1@example.com' },
        { ...testUser, id: 2, email: 'user2@example.com' },
        { ...testUser, id: 3, email: 'user3@example.com' }
    ];

    // Test data for cascade delete
    const testStatistics = {
        id_Statistics: 1,
        id_User: testUserId,
        totalTasks: 10,
        completedTasks: 5,
        streak: 3
    };

    const testAchievement = {
        id: 1,
        id_User: testUserId,
        achievementId: 'first_task',
        progress: 100,
        isCompleted: true,
        unlockedAt: '2024-01-01T00:00:00Z'
    };

    const testCategory = {
        id_Category: 1,
        name: 'General',
        id_User: testUserId
    };

    const testTask = {
        id_Task: 1,
        title: 'Test Task',
        user_id: testUserId
    };

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create mock UserRepository
        mockUserRepo = {
            getById: jest.fn(),
            getAll: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            isEmailRegistered: jest.fn()
        };

        // Create mock CategoryService
        mockCategoryService = jest.fn().mockImplementation(() => ({
            setCurrentUser: jest.fn(),
            getAll: jest.fn().mockResolvedValue({
                success: true,
                data: [testCategory]
            }),
            getById: jest.fn().mockResolvedValue({
                success: true,
                data: testCategory
            }),
            save: jest.fn().mockResolvedValue({ success: true }),
            delete: jest.fn().mockResolvedValue({ success: true })
        }));

        // Create mock StatisticsService
        mockStatisticsService = jest.fn().mockImplementation(() => ({
            setCurrentUser: jest.fn(),
            getByCurrentUser: jest.fn().mockResolvedValue(testStatistics),
            checkStreak: jest.fn().mockResolvedValue(true),
            delete: jest.fn().mockResolvedValue(true)
        }));

        // Create mock TaskService
        mockTaskService = jest.fn().mockImplementation(() => ({
            setCurrentUser: jest.fn(),
            deleteByUser: jest.fn().mockResolvedValue({ success: true })
        }));

        // Create mock UserAchievementsRepository
        mockUserAchievementsRepo = jest.fn().mockImplementation(() => ({
            deleteByUser: jest.fn().mockResolvedValue(true)
        }));

        // Create UserService with mocked dependencies
        userService = new UserService(
            {}, // supabase client (unused)
            mockUserRepo,
            new mockCategoryService(),
            new mockStatisticsService()
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // =========================================================================
    // USER RETRIEVAL TESTS
    // =========================================================================
    describe('User Retrieval', () => {
        describe('getUserById', () => {
            it('should retrieve user by ID successfully', async () => {
                mockUserRepo.getById.mockResolvedValue(testUser);

                const result = await userService.getUserById(testUserId);

                expect(result).toBeDefined();
                expect(result.email).toBe(testUserEmail);
                expect(mockUserRepo.getById).toHaveBeenCalledWith(testUserId);
            });

            it('should throw error when user not found', async () => {
                mockUserRepo.getById.mockResolvedValue(null);

                await expect(userService.getUserById(testUserId))
                    .rejects.toThrow('User not found');
            });

            it('should throw error on repository failure', async () => {
                mockUserRepo.getById.mockRejectedValue(new Error('Database error'));

                await expect(userService.getUserById(testUserId))
                    .rejects.toThrow('Failed to get user');
            });
        });

        describe('getAllUsers', () => {
            it('should retrieve all users successfully', async () => {
                mockUserRepo.getAll.mockResolvedValue(testUsersList);

                const result = await userService.getAllUsers();

                expect(result).toBeInstanceOf(Array);
                expect(result.length).toBe(3);
                expect(mockUserRepo.getAll).toHaveBeenCalled();
            });

            it('should return empty array when no users exist', async () => {
                mockUserRepo.getAll.mockResolvedValue([]);

                const result = await userService.getAllUsers();

                expect(result).toBeInstanceOf(Array);
                expect(result.length).toBe(0);
            });

            it('should throw error on repository failure', async () => {
                mockUserRepo.getAll.mockRejectedValue(new Error('Database error'));

                await expect(userService.getAllUsers())
                    .rejects.toThrow('Failed to get users');
            });
        });
    });

    // =========================================================================
    // USER CREATION/UPDATE FROM AUTH TESTS
    // =========================================================================
    describe('User Creation/Update from Auth', () => {
        describe('syncUserFromAuth', () => {
            it('should create user from auth successfully', async () => {
                const savedUserData = { ...testUser, created_at: new Date() };
                mockUserRepo.save.mockResolvedValue(savedUserData);

                // Mock category service save to avoid actual database call
                userService.categoryService.save = jest.fn().mockResolvedValue({ success: true });

                const result = await userService.syncUserFromAuth(testAuthUser);

                expect(result).toBeDefined();
                expect(result.email).toBe(testUserEmail);
                expect(mockUserRepo.save).toHaveBeenCalled();
                expect(userService.categoryService.save).toHaveBeenCalledWith(
                    expect.objectContaining({ name: 'General' })
                );
            });

            it('should update existing user from auth', async () => {
                const existingUser = { ...testUser, name: 'Old Name' };
                const updatedUser = { ...testUser, name: 'Test User' };
                mockUserRepo.save.mockResolvedValue(updatedUser);

                userService.categoryService.save = jest.fn().mockResolvedValue({ success: true });

                const result = await userService.syncUserFromAuth(testAuthUser);

                expect(mockUserRepo.save).toHaveBeenCalled();
                expect(userService.currentUser).not.toBeNull();
            });

            it('should throw error when save fails', async () => {
                mockUserRepo.save.mockResolvedValue(null);

                await expect(userService.syncUserFromAuth(testAuthUser))
                    .rejects.toThrow('Failed to sync user');
            });

            it('should throw error when auth user is invalid', async () => {
                await expect(userService.syncUserFromAuth(null))
                    .rejects.toThrow('Failed to sync user');
            });

            it('should handle category initialization gracefully when it fails', async () => {
                const savedUserData = { ...testUser, created_at: new Date() };
                mockUserRepo.save.mockResolvedValue(savedUserData);

                // Make category save throw - should be caught gracefully
                userService.categoryService.save = jest.fn()
                    .mockRejectedValue(new Error('Category already exists'));

                const result = await userService.syncUserFromAuth(testAuthUser);

                // User should still be created even if category init fails
                expect(result).toBeDefined();
                expect(result.email).toBe(testUserEmail);
            });
        });
    });

    // =========================================================================
    // USER PROFILE UPDATE TESTS
    // =========================================================================
    describe('User Profile Updates', () => {
        describe('updateUser', () => {
            it('should update user profile successfully', async () => {
                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.update.mockResolvedValue({ ...testUser, name: 'Updated Name' });

                const result = await userService.updateUser(testUserId, { name: 'Updated Name' });

                expect(result).toBeDefined();
                expect(result.name).toBe('Updated Name');
                expect(mockUserRepo.update).toHaveBeenCalledWith(
                    testUserId,
                    expect.objectContaining({ name: 'Updated Name' })
                );
            });

            it('should throw error when user not found', async () => {
                mockUserRepo.getById.mockResolvedValue(null);

                await expect(userService.updateUser(testUserId, { name: 'New Name' }))
                    .rejects.toThrow('User not found');
            });

            it('should validate email is not empty', async () => {
                mockUserRepo.getById.mockResolvedValue(testUser);

                await expect(userService.updateUser(testUserId, { email: '' }))
                    .rejects.toThrow('Validation failed');
            });

            it('should throw error on repository failure', async () => {
                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.update.mockResolvedValue(null);

                await expect(userService.updateUser(testUserId, { name: 'New Name' }))
                    .rejects.toThrow('Failed to update user');
            });

            it('should update multiple fields at once', async () => {
                const updatedFields = {
                    name: 'New Name',
                    bio: 'New Bio',
                    carrer: 'New Career'
                };

                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.update.mockResolvedValue({ ...testUser, ...updatedFields });

                const result = await userService.updateUser(testUserId, updatedFields);

                expect(result.name).toBe('New Name');
                expect(result.bio).toBe('New Bio');
                expect(result.carrer).toBe('New Career');
            });
        });
    });

    // =========================================================================
    // EMAIL REGISTRATION CHECK TESTS
    // =========================================================================
    describe('Email Registration Check', () => {
        describe('isEmailRegistered', () => {
            it('should return true when email is registered', async () => {
                mockUserRepo.isEmailRegistered.mockResolvedValue(true);

                const result = await userService.isEmailRegistered(testUserEmail);

                expect(result.success).toBe(true);
                expect(result.data.registered).toBe(true);
                expect(mockUserRepo.isEmailRegistered).toHaveBeenCalledWith(testUserEmail);
            });

            it('should return false when email is not registered', async () => {
                mockUserRepo.isEmailRegistered.mockResolvedValue(false);

                const result = await userService.isEmailRegistered('newuser@example.com');

                expect(result.success).toBe(true);
                expect(result.data.registered).toBe(false);
            });

            it('should handle repository errors gracefully', async () => {
                mockUserRepo.isEmailRegistered.mockRejectedValue(new Error('Database error'));

                const result = await userService.isEmailRegistered(testUserEmail);

                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
            });
        });
    });

    // =========================================================================
    // USER ACCOUNT DELETION TESTS
    // =========================================================================
    describe('User Account Deletion', () => {
        describe('deleteUser (Admin)', () => {
            it('should delete user by ID successfully', async () => {
                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.delete.mockResolvedValue(true);

                const result = await userService.deleteUser(testUserId);

                expect(result).toBe(true);
                expect(mockUserRepo.delete).toHaveBeenCalledWith(testUserId);
            });

            it('should throw error when user not found', async () => {
                mockUserRepo.getById.mockResolvedValue(null);

                await expect(userService.deleteUser(testUserId))
                    .rejects.toThrow('User not found');
            });

            it('should throw error on delete failure', async () => {
                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.delete.mockResolvedValue(false);

                await expect(userService.deleteUser(testUserId))
                    .rejects.toThrow('Failed to delete user');
            });
        });

        describe('deleteAccount (Cascade Delete)', () => {
            beforeEach(() => {
                // Add taskService to userService for cascade delete tests
                userService.taskService = {
                    setCurrentUser: jest.fn(),
                    deleteByUser: jest.fn().mockResolvedValue({ success: true })
                };
            });

            it('should delete account with full cascade successfully', async () => {
                // Reset and create fresh service for this test
                const mockStatsSvc = {
                    setCurrentUser: jest.fn(),
                    getByCurrentUser: jest.fn().mockResolvedValue(testStatistics),
                    checkStreak: jest.fn(),
                    delete: jest.fn().mockResolvedValue(true)
                };

                const mockCatSvc = {
                    setCurrentUser: jest.fn(),
                    getAll: jest.fn().mockResolvedValue({
                        success: true,
                        data: [testCategory]
                    }),
                    delete: jest.fn().mockResolvedValue({ success: true })
                };

                const mockTaskSvc = {
                    setCurrentUser: jest.fn(),
                    deleteByUser: jest.fn().mockResolvedValue({ success: true })
                };

                userService = new UserService({}, mockUserRepo, mockCatSvc, mockStatsSvc);
                userService.taskService = mockTaskSvc;

                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.delete.mockResolvedValue(true);

                const result = await userService.deleteAccount(testUserId);

                expect(result.success).toBe(true);
                expect(result.message).toBe('Account deleted successfully.');
                expect(mockStatsSvc.delete).toHaveBeenCalled();
            });

            it('should handle missing statistics gracefully', async () => {
                const mockStatsSvc = {
                    setCurrentUser: jest.fn(),
                    getByCurrentUser: jest.fn().mockResolvedValue(null),
                    checkStreak: jest.fn(),
                    delete: jest.fn()
                };

                const mockCatSvc = {
                    setCurrentUser: jest.fn(),
                    getAll: jest.fn().mockResolvedValue({ success: true, data: [] }),
                    delete: jest.fn()
                };

                const mockTaskSvc = {
                    setCurrentUser: jest.fn(),
                    deleteByUser: jest.fn()
                };

                userService = new UserService({}, mockUserRepo, mockCatSvc, mockStatsSvc);
                userService.taskService = mockTaskSvc;

                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.delete.mockResolvedValue(true);

                const result = await userService.deleteAccount(testUserId);

                expect(result.success).toBe(true);
            });

            it('should continue cascade even if one step fails', async () => {
                const mockStatsSvc = {
                    setCurrentUser: jest.fn(),
                    getByCurrentUser: jest.fn().mockImplementation(() => {
                        throw new Error('Stats error');
                    }),
                    checkStreak: jest.fn(),
                    delete: jest.fn()
                };

                const mockCatSvc = {
                    setCurrentUser: jest.fn(),
                    getAll: jest.fn().mockImplementation(() => {
                        throw new Error('Category error');
                    }),
                    delete: jest.fn()
                };

                const mockTaskSvc = {
                    setCurrentUser: jest.fn(),
                    deleteByUser: jest.fn().mockImplementation(() => {
                        throw new Error('Task error');
                    })
                };

                userService = new UserService({}, mockUserRepo, mockCatSvc, mockStatsSvc);
                userService.taskService = mockTaskSvc;

                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.delete.mockResolvedValue(true);

                const result = await userService.deleteAccount(testUserId);

                // Should still succeed because main user deletion happened
                expect(result.success).toBe(true);
                expect(mockUserRepo.delete).toHaveBeenCalledWith(testUserId);
            });

            it('should return failure when main user deletion fails', async () => {
                const mockStatsSvc = {
                    setCurrentUser: jest.fn(),
                    getByCurrentUser: jest.fn(),
                    delete: jest.fn()
                };

                const mockCatSvc = {
                    setCurrentUser: jest.fn(),
                    getAll: jest.fn(),
                    delete: jest.fn()
                };

                const mockTaskSvc = {
                    setCurrentUser: jest.fn(),
                    deleteByUser: jest.fn()
                };

                userService = new UserService({}, mockUserRepo, mockCatSvc, mockStatsSvc);
                userService.taskService = mockTaskSvc;

                mockUserRepo.getById.mockResolvedValue(testUser);
                mockUserRepo.delete.mockRejectedValue(new Error('Delete failed'));

                const result = await userService.deleteAccount(testUserId);

                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
            });
        });
    });

    // =========================================================================
    // PASSWORD VALIDATION TESTS
    // =========================================================================
    describe('Password Validation', () => {
        describe('changePassword', () => {
            it('should validate password with correct format', async () => {
                const result = await userService.changePassword(
                    'oldPassword123',
                    'NewPass123'
                );

                expect(result.success).toBe(true);
            });

            it('should reject password without uppercase', async () => {
                const result = await userService.changePassword(
                    'oldPassword123',
                    'newpass123'
                );

                expect(result.success).toBe(false);
            });

            it('should reject password without lowercase', async () => {
                const result = await userService.changePassword(
                    'oldPassword123',
                    'NEWPASS123'
                );

                expect(result.success).toBe(false);
            });

            it('should reject password without number', async () => {
                const result = await userService.changePassword(
                    'oldPassword123',
                    'NewPassABC'
                );

                expect(result.success).toBe(false);
            });

            it('should reject password shorter than 8 characters', async () => {
                const result = await userService.changePassword(
                    'oldPassword123',
                    'New123'
                );

                expect(result.success).toBe(false);
            });

            it('should handle errors gracefully', async () => {
                const result = await userService.changePassword(null, 'NewPass123');

                expect(result).toBeDefined();
            });
        });
    });

    // =========================================================================
    // SET CURRENT USER TESTS
    // =========================================================================
    describe('setCurrentUser', () => {
        it('should set current user and propagate to services', () => {
            const testUserObj = { id: testUserId, email: testUserEmail };

            userService.setCurrentUser(testUserObj);

            expect(userService.currentUser).toEqual(testUserObj);
            expect(userService.statisticsService.setCurrentUser).toHaveBeenCalledWith(testUserObj);
            expect(userService.categoryService.setCurrentUser).toHaveBeenCalledWith(testUserObj);
        });
    });
});