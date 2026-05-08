from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Engine asincrono per PostgreSQL
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,        # logga le query SQL in console quando debug=True
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,         # verifica che la connessione sia viva prima di usarla
)

# Factory di sessioni asincrone
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,     # evita refresh automatico dopo commit
)


# Base dichiarativa per tutti i modelli
class Base(DeclarativeBase):
    pass


# Dependency FastAPI: inietta una sessione e la chiude a fine richiesta
async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise