// src/controllers/StatisticsController.js
import { StatisticsService } from "../services/StatisticsService.js";
import { TaskService } from "../services/TaskService.js";
import SubTaskRepository from "../repositories/SubTaskRepository.js";
import { requireSupabaseClient } from "../lib/supabaseAdmin.js";

export class StatisticsController {
  constructor() {
    this.statisticsService = new StatisticsService();
    this.taskService = new TaskService();
    this.subTaskRepository = new SubTaskRepository();
  }

  // Updated to use the enhanced getDashboardStats
  async getByUser(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });

    const result = await this.statisticsService.getDashboardStats(req.user.id);

    if (result.success) {
      res.status(200).json(result.data);
    } else {
      res.status(401).json({ error: result.message });
    }
  }

  // Simple stats for HomePage
  async getHomePageStats(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await this.statisticsService.getHomePageStats(req.user.id);
    res.status(result.success ? 200 : 500).json(result);
  }

  async update(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const stats = { ...req.body, id_User: req.user.id };
    const result = await this.statisticsService.update(stats);
    res.status(result.success ? 200 : 400).json(result);
  }

  async checkAchievements(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    await this.statisticsService.checkAchievements(req.user.id);
    res.status(200).json({ success: true, message: "Achievements checked" });
  }

  async getAchievementsStats(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await this.statisticsService.getAchievementsStats(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getStreakStats(req, res) {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });

      const stats = await this.statisticsService.getByCurrentUser(req.user.id);
      if (!stats) {
        return res.status(404).json({ error: 'Statistics not found' });
      }

      // Tasks completed today
      const completedTodayResult = await this.taskService.getCompletedToday(req.user.id);
      const tasksCompletedToday = completedTodayResult.success ? completedTodayResult.data.length : 0;

      // Total subtasks completed (historical) — O(n) queries; acceptable for streak widget
      const allTasks = await this.taskService.getAll(req.user.id);
      let totalSubTasksCompleted = 0;
      if (allTasks.success) {
        for (const task of allTasks.data) {
          const subTasks = await this.subTaskRepository.getAllByTaskId(task.id_Task || task.id);
          totalSubTasksCompleted += subTasks.filter(st => st.state).length;
        }
      }

      // Motivational message
      const motivationalMessage = await this.statisticsService.getMotivationalMessage(req.user.id);

      const streakData = {
        currentStreak: stats.racha || 0,
        dailyGoal: stats.dailyGoal || 5,
        tasksCompletedToday,
        progressPercentage: Math.min((tasksCompletedToday / (stats.dailyGoal || 5)) * 100, 100),
        lastCompletedDate: stats.lastRachaDate,
        motivationalMessage,
        bestStreak: stats.bestStreak || 0,
        totalSubTasksCompleted
      };

      res.status(200).json(streakData);
    } catch (error) {
      console.error('Error getting streak stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Additional stats widgets — all queries run in parallel
  async getAdditionalStats(req, res) {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
      const supabase = requireSupabaseClient();
      const userId = req.user.id;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

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
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('start_date', today.toISOString()),
        supabase.from('project').select('*', { count: 'exact', head: true }).eq('id_Creator', userId),
        supabase.from('project').select('*', { count: 'exact', head: true }).eq('id_Creator', userId),
        supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekAgo.toISOString()),
        supabase.from('categories').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('tasks').select('priority_id').eq('user_id', userId),
        supabase.from('tasks').select('created_at, due_date').eq('user_id', userId).not('due_date', 'is', null).eq('completed', true).order('created_at', { ascending: false }).limit(50),
        supabase.from('userAchievements').select('achievementId, unlockedAt').eq('id_User', userId).order('unlockedAt', { ascending: false }).limit(3)
      ]);

      // Priority stats
      const priorityStats = { high: 0, medium: 0, low: 0 };
      if (priorityDataResult.data) {
        priorityDataResult.data.forEach(task => {
          const priorityId = task.priority_id;
          if (priorityId === 3) priorityStats.high++;
          else if (priorityId === 2) priorityStats.medium++;
          else if (priorityId === 1) priorityStats.low++;
        });
      }

      // Average completion time
      let averageCompletionTime = 0;
      if (completedTasksResult.data && completedTasksResult.data.length > 0) {
        const times = completedTasksResult.data.map(task => {
          const created = new Date(task.created_at);
          const completed = new Date(task.due_date);
          return (completed - created) / (1000 * 60 * 60); // hours
        }).filter(time => time > 0 && time < 24 * 30);
        averageCompletionTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      }

      res.status(200).json({
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
      });
    } catch (error) {
      console.error('Error getting additional stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // /api/statistics/tasks
  async getTaskStats(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await this.statisticsService.getTaskStatistics(req.user.id);
    if (result.success) {
      res.status(200).json(result.data);
    } else {
      res.status(500).json({ error: result.message });
    }
  }

  async updateDailyGoal(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { dailyGoal } = req.body;
    const result = await this.statisticsService.updateDailyGoal(dailyGoal, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }
}
