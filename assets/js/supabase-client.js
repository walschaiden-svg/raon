import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

export const isSupabaseConfigured =
  !!SUPABASE_URL && !SUPABASE_URL.includes('YOUR_') &&
  !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_');

let clientPromise = null;

/*
  Supabase SDK를 동적으로 불러옵니다. (esm.sh CDN)
  - 아직 설정 전이거나 네트워크 문제로 로드에 실패해도 사이트 전체가 깨지지 않도록
    항상 null을 안전하게 반환합니다. (기본값/캐시된 콘텐츠로 자동 대체됩니다)
*/
export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
      .catch((err) => {
        console.error('[supabase] SDK 로드 실패, 기본 콘텐츠로 대체합니다:', err);
        return null;
      });
  }
  return clientPromise;
}
