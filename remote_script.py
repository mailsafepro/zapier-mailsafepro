import asyncio
import os
import secrets
from app.database.connection import init_db, get_db_session
from app.database.repositories.user_repository import UserRepository
from app.database.repositories.api_key_repository import APIKeyRepository
from app.auth import get_password_hash, create_hashed_key, PLAN_SCOPES
from app.models import PlanEnum
try:
    from redis.asyncio import Redis
except ImportError:
    Redis = None
from app.config import settings

async def main():
    await init_db()
    email = 'integration-testing@zapier.com'
    password = 'ZapierTestPassword123!'
    plan = 'PREMIUM'
    
    async with get_db_session() as session:
        user_repo = UserRepository(session)
        api_key_repo = APIKeyRepository(session)
        
        user = await user_repo.get_by_email(email)
        if not user:
            print(f'Creating user {email}...')
            hashed_password = get_password_hash(password)
            user = await user_repo.create(email=email, hashed_password=hashed_password, plan=plan)
        else:
            print(f'User {email} exists. Updating plan...')
            await user_repo.update_plan(user.id, plan)
            user = await user_repo.get_by_id(user.id)
            
        api_key = f'zap_test_{secrets.token_urlsafe(24)}'
        key_hash = create_hashed_key(api_key)
        await api_key_repo.create(
            user_id=user.id,
            key_hash=key_hash,
            key_prefix=api_key[:12],
            name='Zapier Review Key',
            scopes=PLAN_SCOPES.get(plan, PLAN_SCOPES['FREE']),
        )
        await session.commit()
        print(f'SUCCESS: User {email} is {user.plan}. API Key: {api_key}')

if __name__ == '__main__':
    asyncio.run(main())
