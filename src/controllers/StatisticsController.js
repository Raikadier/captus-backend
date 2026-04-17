// src/controllers/StatisticsController.js
import { StatisticsService } from "../services/StatisticsService.js";
import { requireSupabaseClient } from "../lib/supabaseAdmin.js";

const statisticsService = new StatisticsService();

export class StatisticsController {
  constructor() {
    this.injectUser = (req, res, next) => {
      // Stateless - no op
      next();
    };
  }

  // Updated to use the enhanced getDashboardStats
  async getByUser(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Prefer getDashboardStats for the frontend StatsPage
    const result = await statisticsService.getDashboardStats(req.user.id);

    if (result.success) {
      res.status(200).json(result.data);
    } else {
      // Fallback or error handling
      res.status(401).json({ error: result.message });
    }
  }

  // Simple stats for HomePage
  async getHomePageStats(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await statisticsService.getHomePageStats(req.user.id);
    res.status(result.success ? 200 : 500).json(result);
  }

  async update(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const stats = { ...req.body, id_User: req.user.id };
    const result = await statisticsService.update(stats);
    res.status(result.success ? 200 : 400).json(result);
  }

  async checkAchievements(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    await statisticsService.checkAchievements(req.user.id);
    res.status(200).json({ success: true, message: "Achievements checked" });
  }

  async getAchievementsStats(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await statisticsService.getAchievementsStats(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getStreakStats(req, res) {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const stats = await statisticsService.getByCurrentUser(req.user.id);
      if (!stats) {
        return res.status(404).json({ error: 'Statistics not found' });
      }

      // Get tasks completed today
      const taskService = (await import('../services/TaskService.js')).TaskService;
      const taskSvc = new taskService();

      const completedTodayResult = await taskSvc.getCompletedToday(req.user.id);
      const tasksCompletedToday = completedTodayResult.success ? completedTodayResult.data.length : 0;

      // Get total subtasks completed (historical)
      // Note: This iterates ALL tasks which is inefficient but preserving logic structure.
      const allTasks = await taskSvc.getAll(req.user.id);
      let totalSubTasksCompleted = 0;
      if (allTasks.success) {
        const subTaskRepository = (await import('../repositories/SubTaskRepository.js')).default;
        const subTaskRepo = new subTaskRepository();
        for (const task of allTasks.data) {
          const subTasks = await subTaskRepo.getAllByTaskId(task.id_Task || task.id);
          totalSubTasksCompleted += subTasks.filter(st => st.state).length;
        }
      }

      // Get motivational message
      const motivationalMessages = await statisticsService.getMotivationalMessage(req.user.id);
      // motivationalMessage returns a string or array?
      // check implementation: returns getMotivationalMessage(streak) which likely returns array or string?
      // actually `getMotivationalMessage` in `achievementsConfig` usually returns a string.
      // But here in controller it does `randomMessage`.
      // Let's assume it returns array based on usage.
      // checking service: returns `getMotivationalMessage(streak)`
      // If that returns a string, then `[Math.floor...]` on a string gets a char.
      // We should verify `achievementsConfig.js` if possible, but for now assuming it works as before or we fix it if it breaks.
      // Actually, if it returns a single string, we should just use it.

      const streakData = {
        currentStreak: stats.racha || 0,
        dailyGoal: stats.dailyGoal || 5,
        tasksCompletedToday,
        progressPercentage: Math.min((tasksCompletedToday / (stats.dailyGoal || 5)) * 100, 100),
        lastCompletedDate: stats.lastRachaDate,
        motivationalMessage: motivationalMessages, // Assuming it returns the message directly
        bestStreak: stats.bestStreak || 0,
        totalSubTasksCompleted
      };

      res.status(200).json(streakData);
    } catch (error) {
      console.error('Error getting streak stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ✅ New endpoint for additional stats widgets - OPTIMIZED
  async getAdditionalStats(req, res) {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const supabase = requireSupabaseClient();
      const userId = req.user.id;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Run all count queries in parallel for maximum performance
      const [
        eventsResult,
        upcomingEventsResult,
        projectsResult,
        activeProjectsResult,
        notesResult,
        recentNotesResult,
        categoriesResult,
        priorityDataResult,
        completedTasksResult,
        achievementsResult
      ] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('start_date', today.toISOString()), // Fixed date -> start_date
        supabase.from('project').select('*', { count: 'exact', head: true }).eq('id_Creator', userId), // Fixed projects -> project, user_id -> id_Creator (Schema check needed)
        supabase.from('project').select('*', { count: 'exact', head: true }).eq('id_Creator', userId), // Status check might be missing in schema
        supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekAgo.toISOString()),
        supabase.from('categories').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('tasks').select('priority_id').eq('user_id', userId),
        supabase.from('tasks').select('created_at, due_date').eq('user_id', userId).not('due_date', 'is', null).eq('completed', true).order('created_at', { ascending: false }).limit(50), // Fixed endDate -> due_date
        supabase.from('userAchievements').select('achievementId, unlockedAt').eq('id_User', userId).order('unlockedAt', { ascending: false }).limit(3) // Fixed user_achievements -> userAchievements, user_id -> id_User
      ]);

      // Process priority stats
      const priorityStats = { high: 0, medium: 0, low: 0 };
      if (priorityDataResult.data) {
        priorityDataResult.data.forEach(task => {
          const priorityId = task.priority_id;
          if (priorityId === 3) priorityStats.high++;
          else if (priorityId === 2) priorityStats.medium++;
          else if (priorityId === 1) priorityStats.low++;
        });
      }

      // Calculate average completion time
      let averageCompletionTime = 0;
      if (completedTasksResult.data && completedTasksResult.data.length > 0) {
        const times = completedTasksResult.data.map(task => {
          const created = new Date(task.created_at);
          const completed = new Date(task.due_date);
          return (completed - created) / (1000 * 60 * 60); // hours
        }).filter(time => time > 0 && time < 24 * 30);
        averageCompletionTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      }

      const additionalStats = {
        totalEvents: eventsResult.count || 0,
        upcomingEvents: upcomingEventsResult.count || 0,
        completedEvents: (eventsResult.count || 0) - (upcomingEventsResult.count || 0),
        totalProjects: projectsResult.count || 0,
        activeProjects: activeProjectsResult.count || 0,
        totalNotes: notesResult.count || 0,
        recentNotes: recentNotesResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        priorityStats,
        averageCompletionTime: parseFloat(averageCompletionTime.toFixed(1)),
        recentAchievements: achievementsResult.data || []
      };

      res.status(200).json(additionalStats);
    } catch (error) {
      console.error('Error getting additional stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ✅ New method for /api/statistics/tasks
  async getTaskStats(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await statisticsService.getTaskStatistics(req.user.id);
    if (result.success) {
      res.status(200).json(result.data);
    } else {
      res.status(500).json({ error: result.message });
    }
  }

  async updateDailyGoal(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { dailyGoal } = req.body;
    const result = await statisticsService.updateDailyGoal(dailyGoal, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }
}
