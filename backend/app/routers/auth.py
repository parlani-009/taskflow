import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from tortoise.exceptions import DoesNotExist, IntegrityError

from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.models.models import User
from app.schemas.auth import UserCreate, LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

INVALID_CREDENTIALS = "invalid credentials"


@router.post("/register")
async def register(user_in: UserCreate) -> JSONResponse:
    """Register a new user. Returns 201 on success, 400 if email already exists."""
    logger.info(f"Register attempt for email: {user_in.email}")

    # Check for existing email
    try:
        existing = await User.get(email=user_in.email)
        if existing:
            logger.warning(f"Registration failed — email already exists: {user_in.email}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "email already registered"},
            )
    except DoesNotExist:
        pass

    try:
        user = await User.create(
            name=user_in.name,
            email=user_in.email,
            password=get_password_hash(user_in.password),
        )
    except IntegrityError:
        logger.error(f"Registration failed — integrity error for email: {user_in.email}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "email already registered"},
        )

    logger.info(f"User registered successfully: id={user.id}, email={user.email}")
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"id": user.id, "name": user.name, "email": user.email},
    )


@router.post("/login")
async def login(user_in: LoginRequest) -> JSONResponse:
    """Authenticate user and return JWT token. Returns 401 on invalid credentials."""
    logger.info(f"Login attempt for email: {user_in.email}")

    try:
        user = await User.get(email=user_in.email)
    except DoesNotExist:
        logger.warning(f"Login failed — user not found: {user_in.email}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": INVALID_CREDENTIALS},
        )

    if not verify_password(user_in.password, user.password):
        logger.warning(f"Login failed — invalid password for email: {user_in.email}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": INVALID_CREDENTIALS},
        )

    token = create_access_token({"sub": user.id})
    logger.info(f"Login successful: user_id={user.id}")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"access_token": token, "token_type": "bearer"},
    )


@router.get("/me")
async def get_me(user_id: int = Depends(get_current_user)) -> JSONResponse:
    """Return current authenticated user. Returns 404 if user not found."""
    try:
        user = await User.get(id=user_id)
    except DoesNotExist:
        logger.error(f"GET /auth/me — user not found: id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "user not found"},
        )

    logger.info(f"GET /auth/me — user_id={user_id}")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"id": user.id, "name": user.name, "email": user.email},
    )