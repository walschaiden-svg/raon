import { getSupabase, isSupabaseConfigured } from '../../assets/js/supabase-client.js';

export { isSupabaseConfigured };
export const supabase = await getSupabase();

export async function requireAuth() {
  if (!supabase) {
    alert('Supabase가 아직 설정되지 않았습니다. assets/js/supabase-config.js 에 프로젝트 URL과 anon key를 입력해주세요.');
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

export async function redirectIfLoggedIn() {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.href = 'index.html';
}

export async function login(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}
