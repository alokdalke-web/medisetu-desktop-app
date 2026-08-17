import { shell } from 'electron';
import http from 'http';
import { URL } from 'url';
import crypto from 'crypto';

export default class GoogleOAuthService {
  private static server: http.Server | null = null;
  private static port = 54321;

  public static async login(clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Close any existing server
      if (this.server) {
        this.server.close();
      }

      let resolved = false;
      
      // Auto-timeout after 5 minutes if the user doesn't complete the login
      const timeout = setTimeout(() => {
        if (!resolved) {
          if (this.server) this.server.close();
          this.server = null;
          reject(new Error('Google login timed out or was cancelled by user.'));
        }
      }, 5 * 60 * 1000);

      this.server = http.createServer((req, res) => {
        const reqUrl = new URL(req.url || '', `http://localhost:${this.port}`);
        
        // Handle CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
           res.writeHead(200);
           res.end();
           return;
        }

        if (req.method === 'POST' && reqUrl.pathname === '/callback') {
          // The frontend HTML page posts the id_token here
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
             try {
                const data = JSON.parse(body);
                if (data.id_token) {
                   res.writeHead(200, { 'Content-Type': 'application/json' });
                   res.end(JSON.stringify({ success: true }));
                   
                   resolved = true;
                   clearTimeout(timeout);
                   resolve(data.id_token);
                   
                   if (this.server) this.server.close();
                   this.server = null;
                } else if (data.error) {
                   res.writeHead(400);
                   res.end(JSON.stringify({ success: false }));
                   
                   resolved = true;
                   clearTimeout(timeout);
                   reject(new Error(`Google Auth Error: ${data.error}`));
                   
                   if (this.server) this.server.close();
                   this.server = null;
                }
             } catch (e) {
                res.writeHead(400);
                res.end();
             }
          });
          return;
        }

        // GET request - serve the HTML page to extract the hash
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Infinity MediSetu Auth</title>
              <style>
                body { font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f9fafb; margin: 0; }
                .card { background: white; padding: 2rem 3rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; }
                h2 { color: #111827; margin-top: 0; }
                p { color: #6b7280; margin-bottom: 0; line-height: 1.5; }
                .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #0A6C74; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 1rem auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="card">
                <div id="spinner" class="spinner"></div>
                <h2 id="title">Processing Login...</h2>
                <p id="msg">Please wait while we complete your authentication securely.</p>
              </div>
              <script>
                async function processAuth() {
                  const hash = window.location.hash.substring(1);
                  const params = new URLSearchParams(hash);
                  const id_token = params.get('id_token');
                  const error = params.get('error');

                  try {
                    await fetch('/callback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id_token, error })
                    });
                    
                    document.getElementById('spinner').style.display = 'none';
                    document.getElementById('title').innerText = 'Login Successful!';
                    document.getElementById('msg').innerText = 'You can safely close this window and return to the Infinity MediSetu Desktop App.';
                    
                    // Attempt to close the window automatically
                    setTimeout(() => window.close(), 2500);
                  } catch (err) {
                    document.getElementById('spinner').style.display = 'none';
                    document.getElementById('title').innerText = 'Login Failed';
                    document.getElementById('msg').innerText = 'Something went wrong. Please close this window and try again.';
                  }
                }
                
                // Slight delay to ensure React app doesn't race
                setTimeout(processAuth, 100);
              </script>
            </body>
          </html>
        `);
      });

      this.server.on('error', (err) => {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      });

      this.server.listen(this.port, 'localhost', () => {
        // Generate a random nonce for security
        const nonce = crypto.randomBytes(16).toString('hex');
        
        // Construct the Google OAuth Implicit Flow URL
        // We use response_type=id_token so we don't need a client_secret to exchange a code
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=http://localhost:${this.port}&response_type=id_token&scope=openid email profile&nonce=${nonce}`;
        
        // Open the user's default browser
        shell.openExternal(authUrl);
      });
    });
  }
}
