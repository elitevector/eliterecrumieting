/* Публичная конфигурация. Здесь НЕТ секретов: anon key Supabase публичный по замыслу,
   доступ к данным защищён политиками RLS и серверными функциями.
   Оставьте поля пустыми — сайт запустится в ДЕМО-режиме (данные только в этом браузере). */
window.EVU_CONFIG = {
  SUPABASE_URL: "https://joxenqfccrilosqumjum.supabase.co",  // например: https://abcdxyz.supabase.co
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpveGVucWZjY3JpbG9zcXVtanVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxMTQ1MDMsImV4cCI6MjEwOTY5MDUwM30.SbKIRaO5yTUe6JzmEJ-cs12HBA9lf2wJTqA29t-7jTA"   // публичный anon key из Project Settings → API
};
