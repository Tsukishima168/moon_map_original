import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createHiddenCategory() {
    console.log('Inserting "hidden" category...');

    const { data, error } = await supabase
        .from('menu_categories')
        .upsert({
            id: 'hidden',
            title: 'Daily Secret / 本日隱藏限定',
            subtitle: '島主的私房信籤，揭開今日驚喜',
            sort_order: -1
        }, { onConflict: 'id' });

    if (error) {
        console.error('Error:', error.message);
        if (error.message.includes('permission denied')) {
            console.log('--- ACTION REQUIRED ---');
            console.log('Anon key lacks permission to insert. Please run the following SQL in your Supabase Dashboard:');
            console.log(`INSERT INTO menu_categories (id, title, subtitle, sort_order) 
VALUES ('hidden', 'Daily Secret / 本日隱藏限定', '島主的私房信籤，揭開今日驚喜', -1) 
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, sort_order = EXCLUDED.sort_order;`);
        }
    } else {
        console.log('Successfully created "hidden" category!');
    }
}

createHiddenCategory();
