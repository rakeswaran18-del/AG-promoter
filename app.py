import os
import sqlite3
from functools import wraps
from pathlib import Path
from flask import Flask, jsonify, request, render_template, session, g
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DB_PATH", BASE_DIR / "data" / "ag_promoters.db"))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
app.config["JSON_SORT_KEYS"] = False

SEED_PROPERTIES = [
    (1,"AG Green Valley Plot","Plot","Sale",1800000,"Madurai","1200 sq.ft",0,0,"Yes","Available",1,
     "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
     "Premium residential plot in a developing location with excellent road connectivity.",
     "Clear Title,Road Access,Water,Electricity"),
    (2,"AG Royal Villa","Villa","Sale",9500000,"Coimbatore","2400 sq.ft",4,4,"2 Cars","Available",1,
     "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=80",
     "Elegant modern villa designed for comfortable family living.",
     "Garden,Modular Kitchen,Parking,Security"),
    (3,"Premium City Apartment","Apartment","Sale",6200000,"Chennai","1450 sq.ft",3,3,"1 Car","Reserved",1,
     "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
     "Spacious apartment close to major business and lifestyle destinations.",
     "Lift,Gym,Security,Power Backup"),
    (4,"Green Farm Land","Farm Land","Sale",3200000,"Nagapattinam","1.5 Acres",0,0,"Yes","Available",0,
     "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=80",
     "Productive farm land suitable for agricultural and long-term investment.",
     "Borewell,Road Access,Fencing,EB Connection"),
    (5,"Independent Family House","House","Sale",5800000,"Trichy","1800 sq.ft",3,3,"1 Car","Available",0,
     "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80",
     "Well-planned independent house in a peaceful residential neighborhood.",
     "Parking,Balcony,Water,Compound Wall"),
    (6,"AG Business Plaza","Commercial","Rent",75000,"Chennai","2200 sq.ft",0,2,"4 Cars","Available",0,
     "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
     "Modern commercial office space suitable for corporate and retail use.",
     "Lift,Parking,Reception,Power Backup"),
]

def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc):
    con = g.pop("db", None)
    if con:
        con.close()

def init_db():
    con = sqlite3.connect(DB_PATH)
    con.executescript("""
    CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL, type TEXT NOT NULL, purpose TEXT NOT NULL,
        price REAL NOT NULL, location TEXT NOT NULL, area TEXT DEFAULT '',
        beds INTEGER DEFAULT 0, baths INTEGER DEFAULT 0, parking TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Available', featured INTEGER NOT NULL DEFAULT 0,
        image TEXT DEFAULT '', description TEXT DEFAULT '', amenities TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS enquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '',
        property TEXT DEFAULT '', message TEXT DEFAULT '', status TEXT DEFAULT 'Pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL, subtitle TEXT DEFAULT '', image TEXT DEFAULT '',
        status TEXT DEFAULT 'Ongoing', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY, value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL
    );
    """)
    if con.execute("SELECT COUNT(*) FROM properties").fetchone()[0] == 0:
        con.executemany("""INSERT INTO properties
        (id,title,type,purpose,price,location,area,beds,baths,parking,status,featured,image,description,amenities)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", SEED_PROPERTIES)
    if con.execute("SELECT COUNT(*) FROM projects").fetchone()[0] == 0:
        con.executemany("INSERT INTO projects(title,subtitle,image,status) VALUES (?,?,?,?)", [
            ("AG Green Valley","Premium plotted development","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80","Ongoing"),
            ("AG Royal Villas","Luxury villa community","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80","Upcoming"),
            ("AG Business Hub","Modern commercial spaces","https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80","Completed"),
        ])
    defaults={"company":"AG Promoters","phone":"+91 98765 43210","email":"hello@agpromoters.com","address":"Tamil Nadu, India"}
    for k,v in defaults.items():
        con.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)",(k,v))
    username=os.getenv("ADMIN_USERNAME","admin")
    password=os.getenv("ADMIN_PASSWORD","admin123")
    if con.execute("SELECT COUNT(*) FROM admins").fetchone()[0] == 0:
        con.execute("INSERT INTO admins(username,password_hash) VALUES(?,?)",(username,generate_password_hash(password)))
    con.commit(); con.close()

def row_property(r):
    d=dict(r); d["featured"]=bool(d["featured"]); d["amenities"]=[x.strip() for x in (d["amenities"] or "").split(",") if x.strip()]
    return d

def admin_required(fn):
    @wraps(fn)
    def wrapper(*a,**kw):
        if not session.get("admin_id"):
            return jsonify({"error":"Authentication required"}),401
        return fn(*a,**kw)
    return wrapper

@app.get("/")
def home(): return render_template("index.html")

@app.get("/api/health")
def health(): return jsonify({"ok":True,"service":"AG Promoters API"})

@app.get("/api/me")
def me(): return jsonify({"authenticated":bool(session.get("admin_id")),"username":session.get("username")})

@app.post("/api/login")
def login():
    data=request.get_json(silent=True) or {}
    username=(data.get("username") or "").strip()
    password=data.get("password") or ""
    r=db().execute("SELECT * FROM admins WHERE username=?",(username,)).fetchone()
    if not r or not check_password_hash(r["password_hash"],password):
        return jsonify({"error":"Invalid username or password"}),401
    session.clear(); session["admin_id"]=r["id"]; session["username"]=r["username"]
    return jsonify({"ok":True,"username":r["username"]})

@app.post("/api/logout")
def logout():
    session.clear(); return jsonify({"ok":True})

@app.get("/api/properties")
def get_properties():
    rows=db().execute("SELECT * FROM properties ORDER BY id DESC").fetchall()
    return jsonify([row_property(r) for r in rows])

@app.post("/api/properties")
@admin_required
def create_property():
    d=request.get_json() or {}
    required=["title","type","purpose","price","location","status"]
    if any(not d.get(k) and d.get(k)!=0 for k in required): return jsonify({"error":"Missing required property fields"}),400
    cur=db().execute("""INSERT INTO properties(title,type,purpose,price,location,area,beds,baths,parking,status,featured,image,description,amenities)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(d["title"],d["type"],d["purpose"],float(d["price"]),d["location"],d.get("area",""),int(d.get("beds",0)),int(d.get("baths",0)),d.get("parking",""),d["status"],int(bool(d.get("featured"))),d.get("image",""),d.get("description",""),",".join(d.get("amenities",[]))))
    db().commit()
    return jsonify(row_property(db().execute("SELECT * FROM properties WHERE id=?",(cur.lastrowid,)).fetchone())),201

@app.put("/api/properties/<int:pid>")
@admin_required
def update_property(pid):
    d=request.get_json() or {}
    if not db().execute("SELECT id FROM properties WHERE id=?",(pid,)).fetchone(): return jsonify({"error":"Property not found"}),404
    db().execute("""UPDATE properties SET title=?,type=?,purpose=?,price=?,location=?,area=?,beds=?,baths=?,parking=?,status=?,featured=?,image=?,description=?,amenities=?,updated_at=CURRENT_TIMESTAMP WHERE id=?""",
        (d["title"],d["type"],d["purpose"],float(d["price"]),d["location"],d.get("area",""),int(d.get("beds",0)),int(d.get("baths",0)),d.get("parking",""),d["status"],int(bool(d.get("featured"))),d.get("image",""),d.get("description",""),",".join(d.get("amenities",[])),pid))
    db().commit(); return jsonify(row_property(db().execute("SELECT * FROM properties WHERE id=?",(pid,)).fetchone()))

@app.delete("/api/properties/<int:pid>")
@admin_required
def delete_property(pid):
    db().execute("DELETE FROM properties WHERE id=?",(pid,)); db().commit(); return jsonify({"ok":True})

@app.get("/api/enquiries")
@admin_required
def get_enquiries():
    return jsonify([dict(r) for r in db().execute("SELECT * FROM enquiries ORDER BY id DESC").fetchall()])

@app.post("/api/enquiries")
def create_enquiry():
    d=request.get_json() or {}
    if not d.get("name") or not d.get("phone"): return jsonify({"error":"Name and phone are required"}),400
    cur=db().execute("INSERT INTO enquiries(name,phone,email,property,message) VALUES(?,?,?,?,?)",(d["name"],d["phone"],d.get("email",""),d.get("property",""),d.get("message","")))
    db().commit(); return jsonify({"ok":True,"id":cur.lastrowid}),201

@app.patch("/api/enquiries/<int:eid>")
@admin_required
def update_enquiry(eid):
    d=request.get_json() or {}; status=d.get("status","Pending")
    if status not in {"Pending","Contacted","Closed"}: return jsonify({"error":"Invalid status"}),400
    db().execute("UPDATE enquiries SET status=? WHERE id=?",(status,eid)); db().commit(); return jsonify({"ok":True})

@app.get("/api/projects")
def get_projects():
    return jsonify([dict(r) for r in db().execute("SELECT * FROM projects ORDER BY id DESC").fetchall()])

@app.get("/api/settings")
def get_settings():
    return jsonify({r["key"]:r["value"] for r in db().execute("SELECT key,value FROM settings")})

@app.put("/api/settings")
@admin_required
def update_settings():
    d=request.get_json() or {}
    for k in ("company","phone","email","address"):
        if k in d: db().execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(k,str(d[k])))
    db().commit(); return get_settings()

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT","5000")), debug=False)
else:
    init_db()
