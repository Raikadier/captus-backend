import { getSupabaseClient } from './src/lib/supabaseAdmin.js';

const run = async () => {
    const client = getSupabaseClient();
    if (!client) {
        console.error('Supabase client not initialized');
        return;
    }

    const teacherId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID

    console.log('Testing problematic query...');
    try {
        const { data, error } = await client
            .from('courses')
            .select(`
        *,
        enrollments:course_enrollments(count),
        assignments:assignments(
          id,
          submissions:assignment_submissions(count)
        )
      `)
            .eq('teacher_id', teacherId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Query failed:', error);
        } else {
            console.log('Query success:', data);
        }
    } catch (err) {
        console.error('Exception:', err);
    }

    console.log('Testing simplified query...');
    try {
        const { data, error } = await client
            .from('courses')
            .select(`
        *,
        enrollments:course_enrollments(count)
      `)
            .eq('teacher_id', teacherId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Simplified query failed:', error);
        } else {
            console.log('Simplified query success:', data);
        }
    } catch (err) {
        console.error('Exception:', err);
    }
};

run();
