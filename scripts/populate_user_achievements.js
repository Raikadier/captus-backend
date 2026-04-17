import { createClient } from '@supabase/supabase-js';
import { achievements } from '../src/shared/achievementsConfig.js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tu user ID específico
const USER_ID = '862a4029-fe88-4570-af0a-07c6438c11fd';

async function populateUserAchievements() {
  console.log('🎯 Populating achievements for user:', USER_ID);

  try {
    // Primero, obtener el progreso actual de cada logro
    const progressCalculators = {
      completed_tasks: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', USER_ID)
          .eq('completed', true);

        if (error) {
          console.error('Error getting completed tasks:', error);
          return 0;
        }
        return data.length;
      },

      high_priority_tasks: async () => {
        // Get tasks with priority information
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            id,
            priority_id,
            priorities!inner(name)
          `)
          .eq('user_id', USER_ID);

        if (error) {
          console.error('Error getting tasks with priorities:', error);
          return 0;
        }

        // Count tasks with priority "Alta"
        return data.filter(task => task.priorities?.name === 'Alta').length;
      },

      subtasks_created: async () => {
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', USER_ID);

        if (tasksError || !tasks.length) return 0;

        const taskIds = tasks.map(t => t.id);
        const { data: subtasks, error: subtasksError } = await supabase
          .from('subTask')
          .select('id_SubTask')
          .in('id_Task', taskIds);

        if (subtasksError) {
          console.error('Error getting subtasks:', subtasksError);
          return 0;
        }
        return subtasks.length;
      },

      tasks_created: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('id', { count: 'exact' })
          .eq('user_id', USER_ID);

        if (error) {
          console.error('Error getting tasks created:', error);
          return 0;
        }
        return data.length;
      },

      streak: async () => {
        // Get from statistics table (según el esquema que proporcionaste)
        const { data: statsData, error: statsError } = await supabase
          .from('statistics')
          .select('racha')
          .eq('id_User', USER_ID)
          .maybeSingle();

        if (!statsError && statsData) {
          return statsData.racha || 0;
        }

        return 0;
      },

      early_tasks: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('due_date')
          .eq('user_id', USER_ID)
          .eq('completed', true)
          .not('due_date', 'is', null);

        if (error) {
          console.error('Error getting early tasks:', error);
          return 0;
        }

        return data.filter(task => {
          if (!task.due_date) return false;
          const hour = new Date(task.due_date).getHours();
          return hour < 9;
        }).length;
      },

      subtasks_completed: async () => {
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', USER_ID);

        if (tasksError || !tasks.length) return 0;

        const taskIds = tasks.map(t => t.id);
        const { data: subtasks, error: subtasksError } = await supabase
          .from('subTask')
          .select('id_Task')
          .in('id_Task', taskIds)
          .eq('state', true);

        if (subtasksError) return 0;

        // Contar por tarea padre
        const counts = {};
        subtasks.forEach(sub => {
          counts[sub.id_Task] = (counts[sub.id_Task] || 0) + 1;
        });

        // Máximo de subtareas completadas en una tarea
        return Math.max(...Object.values(counts), 0);
      },

      tasks_in_day: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('updated_at')
          .eq('user_id', USER_ID)
          .eq('completed', true);

        if (error) return 0;

        const counts = {};
        data.forEach(task => {
          const date = new Date(task.updated_at).toDateString();
          counts[date] = (counts[date] || 0) + 1;
        });

        return Math.max(...Object.values(counts), 0);
      },

      solo_tasks: async () => {
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', USER_ID)
          .eq('completed', true);

        if (tasksError || !tasks.length) return 0;

        const taskIds = tasks.map(t => t.id);
        const { data: subtasks, error: subtasksError } = await supabase
          .from('subTask')
          .select('id_Task')
          .in('id_Task', taskIds);

        if (subtasksError) return 0;

        const tasksWithSubtasks = new Set(subtasks.map(s => s.id_Task));
        return tasks.filter(t => !tasksWithSubtasks.has(t.id)).length;
      },

      sunday_tasks: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('due_date')
          .eq('user_id', USER_ID)
          .eq('completed', true)
          .not('due_date', 'is', null);

        if (error) return 0;

        return data.filter(task => {
          const day = new Date(task.due_date).getDay();
          return day === 0; // Domingo
        }).length;
      }
    };

    // Procesar cada logro
    for (const [achievementId, achievement] of Object.entries(achievements)) {
      console.log(`\n🏆 Processing achievement: ${achievementId} (${achievement.name})`);

      try {
        // Calcular progreso actual
        const progressCalculator = progressCalculators[achievement.type];
        const currentProgress = progressCalculator ? await progressCalculator() : 0;

        console.log(`📊 Current progress: ${currentProgress}/${achievement.targetValue}`);

        // Verificar si ya existe
        const { data: existing, error: checkError } = await supabase
          .from('userAchievements')
          .select('*')
          .eq('id_User', USER_ID)
          .eq('achievementId', achievementId)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`❌ Error checking existing achievement ${achievementId}:`, checkError);
          continue;
        }

        if (existing) {
          console.log(`📝 Updating existing achievement ${achievementId}`);
          // Actualizar progreso
          const { error: updateError } = await supabase
            .from('userAchievements')
            .update({
              progress: currentProgress,
              isCompleted: currentProgress >= achievement.targetValue,
              unlockedAt: currentProgress >= achievement.targetValue ? new Date().toISOString() : existing.unlockedAt
            })
            .eq('id_User', USER_ID)
            .eq('achievementId', achievementId);

          if (updateError) {
            console.error(`❌ Error updating ${achievementId}:`, updateError);
          } else {
            console.log(`✅ Updated ${achievementId}`);
          }
        } else {
          console.log(`🆕 Creating new achievement ${achievementId}`);
          // Crear nuevo registro
          const { error: insertError } = await supabase
            .from('userAchievements')
            .insert({
              id_User: USER_ID,
              achievementId: achievementId,
              progress: currentProgress,
              isCompleted: currentProgress >= achievement.targetValue,
              unlockedAt: currentProgress >= achievement.targetValue ? new Date().toISOString() : null
            });

          if (insertError) {
            console.error(`❌ Error creating ${achievementId}:`, insertError);
          } else {
            console.log(`✅ Created ${achievementId}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing ${achievementId}:`, error);
      }
    }

    console.log('\n🎉 Achievement population completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

populateUserAchievements().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});