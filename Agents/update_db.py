import psycopg2
conn = psycopg2.connect('postgresql://postgres:Yashrajeuddu@db.fgsuxckvntubncqflqiz.supabase.co:5432/postgres')
conn.autocommit = True
cur = conn.cursor()
cur.execute('ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_comments TEXT;')
cur.execute("NOTIFY pgrst, 'reload schema';")
cur.close()
conn.close()
print('Done')
