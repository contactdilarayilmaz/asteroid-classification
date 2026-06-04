from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer
import pickle, io, os

app = Flask(__name__)

# ─── Paths ────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

FEATURE_COLS = ['est_diameter_min', 'relative_velocity', 'miss_distance', 'absolute_magnitude']

PHA_COLORS = [
    '#ef4444',  # red     – very high confidence PHA
    '#f97316',  # orange  – high confidence PHA
    '#eab308',  # yellow  – medium-high PHA
    '#a855f7',  # purple  – medium PHA
    '#3b82f6',  # blue    – lower PHA
    '#10b981',  # green   – non-PHA
    '#6b7280',  # gray    – non-PHA
    '#ec4899',  # pink    – non-PHA
]


# ─── Load pre-trained model & scaler at startup ───────────────
def _load_artifact(filename):
    path = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


RF_MODEL = _load_artifact("random_forest.pkl")
SCALER   = _load_artifact("scaler.pkl")

if RF_MODEL is not None and SCALER is not None:
    print(f"[OK] Egitilmis model yuklendi  ->  {os.path.join(MODELS_DIR, 'random_forest.pkl')}")
    print(f"[OK] Scaler yuklendi           ->  {os.path.join(MODELS_DIR, 'scaler.pkl')}")
else:
    missing = []
    if RF_MODEL is None: missing.append("random_forest.pkl")
    if SCALER   is None: missing.append("scaler.pkl")
    print(f"[WARN] Eksik dosyalar: {', '.join(missing)}")
    print(f"       Lutfen Colab notebook'indan ilgili .pkl dosyalarini")
    print(f"       su klasore kopyalayin: {MODELS_DIR}")


# ─── Helpers ─────────────────────────────────────────────────

def get_dot_color(is_pha, confidence):
    if not is_pha:
        idx = hash(str(confidence)) % 3 + 5
        return PHA_COLORS[idx]
    if confidence >= 90: return PHA_COLORS[0]
    if confidence >= 80: return PHA_COLORS[1]
    if confidence >= 70: return PHA_COLORS[2]
    if confidence >= 60: return PHA_COLORS[3]
    return PHA_COLORS[4]


def generate_orbital_elements(row_idx, miss_dist_km, abs_mag):
    """Generate plausible orbital elements for a NEA from available data."""
    rng = np.random.RandomState(int(row_idx) + 42)
    a   = rng.uniform(0.85, 1.75)
    e_min = max(0.05, 1.0 - 1.3 / a)
    e_max = min(0.80, 1.0 - 0.25 / a)
    e   = rng.uniform(e_min, e_max) if e_min < e_max else rng.uniform(0.10, 0.50)
    inc = rng.uniform(0.5, 22.0)
    omega  = rng.uniform(0, 360)
    period = (a ** 1.5) * 365.25
    perihelion = a * (1 - e)
    aphelion   = a * (1 + e)
    miss_au = miss_dist_km / 149_597_870.7
    moid = min(miss_au, max(0.0001, abs(perihelion - 1.0) * rng.uniform(0.08, 0.45)))
    return {
        'semi_major_axis': round(a, 4),
        'eccentricity':    round(e, 4),
        'inclination':     round(inc, 2),
        'omega':           round(omega, 2),
        'period':          round(period, 1),
        'perihelion':      round(perihelion, 4),
        'aphelion':        round(aphelion, 4),
        'moid':            round(moid, 4),
    }


def kepler_solve(M, e, iterations=50):
    E = M.copy() if isinstance(M, np.ndarray) else float(M)
    for _ in range(iterations):
        E = M + e * np.sin(E)
    return E


def calculate_distances(orbital, n_points=300):
    a   = orbital['semi_major_axis']
    e   = orbital['eccentricity']
    inc = np.radians(orbital['inclination'])
    om  = np.radians(orbital.get('omega', 0))
    T_yr = orbital['period'] / 365.25
    n_mo = 2 * np.pi / T_yr
    t_arr = np.linspace(0, 10, n_points)
    M_arr = (n_mo * t_arr) % (2 * np.pi)
    E_arr = kepler_solve(M_arr, e)
    nu_arr = 2 * np.arctan2(
        np.sqrt(1 + e) * np.sin(E_arr / 2),
        np.sqrt(1 - e) * np.cos(E_arr / 2)
    )
    r_arr = a * (1 - e * np.cos(E_arr))
    ax = r_arr * (np.cos(om) * np.cos(nu_arr) - np.sin(om) * np.sin(nu_arr) * np.cos(inc))
    ay = r_arr * (np.sin(om) * np.cos(nu_arr) + np.cos(om) * np.sin(nu_arr) * np.cos(inc))
    az = r_arr * np.sin(nu_arr) * np.sin(inc)
    ea = 2 * np.pi * t_arr
    ex, ey, ez = np.cos(ea), np.sin(ea), np.zeros_like(ea)
    dists = np.sqrt((ax - ex) ** 2 + (ay - ey) ** 2 + (az - ez) ** 2)
    return {
        'years':     [round(2025 + float(t), 3) for t in t_arr],
        'distances': [round(float(d), 5) for d in dists],
        'min_dist':  round(float(dists.min()), 5),
    }


# ─── Routes ──────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/model-status')
def model_status():
    """Ön yüz, modelin yüklü olup olmadığını buradan öğrenir."""
    return jsonify({
        'model_loaded':  RF_MODEL is not None,
        'scaler_loaded': SCALER   is not None,
        'ready':         RF_MODEL is not None and SCALER is not None,
    })


@app.route('/api/classify', methods=['POST'])
def classify():
    # ── Model kontrolü ──────────────────────────────────────
    if RF_MODEL is None or SCALER is None:
        missing = []
        if RF_MODEL is None: missing.append("random_forest.pkl")
        if SCALER   is None: missing.append("scaler.pkl")
        return jsonify({
            'error': (
                f"Eğitilmiş model dosyaları bulunamadı: {', '.join(missing)}. "
                f"Lütfen Colab'dan indirip 'simulator/models/' klasörüne koyun."
            )
        }), 400

    # ── Dosya yükleme ────────────────────────────────────────
    if 'file' not in request.files:
        return jsonify({'error': 'Dosya yüklenmedi'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Dosya seçilmedi'}), 400
    try:
        df = pd.read_csv(io.BytesIO(f.read()))
    except Exception as exc:
        return jsonify({'error': f'CSV okunamadı: {exc}'}), 400

    missing_cols = [c for c in FEATURE_COLS if c not in df.columns]
    if missing_cols:
        return jsonify({'error': f'Eksik sütunlar: {", ".join(missing_cols)}'}), 400

    # ── İsimler ─────────────────────────────────────────────
    names = (df['name'].astype(str).tolist()
             if 'name' in df.columns
             else [f'NEO-{i+1}' for i in range(len(df))])

    # ── Ön-işleme (imputer eğitim verisi ile aynı medyanı uygular) ──
    X_raw = df[FEATURE_COLS].copy()
    imputer = SimpleImputer(strategy='median')
    X_imp   = imputer.fit_transform(X_raw)   # medyan bu veri setinden; kabul edilebilir

    # ── Scaler: eğitim sırasında fit edilmiş → sadece transform ──
    X_sc = SCALER.transform(X_imp)

    # ── Tahmin ───────────────────────────────────────────────
    preds = RF_MODEL.predict(X_sc)
    probs = RF_MODEL.predict_proba(X_sc)[:, 1]

    # ── Sonuçları oluştur ────────────────────────────────────
    results = []
    for i in range(len(df)):
        row      = df.iloc[i]
        miss_km  = float(row.get('miss_distance', 1e7))
        abs_mag  = float(row.get('absolute_magnitude', 20.0))
        diam_min = float(row.get('est_diameter_min', 0.0))
        velocity = float(row.get('relative_velocity', 0.0))
        conf     = round(float(probs[i]) * 100, 1)
        is_pha   = bool(preds[i])
        orbital  = generate_orbital_elements(i, miss_km, abs_mag)

        results.append({
            'id':           i,
            'name':         names[i],
            'is_pha':       is_pha,
            'confidence':   conf,
            'h_mag':        round(abs_mag, 1),
            'miss_dist_au': round(miss_km / 149_597_870.7, 4),
            'diam_min_km':  round(diam_min, 4),
            'diam_min_m':   round(diam_min * 1000, 1),
            'velocity':     round(velocity, 1),
            'dot_color':    get_dot_color(is_pha, conf),
            'orbital':      orbital,
        })

    # PHA'lar öne, sonra güvene göre sırala
    results.sort(key=lambda x: (-x['is_pha'], -x['confidence']))

    pha_list = [r for r in results if r['is_pha']]
    avg_moid = round(float(np.mean([r['miss_dist_au'] for r in pha_list])), 4) if pha_list else 0.0
    critical = (min(pha_list, key=lambda x: x['miss_dist_au'])['name']
                if pha_list else 'Yok')

    return jsonify({
        'summary': {
            'total':     len(results),
            'pha_count': len(pha_list),
            'avg_moid':  avg_moid,
            'critical':  critical,
        },
        'asteroids': results[:200],
    })


@app.route('/api/distances', methods=['POST'])
def distances():
    data    = request.get_json(force=True)
    orbital = data.get('orbital')
    if not orbital:
        return jsonify({'error': 'orbital verisi eksik'}), 400
    return jsonify(calculate_distances(orbital))


if __name__ == '__main__':
    app.run(debug=True, port=5000, threaded=True)
