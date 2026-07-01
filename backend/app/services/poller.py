import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import async_session
from app.services.gmail import expire_old_jobs, poll_all_users

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _poll_job():
    async with async_session() as db:
        try:
            count = await expire_old_jobs(db)
            if count:
                logger.info("Expired %d jobs", count)
            await poll_all_users(db)
        except Exception as e:
            logger.error("Poll job failed: %s", e)


def start_scheduler(interval_seconds: int) -> None:
    if scheduler.running:
        return
    scheduler.add_job(_poll_job, "interval", seconds=interval_seconds, id="gmail_poll")
    scheduler.start()
    logger.info("Gmail poller started (every %ds)", interval_seconds)


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
