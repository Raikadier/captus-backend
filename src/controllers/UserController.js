import UserService from "../services/UserService.js";
import UserRepository from "../repositories/UserRepository.js";
import CategoryService from "../services/CategoryService.js";
import { StatisticsService } from "../services/StatisticsService.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

export class UserController {
  constructor() {
    const supabaseAdmin = getSupabaseClient();
    const userRepo = new UserRepository();
    const categorySvc = new CategoryService();
    const statisticsSvc = new StatisticsService();

    this.userService = new UserService(supabaseAdmin, userRepo, categorySvc, statisticsSvc);
  }

  // Middleware to verify user presence if needed for other controllers
  injectUser = (req, res, next) => {
    if (req.user) {
      // We could set it on the service, but the service is a singleton instance here
      // so better to pass it as argument if needed.
    }
    next();
  };

  // NEW: Sync user data from Auth to public.users
  async syncUser(req, res) {
    try {
      // req.user comes from verifySupabaseToken middleware
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // The middleware gives us the auth user structure roughly
      // We construct a "Supabase Auth User" object that the model expects
      const authUserPayload = {
        id: req.user.id,
        email: req.user.email,
        user_metadata: req.user, // req.user has the metadata merged in verifySupabaseToken
        created_at: new Date(), // We don't have exact created_at from middleware, use now or fetch
        updated_at: new Date()
      };

      const result = await this.userService.syncUserFromAuth(authUserPayload);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('Sync User Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.params.id || req.user?.id;
      if (!userId) return res.status(400).json({ error: 'User ID required' });

      const user = await this.userService.getUserById(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      // If user not found in public table, try to sync?
      // For now, just return error
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.params.id || req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await this.userService.updateUser(userId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    // Note: Authentication check is done in middleware, but method itself validates strength.
    const result = await this.userService.changePassword(currentPassword, newPassword);
    // result is OperationResult { success, message, data }
    res.status(result.success ? 200 : 400).json(result);
  }

  async deleteAccount(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await this.userService.deleteAccount(userId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async isEmailRegistered(req, res) {
    const { email } = req.body;
    try {
      const result = await this.userService.isEmailRegistered(email);
      res.status(200).json({ registered: result.data?.registered || false });
    } catch (error) {
      res.status(500).json({ registered: false, error: error.message });
    }
  }
}
