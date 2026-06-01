from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
import sqlalchemy as sa

class User(SQLModel, table=True):
    __tablename__: str = "User"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = Field(default=None)
    age: Optional[int] = Field(default=None)
    createdAt: datetime = Field(
        default_factory=datetime,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False
        )
    )

class Time(SQLModel, table=True):
    __tablename__: str = "Time"

    id: Optional[int] = Field(default=None, primary_key=True)
    createdAt: datetime = Field(
        default_factory=datetime,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False
        )
    )
