import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship
import sqlalchemy as sa


class WorkerSubcategoryLink(SQLModel, table=True):
    __tablename__: str = "WorkerSubcategoryLink"
    worker_id: uuid.UUID = Field(foreign_key="Worker.id", primary_key=True)
    subcategory_id: uuid.UUID = Field(foreign_key="Subcategory.id", primary_key=True)

class WorkerBadgeLink(SQLModel, table=True):
    __tablename__: str = "WorkerBadgeLink"
    worker_id: uuid.UUID = Field(foreign_key="Worker.id", primary_key=True)
    badge_id: uuid.UUID = Field(foreign_key="Badge.id", primary_key=True)

class Category(SQLModel, table=True):
    __tablename__: str = "Category"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)

    subcategories: List["Subcategory"] = Relationship(back_populates="category")
    workers: List["Worker"] = Relationship(back_populates="category")

class Subcategory(SQLModel, table=True):
    __tablename__: str = "Subcategory"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
    category_id: uuid.UUID = Field(foreign_key="Category.id")

    category: Category = Relationship(back_populates="subcategories")
    workers: List["Worker"] = Relationship(
        back_populates="subcategories",
        link_model=WorkerSubcategoryLink
    )

class Badge(SQLModel, table=True):
    __tablename__: str = "Badge"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)

    workers: List["Worker"] = Relationship(
        back_populates="badges",
        link_model=WorkerBadgeLink
    )

class Worker(SQLModel, table=True):
    __tablename__: str = "Worker"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(index=True)
    name: str
    rating: float
    reviews_count: int
    hourly_rate: float
    available: bool
    experience_years: int
    completed_jobs: int
    zone: str
    phone: str

    category_id: uuid.UUID = Field(foreign_key="Category.id")
    category: Category = Relationship(back_populates="workers")

    subcategories: List[Subcategory] = Relationship(
        back_populates="workers",
        link_model=WorkerSubcategoryLink
    )
    badges: List[Badge] = Relationship(
        back_populates="workers",
        link_model=WorkerBadgeLink
    )

class User(SQLModel, table=True):
    __tablename__: str = "User"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)

    refresh_tokens: List["RefreshToken"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class RefreshToken(SQLModel, table=True):
    __tablename__: str = "RefreshToken"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="User.id")
    token_hash: str = Field(index=True)
    expires_at: datetime = Field(
        sa_column=sa.Column(sa.DateTime(timezone=True), nullable=False)
    )
    is_revoked: bool = Field(default=False)

    user: User = Relationship(back_populates="refresh_tokens")
