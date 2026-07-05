import os
from fastapi import Request, HTTPException, status
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set")

# Initialize a local Supabase client instance to verify tokens against the Supabase Auth server.
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency to extract and verify the Supabase access token.
    If no token is present, returns a guest user so unauthenticated users
    can still access the RAG pipeline (data stored in-memory only).
    """
    token = request.cookies.get("access_token")

    # No token → guest mode (in-memory session, no persistence)
    if not token:
        return {"sub": "guest", "email": "guest@local"}

    try:
        auth_response = supabase_client.auth.get_user(token)
        user = auth_response.user
        return {
            "sub": user.id,
            "email": user.email
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}"
        )

