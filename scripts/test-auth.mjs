import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ncjzozvzjtyycdlwohtr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5janpvenZ6anR5eWNkbHdvaHRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkxODkzNywiZXhwIjoyMDk0NDk0OTM3fQ.b4LSVdXiC6aZC3f27PWZWw4nA_3RQ2_IyqzLWy8CpQk',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.auth.admin.createUser({
  email: 'testonly@test.com',
  password: 'QAZwsx@1212',
  email_confirm: true,
});
if (error) {
  console.error('ERROR:', JSON.stringify(error, null, 2));
} else {
  console.log('OK:', data.user.id);
  // Clean up the test user
  await supabase.auth.admin.deleteUser(data.user.id);
  console.log('Cleaned up');
}
