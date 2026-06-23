export interface TwilioCallResponse {
  success: boolean;
  sid?: string;
  error?: string;
  status?: number;
}

export class TwilioService {
  private static getCredentials() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    return { sid, token, from };
  }

  public static isConfigured(): boolean {
    const { sid, token, from } = this.getCredentials();
    return !!(sid && token && from);
  }

  public static async initiateCall(toNumber: string, purpose?: string): Promise<TwilioCallResponse> {
    const { sid, token, from } = this.getCredentials();
    if (!sid || !token || !from) {
      return {
        success: false,
        error: 'Twilio configurations are missing from environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).'
      };
    }

    try {
      const basicAuth = Buffer.from(`${sid}:${token}`).toString('base64');
      const twilioBody = new URLSearchParams();
      twilioBody.append('To', toNumber);
      twilioBody.append('From', from);
      
      // Standard demo XML as default, or configure custom TwiML Url
      const twiMLUrl = process.env.TWILIO_TWIML_URL || 'https://demo.twilio.com/docs/voice.xml';
      twilioBody.append('Url', twiMLUrl);

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: twilioBody.toString()
        }
      );

      const responseText = await twilioRes.text();

      if (!twilioRes.ok) {
        let errMsg = responseText;
        try {
          const errJson = JSON.parse(responseText);
          errMsg = errJson.message || responseText;
        } catch {}
        return {
          success: false,
          error: `Twilio call failed: ${errMsg}`,
          status: twilioRes.status
        };
      }

      const twilioData = JSON.parse(responseText);
      return {
        success: true,
        sid: twilioData.sid
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'אירעה שגיאה פנימית בעת התחברות ל-Twilio.'
      };
    }
  }
}
