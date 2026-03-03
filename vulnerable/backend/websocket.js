const WebSocket = require('ws');
const pool = require('./db/pool');

const clients = new Map();
function parseCookie(cookieHeader, name) {
  if (!cookieHeader) {return null;}
  const match = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(name + '='));
  if (!match) {return null;}
  return decodeURIComponent(match.slice(name.length + 1));
}
function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const rawCookie = parseCookie(req.headers.cookie, 'auth');
    let userId = null;

    if (rawCookie) {
      try {
        const decoded = Buffer.from(rawCookie, 'base64').toString('utf8');
        const payload = JSON.parse(decoded);
        userId = payload.userId ? String(payload.userId) : null;
      } catch {
        // Invalid cookie
      }
    }

    if (!userId) {
      ws.close(4001, 'Unauthorized');
      return;
    }
    clients.set(userId, ws);
    console.log(`[WS] User ${userId} connected. Total: ${clients.size}`);

    const messageHandlers = {
      async message(data) {
        const { to, content } = data;
        if (!to || !content || typeof content !== 'string' || !content.trim()) {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing to or content' }));
          return;
        }
        try {
          const result = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, sender_id, receiver_id, content, created_at`,
            [parseInt(userId), parseInt(to), content.trim()]
          );
          const msg = result.rows[0];
          const profilesResult = await pool.query(
            'SELECT id, username, profile_image FROM users WHERE id = ANY($1)',
            [[parseInt(userId), parseInt(to)]]
          );
          const senderProfile = profilesResult.rows.find(r => r.id === parseInt(userId));
          const recipientProfile = profilesResult.rows.find(r => r.id === parseInt(to));

          ws.send(
            JSON.stringify({
              type: 'message_sent',
              id: msg.id,
              to: msg.receiver_id,
              content: msg.content,
              created_at: msg.created_at,
              to_username: recipientProfile?.username || null,
              to_profile_image: recipientProfile?.profile_image || null,
            })
          );
          const recipientWs = clients.get(String(to));
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(
              JSON.stringify({
                type: 'message',
                id: msg.id,
                from: msg.sender_id,
                content: msg.content,
                created_at: msg.created_at,
                from_username: senderProfile?.username || null,
                from_profile_image: senderProfile?.profile_image || null,
              })
            );
          }
        } catch (err) {
          console.error('[WS] DB error:', err);
          ws.send(JSON.stringify({ type: 'error', message: 'Failed to save message' }));
        }
      },
      typing(data) {
        const { to } = data;
        if (!to) {return;}
        const recipientWs = clients.get(String(to));
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify({ type: 'typing', from: parseInt(userId) }));
        }
      },
      typing_stop(data) {
        const { to } = data;
        if (!to) {return;}
        const recipientWs = clients.get(String(to));
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify({ type: 'typing_stop', from: parseInt(userId) }));
        }
      },
    };

    ws.on('message', async rawData => {
      let data;
      try {
        data = JSON.parse(rawData.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      const handler = messageHandlers[data.type];
      if (handler) {
        await handler(data);
      }
    });

    ws.on('close', () => {
      clients.delete(userId);
      console.log(`[WS] User ${userId} disconnected. Total: ${clients.size}`);
    });

    ws.on('error', err => {
      console.error(`[WS] Error for user ${userId}:`, err.message);
    });
  });

  return wss;
}

module.exports = { setupWebSocket };
