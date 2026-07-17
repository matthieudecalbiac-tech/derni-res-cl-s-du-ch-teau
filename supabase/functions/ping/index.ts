// ============================================================
// Edge Function "ping" — sante de l'infrastructure Edge Functions.
//
// AUCUN metier : pas de base, pas d'auth, pas de secret. Elle sert uniquement a
// prouver que le tuyau marche (deploiement + invocation) AVANT d'y faire passer
// la vraie fonction de reservation.
//
// Deno.serve : runtime natif de l'Edge Runtime Supabase (aucun import).
// verify_jwt = false (cf. config.toml) -> appelable sans Authorization.
// ============================================================
Deno.serve(() => {
  return new Response(
    JSON.stringify({ ok: true, ts: Date.now() }),
    { headers: { "Content-Type": "application/json" } },
  );
});
