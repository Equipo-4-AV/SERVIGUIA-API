import os
import json
from dotenv import load_dotenv
from sqlmodel import Session

# Load environment variables
load_dotenv()

from src.data.database import engine, init_db
from src.data.db_models import (
    Category,
    Subcategory,
    Badge,
    Worker,
    WorkerSubcategoryLink,
    WorkerBadgeLink,
)

# Relative directory helper
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
PESOS_PATH = os.path.join(DATA_DIR, "pesos.json")
TRABAJADORES_PATH = os.path.join(DATA_DIR, "trabajadores.json")

def load_json_file(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def seed_database():
    print("Initializing tables...")
    init_db()

    print("Loading raw files...")
    pesos_data = load_json_file(PESOS_PATH)
    workers_data = load_json_file(TRABAJADORES_PATH)

    with Session(engine) as session:
        # Clear existing data in correct dependency order to prevent foreign key errors
        print("Clearing existing tables...")
        session.query(WorkerSubcategoryLink).delete()
        session.query(WorkerBadgeLink).delete()
        session.query(Worker).delete()
        session.query(Subcategory).delete()
        session.query(Category).delete()
        session.query(Badge).delete()
        session.commit()

        # 1. Seed Categories
        print("Seeding Categories...")
        categories_map = {}
        for cat_name in pesos_data.get("_categorias_validas", []):
            category = Category(name=cat_name)
            session.add(category)
            categories_map[cat_name] = category
        session.commit()

        # 2. Seed Subcategories
        print("Seeding Subcategories...")
        subcategories_map = {}
        for cat_name, keywords in pesos_data.get("_mapeo_keywords", {}).items():
            category = categories_map.get(cat_name)
            if not category:
                continue
            for kw in keywords:
                # Avoid duplicates just in case
                if kw not in subcategories_map:
                    sub = Subcategory(name=kw, category_id=category.id)
                    session.add(sub)
                    subcategories_map[kw] = sub
        session.commit()

        # 3. Seed Badges
        print("Seeding Badges...")
        unique_badges = set()
        for worker_raw in workers_data:
            for badge in worker_raw.get("insignias", []):
                unique_badges.add(badge)

        badges_map = {}
        for badge_name in unique_badges:
            badge = Badge(name=badge_name)
            session.add(badge)
            badges_map[badge_name] = badge
        session.commit()

        # 4. Seed Workers and Links
        print("Seeding Workers & relationship links...")
        for worker_raw in workers_data:
            cat_name = worker_raw["categoria"]
            category = categories_map.get(cat_name)
            if not category:
                print(f"Error: Category '{cat_name}' not found for worker {worker_raw['id']}. Skipping.")
                continue

            worker = Worker(
                id=worker_raw["id"],
                name=worker_raw["nombre"],
                rating=worker_raw["calificacion"],
                reviews_count=worker_raw["num_reviews"],
                hourly_rate=worker_raw["precio_hora"],
                available=worker_raw["disponible"],
                experience_years=worker_raw["experiencia_años"],
                completed_jobs=worker_raw["trabajos_completados"],
                zone=worker_raw["zona"],
                phone=worker_raw["telefono"],
                category_id=category.id
            )
            session.add(worker)
            session.flush()  # Ensure worker.id is active for relationship links

            # Link Subcategories
            for sub_name in worker_raw.get("subcategorias", []):
                sub_obj = subcategories_map.get(sub_name)
                if not sub_obj:
                    # Self-healing in case a worker subcategory is missing in pesos.json
                    print(f"Warning: subcategory '{sub_name}' not found in mapping. Creating under category '{cat_name}'.")
                    sub_obj = Subcategory(name=sub_name, category_id=category.id)
                    session.add(sub_obj)
                    session.flush()
                    subcategories_map[sub_name] = sub_obj

                link = WorkerSubcategoryLink(worker_id=worker.id, subcategory_id=sub_obj.id)
                session.add(link)

            # Link Badges
            for badge_name in worker_raw.get("insignias", []):
                badge_obj = badges_map.get(badge_name)
                if badge_obj:
                    link = WorkerBadgeLink(worker_id=worker.id, badge_id=badge_obj.id)
                    session.add(link)

        session.commit()
        print("Database seeded successfully!")

if __name__ == "__main__":
    seed_database()
