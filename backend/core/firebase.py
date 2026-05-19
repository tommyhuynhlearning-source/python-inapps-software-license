import json
import os

_firebase_initialized = False


def _get_oauth_credentials():
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if not creds_json:
        return None
    from google.oauth2.credentials import Credentials
    data = json.loads(creds_json)
    return Credentials(
        token=None,
        refresh_token=data.get("refresh_token"),
        client_id=data.get("client_id"),
        client_secret=data.get("client_secret"),
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )


def get_db():
    from google.cloud import firestore
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "")
    creds = _get_oauth_credentials()

    if creds:
        # Vercel: use REST transport with explicit OAuth credentials (avoids gRPC hang)
        return firestore.Client(project=project_id, credentials=creds, prefer_rest=True)

    # Local dev: use Application Default Credentials (firebase login)
    import firebase_admin
    from firebase_admin import credentials as fb_credentials
    if not firebase_admin._apps:
        fb_cred = fb_credentials.ApplicationDefault()
        firebase_admin.initialize_app(fb_cred, {"projectId": project_id} if project_id else {})
    return firestore.Client(project=project_id, prefer_rest=True)
