from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

class WorkerSubcategoryLink(SQLModel, table=True):
    __tablename__: str = "WorkerSubcategoryLink"
    worker_id: str = Field(foreign_key="Worker.id", primary_key=True)
    subcategory_id: int = Field(foreign_key="Subcategory.id", primary_key=True)

class WorkerBadgeLink(SQLModel, table=True):
    __tablename__: str = "WorkerBadgeLink"
    worker_id: str = Field(foreign_key="Worker.id", primary_key=True)
    badge_id: int = Field(foreign_key="Badge.id", primary_key=True)

class Category(SQLModel, table=True):
    __tablename__: str = "Category"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)

    subcategories: List["Subcategory"] = Relationship(back_populates="category")
    workers: List["Worker"] = Relationship(back_populates="category")

class Subcategory(SQLModel, table=True):
    __tablename__: str = "Subcategory"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    category_id: int = Field(foreign_key="Category.id")

    category: Category = Relationship(back_populates="subcategories")
    workers: List["Worker"] = Relationship(
        back_populates="subcategories",
        link_model=WorkerSubcategoryLink
    )

class Badge(SQLModel, table=True):
    __tablename__: str = "Badge"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)

    workers: List["Worker"] = Relationship(
        back_populates="badges",
        link_model=WorkerBadgeLink
    )

class Worker(SQLModel, table=True):
    __tablename__: str = "Worker"
    id: str = Field(primary_key=True)  # e.g., "T001"
    name: str
    rating: float
    reviews_count: int
    hourly_rate: float
    available: bool
    experience_years: int
    completed_jobs: int
    zone: str
    phone: str

    category_id: int = Field(foreign_key="Category.id")
    category: Category = Relationship(back_populates="workers")

    subcategories: List[Subcategory] = Relationship(
        back_populates="workers",
        link_model=WorkerSubcategoryLink
    )
    badges: List[Badge] = Relationship(
        back_populates="workers",
        link_model=WorkerBadgeLink
    )
