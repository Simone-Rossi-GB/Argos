import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Importa il Base metadata e le impostazioni
from app.core.config import settings
from app.core.database import Base

# Importa TUTTI i modelli perché Alembic li veda
from app.models.user import User
from app.models.camera import Camera
from app.models.event import Event, MediaClip
from app.models.alert import Alert

# Configurazione logging Alembic
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override dell'URL dal file di configurazione
config.set_main_option("sqlalchemy.url", settings.database_url)

# Metadata dei modelli per autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Esegue migrazioni in modalità 'offline' (senza connessione al DB).
    Genera lo script SQL senza eseguirlo.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Esegue le migrazioni su una connessione attiva."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Crea un engine asincrono e chiama le migrazioni.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Esegue migrazioni in modalità 'online' (connessione reale al DB)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()