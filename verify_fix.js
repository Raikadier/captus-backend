import { getSupabaseClient } from './src/lib/supabaseAdmin.js';
import CourseRepository from './src/repositories/CourseRepository.js';

const run = async () => {
    const client = getSupabaseClient();
    if (!client) {
        console.error('Supabase client not initialized');
        return;
    }

    const teacherId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    const repo = new CourseRepository();

    console.log('Testing fixed findByTeacher...');
    try {
        // We are testing the actual repository method now
        const data = await repo.findByTeacher(teacherId);
        console.log('Query success. Result:', data);
    } catch (err) {
        console.error('Query failed:', err);
        process.exit(1);
    }
};

run();
