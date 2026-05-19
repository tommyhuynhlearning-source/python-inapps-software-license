import firebase_admin
from firebase_admin import credentials, firestore


def init_firebase():
    if not firebase_admin._apps:
        # Uses Application Default Credentials (firebase login / ADC)
        # No service account key required
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)


def get_db():
    init_firebase()
    return firestore.client()
