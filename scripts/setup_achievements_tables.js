import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAchievementsTables() {
  console.log('🔧 Setting up achievements tables...');

  try {
    // Try to query the user_achievements table to see if it exists
    console.log('🔍 Checking if user_achievements table exists...');
    const { data: existingData, error: queryError } = await supabase
      .from('user_achievements')
      .select('id')
      .limit(1);

    if (queryError && queryError.code === 'PGRST116') {
      // Table doesn't exist, try to create it
      console.log('📝 user_achievements table does not exist, attempting to create...');

      // Since we can't use information_schema, let's try to create the table directly
      // This will fail if the table already exists, which is fine
      try {
        const { error: createError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
            achievement_id: 'test',
            progress: 0,
            is_completed: false
          });

        if (createError && createError.code !== '23505') { // 23505 is unique constraint violation
          console.log('⚠️  Could not create table automatically. Please run this SQL in your Supabase SQL editor:');
          console.log(`
-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Insert default data if needed
INSERT INTO user_achievements (user_id, achievement_id, progress, is_completed)
VALUES ('00000000-0000-0000-0000-000000000000', 'test', 0, false)
ON CONFLICT (user_id, achievement_id) DO NOTHING;
          `);
        } else {
          console.log('✅ user_achievements table created or already exists');
        }
      } catch (insertError) {
        console.log('⚠️  Could not verify table creation. Please ensure the table exists by running this SQL:');
        console.log(`
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
        `);
      }
    } else if (queryError) {
      console.error('❌ Unexpected error checking table:', queryError);
    } else {
      console.log('✅ user_achievements table exists');
    }

    // Check priorities table
    console.log('🔍 Checking priorities table...');
    const { data: priorities, error: prioritiesError } = await supabase
      .from('priorities')
      .select('*')
      .limit(10);

    if (prioritiesError) {
      console.error('❌ Error checking priorities:', prioritiesError);
      console.log('⚠️  Priorities table may not exist. Please ensure it exists with:');
      console.log(`
INSERT INTO priorities (name) VALUES ('Baja'), ('Media'), ('Alta') ON CONFLICT (name) DO NOTHING;
      `);
    } else {
      console.log('✅ Priorities table exists with data:', priorities);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupAchievementsTables().then(() => {
  console.log('🎉 Setup completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Setup failed:', error);
  process.exit(1);
});