import psycopg2
import os

DATABASE_URL = "postgresql://postgres:Yashrajeuddu@db.fgsuxckvntubncqflqiz.supabase.co:5432/postgres"

sql = """
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    contact_number TEXT
);

CREATE TABLE IF NOT EXISTS doctor_details (
    doctor_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    specialty TEXT NOT NULL,
    room_number TEXT,
    is_available BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id),
    doctor_id UUID REFERENCES profiles(id),
    scheduled_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    record_type TEXT,
    content JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medicine_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_name TEXT NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    reorder_threshold INT NOT NULL DEFAULT 10,
    unit_price NUMERIC
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id),
    doctor_id UUID REFERENCES profiles(id),
    date TIMESTAMPTZ DEFAULT now(),
    status TEXT NOT NULL,
    notes TEXT,
    doctor_comments TEXT
);

CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicine_inventory(id),
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    quantity INT
);

CREATE TABLE IF NOT EXISTS band_room_mappings (
    room_id TEXT PRIMARY KEY,
    room_name TEXT NOT NULL,
    url TEXT
);
"""

print("Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

print("Creating tables...")
cur.execute(sql)

print("Tables created successfully!")
cur.close()
conn.close()
