/**
 * Fill these in once you've created a free Firebase project — see
 * cricket/README.md § "Live shared scoring" for exact steps. These values
 * are meant to be public (they identify your project, not a secret); access
 * control is enforced by the Firestore security rules in that README, not
 * by hiding this config.
 *
 * Until apiKey is filled in, the app runs in local-only mode: each device
 * keeps its own matches and a shared link won't sync between devices.
 */
export const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfig.apiKey !== 'REPLACE_ME' && firebaseConfig.apiKey.length > 0
}
