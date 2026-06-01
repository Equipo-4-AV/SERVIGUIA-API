import os
from dotenv import load_dotenv
from sqlmodel import Session, select

# Load environment variables (useful if running script outside of Docker)
load_dotenv()

from src.models.db_models import User, Time
from src.data.database import engine, init_db

def main():
    print("Initializing database tables...")
    init_db()

    print("Opening database session...")
    with Session(engine) as session:
        # Check if test user already exists and delete to ensure clean test run
        statement = select(User).where(User.email == "test@example.com")
        existing_user = session.exec(statement).first()
        if existing_user:
            print("Found existing test user, deleting to reset test...")
            session.delete(existing_user)
            session.commit()

        # Create user
        print("Creating test User...")
        user = User(
            email="test@example.com",
            name="Test User",
            age=25
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"Created user: {user.id} — {user.email}")

        # Create time entry
        print("Creating test Time entry...")
        time = Time()
        session.add(time)
        session.commit()
        session.refresh(time)
        print(f"Created time entry: {time.id} — {time.createdAt}")

if __name__ == "__main__":
    main()