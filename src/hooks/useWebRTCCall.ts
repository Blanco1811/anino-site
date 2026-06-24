import { useState, useEffect, useRef } from 'react';

interface UseWebRTCCallProps {
  sessionApiUrl: string;
  agentSlug?: string;
}

export function useWebRTCCall({ sessionApiUrl, agentSlug }: UseWebRTCCallProps) {
  const [isWebRTCOn, setIsWebRTCOn] = useState(false);
  const [webRTCLoading, setWebRTCLoading] = useState(false);
  const [webRTCError, setWebRTCError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callTokenRef = useRef<string | null>(null);

  // Synchronize refs for unload handler and callbacks to read fresh values
  const sessionApiUrlRef = useRef(sessionApiUrl);
  const agentSlugRef = useRef(agentSlug);
  sessionApiUrlRef.current = sessionApiUrl;
  agentSlugRef.current = agentSlug;

  const startCall = async () => {
    setWebRTCLoading(true);
    setWebRTCError(null);
    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Request ephemeral token
      const res = await fetch(sessionApiUrlRef.current, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'שגיאה בקבלת מפתח גישה' }));
        throw new Error(errJson.error || 'Failed to initialize session');
      }
      const data = await res.json();
      
      // OpenAI Realtime API returns ephemeral token in data.value (client_secrets endpoint)
      const ephemeralKey = data.value || data.client_secret?.value || data.client_secret;
      if (!ephemeralKey) {
        throw new Error('מפתח גישה קצר-טווח לא התקבל משרת ה-AI.');
      }

      // 3. Setup RTCPeerConnection
      const newPc = new RTCPeerConnection();
      
      // Play remote audio
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      newPc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      newPc.addTrack(stream.getTracks()[0]);

      // Create DataChannel for events
      const dc = newPc.createDataChannel("oai-events");
      
      dc.onopen = () => {
        console.log("OpenAI WebRTC DataChannel opened.");
        try {
          dc.send(JSON.stringify({
            type: "response.create"
          }));
        } catch (err) {
          console.error("Failed to send response.create over DataChannel:", err);
        }
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log("Received DataChannel event:", event);
        } catch {
          console.log("Received raw DataChannel message:", e.data);
        }
      };

      dcRef.current = dc;

      // Create offer
      const offer = await newPc.createOffer();
      await newPc.setLocalDescription(offer);

      // Exchange SDP with OpenAI Realtime API (WebRTC Calls endpoint)
      const openaiRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!openaiRes.ok) {
        const errSdp = await openaiRes.text();
        throw new Error(`OpenAI Handshake Failed: ${errSdp}`);
      }

      const answerSdp = await openaiRes.text();
      await newPc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: answerSdp,
      }));

      pcRef.current = newPc;
      setIsWebRTCOn(true);

      // 4. Log the call start in PostgreSQL after successful WebRTC connection
      if (agentSlugRef.current) {
        try {
          const logRes = await fetch(`/api/agents/by-slug/${agentSlugRef.current}/browser-call/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (logRes.ok) {
            const logData = await logRes.json();
            if (logData.callId && logData.callToken) {
              callIdRef.current = logData.callId;
              callTokenRef.current = logData.callToken;
            }
          }
        } catch (logErr) {
          console.error('Failed to log call start in database:', logErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setWebRTCError(err.message || 'לא ניתן היה להתחבר למיקרופון או לשרת.');
      cleanupTracks();
    } finally {
      setWebRTCLoading(false);
    }
  };

  const cleanupTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const stopCall = async () => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    cleanupTracks();
    setIsWebRTCOn(false);

    // Send end call event if we logged a call start
    if (callIdRef.current && callTokenRef.current) {
      const callId = callIdRef.current;
      const callToken = callTokenRef.current;
      
      // Reset local references immediately to prevent double submissions
      callIdRef.current = null;
      callTokenRef.current = null;

      try {
        await fetch(`/api/calls/${callId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callToken })
        });
      } catch (endErr) {
        console.error('Failed to log call end in database:', endErr);
      }
    }
  };

  // Handle page unload or unmounting to cleanly disconnect and save duration
  useEffect(() => {
    const handleUnload = () => {
      if (callIdRef.current && callTokenRef.current) {
        const callId = callIdRef.current;
        const callToken = callTokenRef.current;
        
        callIdRef.current = null;
        callTokenRef.current = null;

        // Use keepalive: true to ensure the request goes out even if the window is closing
        fetch(`/api/calls/${callId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callToken }),
          keepalive: true
        });
      }
      
      if (dcRef.current) {
        dcRef.current.close();
        dcRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, []);

  return {
    isWebRTCOn,
    webRTCLoading,
    webRTCError,
    startCall,
    stopCall,
    pc: pcRef.current,
    localStream: streamRef.current
  };
}
