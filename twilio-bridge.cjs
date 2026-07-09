const http = require('http');
const { URL } = require('url');
const WebSocket = require('ws');
const { WebSocketServer } = WebSocket;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PORT = Number(process.env.TWILIO_BRIDGE_PORT || 3006);
const PUBLIC_BASE_URL =
  process.env.TWILIO_PUBLIC_BASE_URL || 'https://staging.anino-ai.com';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REALTIME_MODEL = process.env.REALTIME_MODEL || 'gpt-realtime-2';
const REALTIME_VOICE = process.env.REALTIME_VOICE || 'marin';
const TRANSCRIPTION_MODEL =
  process.env.TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';

function escapeXml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function sendJson(socket, payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function buildInstructions(agent) {
  const tone = Array.isArray(agent.tone) && agent.tone.length
    ? agent.tone.join(', ')
    : 'מקצועי וידידותי';

  return `אתה ${agent.name}.
מטרתך:
${agent.purpose || 'לסייע ללקוח ולענות על שאלותיו.'}

דבר תמיד בעברית טבעית, קצרה וברורה.
הטון שלך: ${tone}.
פתח את השיחה בברכה קצרה בעברית.
אל תספר שאתה מערכת טכנית או בוט אלא אם נשאלת ישירות.
אם אינך יודע מידע, אמור זאת בצורה נעימה.`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname !== '/api/twilio/voice') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const agentId = String(url.searchParams.get('agentId') || '').trim();

  if (!agentId) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Missing agentId');
    return;
  }

  const streamUrl = PUBLIC_BASE_URL
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://') + '/api/twilio/media-stream';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(streamUrl)}">
      <Parameter name="AgentId" value="${escapeXml(agentId)}" />
    </Stream>
  </Connect>
</Response>`;

  res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
  res.end(xml);
});

const twilioWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname !== '/api/twilio/media-stream') {
    socket.destroy();
    return;
  }

  twilioWss.handleUpgrade(request, socket, head, (client) => {
    twilioWss.emit('connection', client);
  });
});

twilioWss.on('connection', (twilioSocket) => {
  let streamSid = '';
  let openAiSocket = null;
  let openAiReady = false;
  let pendingAudio = [];

  const closeAll = () => {
    if (openAiSocket && openAiSocket.readyState === WebSocket.OPEN) {
      openAiSocket.close();
    }
    if (twilioSocket.readyState === WebSocket.OPEN) {
      twilioSocket.close();
    }
  };

  const connectOpenAi = async (agentId) => {
    if (openAiSocket || !agentId) return;

    if (!OPENAI_API_KEY) {
      console.error('Twilio bridge: OPENAI_API_KEY is missing');
      closeAll();
      return;
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      console.error('Twilio bridge: agent not found:', agentId);
      closeAll();
      return;
    }

    openAiSocket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    openAiSocket.on('open', () => {
      sendJson(openAiSocket, {
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: buildInstructions(agent),
          output_modalities: ['audio'],
          audio: {
            input: {
              format: { type: 'audio/pcmu' },
              transcription: { model: TRANSCRIPTION_MODEL },
              turn_detection: {
                type: 'semantic_vad',
                eagerness: 'medium',
                create_response: true,
                interrupt_response: true
              }
            },
            output: {
              format: { type: 'audio/pcmu' },
              voice: REALTIME_VOICE
            }
          }
        }
      });

      openAiReady = true;

      for (const payload of pendingAudio) {
        sendJson(openAiSocket, {
          type: 'input_audio_buffer.append',
          audio: payload
        });
      }

      pendingAudio = [];

      sendJson(openAiSocket, {
        type: 'response.create',
        response: {
          instructions: 'פתח עכשיו את השיחה בברכה קצרה בעברית.'
        }
      });
    });

    openAiSocket.on('message', (raw) => {
      try {
        const event = JSON.parse(raw.toString());

        if (event.type === 'response.output_audio.delta' && streamSid) {
          sendJson(twilioSocket, {
            event: 'media',
            streamSid,
            media: { payload: event.delta }
          });
        }

        if (event.type === 'input_audio_buffer.speech_started' && streamSid) {
          sendJson(twilioSocket, {
            event: 'clear',
            streamSid
          });
        }

        if (event.type === 'error') {
          console.error('OpenAI Realtime error:', event.error || event);
        }
      } catch (error) {
        console.error('Twilio bridge parse error:', error);
      }
    });

    openAiSocket.on('error', (error) => {
      console.error('OpenAI bridge socket error:', error.message);
    });

    openAiSocket.on('close', () => {
      openAiReady = false;
    });
  };

  twilioSocket.on('message', async (raw) => {
    try {
      const event = JSON.parse(raw.toString());

      if (event.event === 'start') {
        streamSid = event.start?.streamSid || event.streamSid || '';

        const agentId =
          event.start?.customParameters?.AgentId ||
          event.start?.customParameters?.agentId ||
          '';

        await connectOpenAi(agentId);
        return;
      }

      if (event.event === 'media' && event.media?.payload) {
        if (!openAiReady) {
          pendingAudio.push(event.media.payload);
          return;
        }

        sendJson(openAiSocket, {
          type: 'input_audio_buffer.append',
          audio: event.media.payload
        });

        return;
      }

      if (event.event === 'stop') {
        closeAll();
      }
    } catch (error) {
      console.error('Twilio socket message error:', error);
    }
  });

  twilioSocket.on('close', closeAll);
  twilioSocket.on('error', closeAll);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Twilio realtime bridge running on http://127.0.0.1:${PORT}`);
});
