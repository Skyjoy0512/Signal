const accessToken = required("SUPABASE_ACCESS_TOKEN");
const projectRef = required("SUPABASE_PROJECT_REF");
const clientId = required("GOOGLE_OAUTH_CLIENT_ID");
const clientSecret = required("GOOGLE_OAUTH_CLIENT_SECRET");

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    external_google_enabled: true,
    external_google_client_id: clientId,
    external_google_secret: clientSecret,
  }),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Supabase Google Auth configuration failed: HTTP ${response.status}`);
  if (body) console.error(redact(body));
  process.exit(1);
}

console.log(`Supabase Google Auth provider enabled for project ${projectRef}.`);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} is required.`);
    process.exit(1);
  }
  return value;
}

function redact(value) {
  return value
    .replaceAll(accessToken, "[redacted-supabase-token]")
    .replaceAll(clientSecret, "[redacted-google-secret]");
}
