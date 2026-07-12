// Crée un client Supabase pour un contexte Node (scripts, agents CI).
// Realtime désactivé : ces scripts ne font que des SELECT, jamais de .subscribe().
// Sur Node < 22 (le runner CI est en Node 20), le client Realtime résout WebSocket
// dès la construction et crashe faute de WebSocket natif. Un transport stub satisfait
// cette résolution eager sans jamais ouvrir de socket - il throw si on l'instancie,
// ce qui n'arrive pas puisque connect() n'est appelé que par .subscribe().
const { createClient } = require("@supabase/supabase-js");

class StubWebSocket {
  constructor() {
    throw new Error("Realtime non supporté dans ce contexte Node (SELECT uniquement)");
  }
}

function creerClientNode(url, key) {
  return createClient(url, key, { realtime: { transport: StubWebSocket } });
}

module.exports = { creerClientNode };
