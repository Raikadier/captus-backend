import User from '../models/UserModels.js';
import { OperationResult } from '../shared/OperationResult.js';
import CategoryService from "./CategoryService.js";
import { StatisticsService } from "./StatisticsService.js";
import UserRepository from "../repositories/UserRepository.js";

class UserService {
  constructor(supabase, userRepo, categorySvc, statisticsSvc) {
    this.supabase = supabase; // Kept for legacy compatibility if needed, but unused in main methods
    this.userRepository = userRepo || new UserRepository();
    this.categoryService = categorySvc || new CategoryService();
    this.statisticsService = statisticsSvc || new StatisticsService();
    this.currentUser = null;
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await this.userRepository.getById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return new User(user);
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  // Get all users (admin function)
  async getAllUsers() {
    try {
      const users = await this.userRepository.getAll();
      return users.map(row => new User(row));
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  // Create or update user from Supabase auth
  async syncUserFromAuth(authUser) {
    try {
      const user = User.fromSupabaseAuth(authUser);

      const savedUser = await this.userRepository.save(user.toDatabase());
      if (!savedUser) throw new Error("Failed to save user via repository");

      const syncedUser = new User(savedUser);

      // Initialize features for the user
      try {
        this.setCurrentUser(syncedUser);

        // 1. Initialize Statistics
        try {
          if (this.statisticsService.checkStreak) {
            await this.statisticsService.checkStreak();
          }
        } catch (statsError) {
          console.warn("Error initializing statistics:", statsError.message);
        }

        // 2. Create "General" category if it doesn't exist
        const generalCategory = {
          name: "General",
          id_User: syncedUser.id
        };
        await this.categoryService.save(generalCategory);
        console.log(`Category "General" initialized for user: ${syncedUser.email}`);
      } catch (initError) {
        console.warn("Note: Could not initialize default category (might already exist):", initError.message);
      }

      return syncedUser;
    } catch (error) {
      throw new Error(`Failed to sync user: ${error.message}`);
    }
  }

  // Update user profile
  async updateUser(userId, updateData) {
    try {
      const existingUser = await this.getUserById(userId);

      const updatedUser = new User({
        ...existingUser,
        ...updateData,
        updated_at: new Date()
      });

      const validation = updatedUser.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const savedData = await this.userRepository.update(userId, updatedUser.toDatabase());
      if (!savedData) throw new Error("Failed to update user via repository");

      return new User(savedData);
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Delete user (admin function)
  async deleteUser(userId) {
    try {
      await this.getUserById(userId);
      const success = await this.userRepository.delete(userId);
      if (!success) throw new Error("Failed to delete user via repository");
      return true;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Delete account with cascading cleanup
  async deleteAccount(userId) {
    try {
      // 1. Cleanup Statistics
      try {
        this.statisticsService.setCurrentUser({ id: userId });
        const stats = await this.statisticsService.getByCurrentUser();
        if (stats && stats.id_Statistics) {
          await this.statisticsService.delete(stats.id_Statistics);
        }
      } catch (e) { console.warn("Error cleaning stats:", e.message); }

      // 2. Cleanup Achievements
      try {
        const userAchievementsRepo = (await import("../repositories/UserAchievementsRepository.js")).default;
        const achievementsRepo = new userAchievementsRepo();
        await achievementsRepo.deleteByUser(userId);
      } catch (e) { console.warn("Error cleaning achievements:", e.message); }

      // 3. Cleanup Categories
      try {
        this.categoryService.setCurrentUser({ id: userId });
        const categoriesResult = await this.categoryService.getAll();
        if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
          for (const category of categoriesResult.data) {
            if (category.id_User === userId) {
              await this.categoryService.delete(category.id_Category);
            }
          }
        }
      } catch (e) { console.warn("Error cleaning categories:", e.message); }

      // 4. Cleanup Tasks
      try {
        const taskModule = await import("./TaskService.js");
        const TaskServiceClass = taskModule.TaskService || taskModule.default;

        if (TaskServiceClass) {
          const taskSvc = new TaskServiceClass();
          taskSvc.setCurrentUser({ id: userId });
          await taskSvc.deleteByUser(userId);
        }
      } catch (e) { console.warn("Error cleaning tasks:", e.message); }

      // 5. Delete User
      await this.deleteUser(userId);

      return { success: true, message: "Account deleted successfully." };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Check if email is registered
  async isEmailRegistered(email) {
    try {
      const registered = await this.userRepository.isEmailRegistered(email);
      return { success: true, data: { registered } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Change password validation
  async changePassword(currentPassword, newPassword) {
    try {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return new OperationResult(false, "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.");
      }
      return new OperationResult(true, "Contraseña validada correctamente. Use el cliente para actualizar.");
    } catch (error) {
      return new OperationResult(false, `Error al cambiar contraseña: ${error.message}`);
    }
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (this.statisticsService) this.statisticsService.setCurrentUser(user);
    if (this.categoryService) this.categoryService.setCurrentUser(user);
  }
}

export default UserService;
