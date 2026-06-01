import os
from dotenv import load_dotenv
from sqlmodel import Session, select

# Load environment variables
load_dotenv()

from src.data.db_models import Category, Subcategory, Badge, Worker
from src.data.database import engine, init_db

def main():
    print("Initializing database tables...")
    init_db()

    print("Opening database session...")
    with Session(engine) as session:
        # Count items
        num_categories = len(session.exec(select(Category)).all())
        num_subcategories = len(session.exec(select(Subcategory)).all())
        num_badges = len(session.exec(select(Badge)).all())
        num_workers = len(session.exec(select(Worker)).all())

        print(f"\nDatabase status:")
        print(f" - Categories: {num_categories}")
        print(f" - Subcategories: {num_subcategories}")
        print(f" - Badges: {num_badges}")
        print(f" - Workers: {num_workers}")

        # Fetch a sample worker with relationships
        print("\nFetching sample worker...")
        worker = session.exec(select(Worker)).first()
        if worker:
            print(f"Worker: {worker.name} (ID: {worker.id})")
            print(f" - Category: {worker.category.name if worker.category else 'None'}")
            sub_names = [sub.name for sub in worker.subcategories]
            badge_names = [badge.name for badge in worker.badges]
            print(f" - Subcategories: {', '.join(sub_names)}")
            print(f" - Badges: {', '.join(badge_names)}")
            print(f" - Phone: {worker.phone} | Hourly Rate: ${worker.hourly_rate}")
        else:
            print("No workers found in database. Run the seed script first: python -m src.data.seed")

if __name__ == "__main__":
    main()