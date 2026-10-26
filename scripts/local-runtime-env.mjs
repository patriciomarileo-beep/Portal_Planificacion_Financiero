import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
// Only used on the local machine; Cloud Run keeps standard ADC.
export function localRuntimeEnv(environment = process.env, root = process.cwd()) {
  const env = { ...environment };
  const candidates = [
    env.GOOGLE_APPLICATION_CREDENTIALS,
    join(root, ".gcloud", "application_default_credentials.json"),
    env.CLOUDSDK_CONFIG && join(env.CLOUDSDK_CONFIG, "application_default_credentials.json"),
    env.APPDATA && join(env.APPDATA, "gcloud", "application_default_credentials.json"),
    join(homedir(), ".config", "gcloud", "application_default_credentials.json"),
  ].filter(Boolean);
  const credential = candidates.find(path => existsSync(path));
  if (credential) env.GOOGLE_APPLICATION_CREDENTIALS = credential;
  else if (env.GOOGLE_APPLICATION_CREDENTIALS) delete env.GOOGLE_APPLICATION_CREDENTIALS;
  env.PORT ||= "3000";
  env.HOSTNAME ||= "127.0.0.1";
  env.APP_ORIGIN ||= "http://localhost:" + env.PORT;
  return env;
}
