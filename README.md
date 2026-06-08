# ☄️ Asteroid Classification — PHA Simülatörü

> **Bitirme Projesi** | NASA NEO veri seti üzerinde makine öğrenmesi ile Potansiyel Tehlikeli Asteroid (PHA) tespiti ve interaktif yörünge simülasyonu.

---

## Proje Özeti

Bu proje, NASA'nın Near Earth Object (NEO) veri seti kullanılarak asteroitlerin **Potansiyel Tehlikeli Asteroid (PHA)** olup olmadığını tahmin eden bir makine öğrenmesi sistemi ve bunu görselleştiren bir web simülatörü içermektedir.

| Bileşen | Detay |
|---------|-------|
| **En iyi model** | Random Forest (Feature Engineering olmadan) |
| **Doğruluk** | F1: 0.5423 · ROC-AUC: 0.9327 · PR-AUC: 0.5836 |
| **Veri seti** | NASA NEO — `neo_v2.csv` (90,836 asteroid) |
| **Özellikler** | `est_diameter_min`, `relative_velocity`, `miss_distance`, `absolute_magnitude` |

---

## Proje Yapısı

```
asteroid-classification/
│
├── Colab Notebooks/
│   ├── 01_eda_and_cleaning.ipynb        # Veri keşfi, temizleme, ölçekleme
│   ├── 02_baseline_models_shap.ipynb    # Model eğitimi (RF, XGBoost, SVM, vb.)
│   ├── 03_spice_visualization.ipynb     # Yörünge görselleştirme
│   ├── 04_neural_network_challenge.ipynb
│   └── 05_feature_engineering_challenge_ipynb.ipynb
│
└── simulator/                           # Web uygulaması (Flask)
    ├── app.py                           # Flask backend
    ├── requirements.txt                 # Python bağımlılıkları
    ├── models/
    │   ├── random_forest.pkl            # Eğitilmiş RF modeli (Drive'dan indirilmeli)
    │   └── scaler.pkl                   # StandardScaler (Drive'dan indirilmeli)
    ├── templates/
    │   └── index.html                   # Ana sayfa
    └── static/
        ├── css/style.css
        └── js/app.js
```

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- **Python 3.8+** (Anaconda önerilir)
- Kütüphaneler: `flask`, `pandas`, `numpy`, `scikit-learn`

### Adım 1 — Bağımlılıkları Yükle

```bash
pip install flask pandas numpy scikit-learn
```

> Anaconda kullanıyorsanız bu kütüphaneler büyük ihtimalle zaten yüklüdür.

---

### Adım 2 — Model Dosyalarını İndir

Model dosyaları boyut nedeniyle GitHub'da bulunmamaktadır. Google Drive'dan indirip doğru klasöre koyun.

**Google Drive linki:** `MyDrive/nasa_asteroid/`

İndirilecek dosyalar:
- `random_forest.pkl`
- `scaler.pkl`

Bu dosyaları şu klasöre koyun:

```
simulator/
└── models/
    ├── random_forest.pkl   ← buraya
    └── scaler.pkl          ← buraya
```

> **Colab'dan indirmek için:**
> ```python
> from google.colab import files
> files.download('/content/drive/MyDrive/nasa_asteroid/random_forest.pkl')
> files.download('/content/drive/MyDrive/nasa_asteroid/scaler.pkl')
> ```

---

### Adım 3 — Sunucuyu Başlat

**Windows CMD** açın (PowerShell değil):

```cmd
cd "C:\Users\...\asteroid-classification\simulator"
python app.py
```

> Anaconda kullanıyorsanız:
> ```cmd
> C:\Users\...\anaconda3\python.exe app.py
> ```

Başarılı çıktı:
```
[OK] Egitilmis model yuklendi  ->  ...random_forest.pkl
[OK] Scaler yuklendi           ->  ...scaler.pkl
 * Running on http://127.0.0.1:5000
```

---

### Adım 4 — Uygulamayı Kullan

1. Tarayıcıda **http://127.0.0.1:5000** adresine gidin
2. **`neo_v2.csv`** dosyasını yükleyin (Kaggle: [NASA - Nearest Earth Objects](https://www.kaggle.com/datasets/sameepvani/nasa-nearest-earth-objects))
3. Sol listeden bir asteroid seçin
4. Sağ panelde yörünge animasyonu ve parametreleri görün

---

## Uygulama Özellikleri

| Özellik | Açıklama |
|---------|----------|
| **İstatistik Kartları** | Toplam asteroid, PHA sayısı, Ort. MOID, En kritik |
| **Asteroid Listesi** | PHA/Güvenli rozeti, güven yüzdesi, MOID değeri |
| **Yörünge Simülasyonu** | Güneş, Dünya, Mars, Asteroid animasyonu (Canvas) |
| **Orbital Parametreler** | a, e, i, MOID, çap, periyot, perihel, afel |
| **Mesafe Grafiği** | Dünya'ya mesafe 2025-2035 (Chart.js) |

---

## Model Karşılaştırması

| Model | Accuracy | F1-Score | ROC-AUC | PR-AUC |
|-------|----------|----------|---------|--------|
| Logistic Regression | 0.786 | 0.459 | 0.879 | 0.326 |
| **Random Forest** ⭐ | **0.875** | **0.542** | **0.933** | **0.584** |
| XGBoost | 0.812 | 0.496 | 0.924 | 0.553 |
| SVM (RBF) | 0.769 | 0.456 | 0.897 | 0.418 |
| KNN (k=11) | 0.908 | 0.379 | 0.902 | 0.513 |

> **Not:** Dengesiz veri seti (PHA oranı ~%9.7) nedeniyle PR-AUC en güvenilir metriktir.

---

## Teknik Detaylar

### Random Forest Konfigürasyonu
```python
RandomForestClassifier(
    n_estimators=200,
    class_weight='balanced_subsample',  # Sınıf dengesizliğini giderir
    max_depth=None,
    min_samples_leaf=5,
    n_jobs=-1,
    random_state=42
)
```

### Veri Ön-işleme
1. Gereksiz sütunlar kaldırıldı: `id`, `name`, `est_diameter_max`, `orbiting_body`, `sentry_object`
2. Eksik değer doldurma: `SimpleImputer(strategy='median')`
3. Ölçekleme: `StandardScaler` (eğitim verisiyle fit edilmiş)
4. Train/Test split: 80/20, stratified, random_state=42

---

## Colab Notebook'larını Çalıştırma

Notebook'lar Google Colab üzerinde çalışacak şekilde hazırlanmıştır. Tüm dosya okuma/yazma işlemleri `MyDrive/nasa_asteroid/` klasörü üzerinden yapılmaktadır.

### Klasör Yapısını Hazırlama

Notebook'ların çalışabilmesi için paylaşılan **`nasa_asteroid`** Drive klasörünü **kendi Google Drive'ınızın köküne (My Drive)** yüklemeniz yeterlidir. Klasör adını değiştirmeyin.

```
My Drive/
└── nasa_asteroid/          ← klasörü buraya yükleyin, adını değiştirmeyin
    ├── neo_v2.csv
    ├── X_train.csv
    ├── X_test.csv
    ├── y_train.csv
    ├── y_test.csv
    ├── scaler.pkl
    ├── random_forest.pkl
    └── ...
```

Colab'da yol şu şekilde tanımlıdır ve **değiştirmenize gerek yoktur:**
```python
DRIVE_PATH = '/content/drive/MyDrive/nasa_asteroid/'
```

### Notebook Çalıştırma Sırası

Notebook'ları sırayla çalıştırın — her biri bir öncekinin çıktısını kullanır:

| Sıra | Notebook | Açıklama |
|------|----------|----------|
| 1 | `01_eda_and_cleaning.ipynb` | Veri keşfi, temizleme → `X_train.csv`, `scaler.pkl` üretir |
| 2 | `02_baseline_models_shap.ipynb` | Model eğitimi → `random_forest.pkl` üretir |
| 3 | `03_spice_visualization.ipynb` | Yörünge görselleştirme |
| 4 | `04_neural_network_challenge.ipynb` | Sinir ağı deneyi |
| 5 | `05_feature_engineering_challenge_ipynb.ipynb` | Özellik mühendisliği deneyi |

> **Not:** `simulator/` web uygulaması için sadece `random_forest.pkl` ve `scaler.pkl` dosyaları gereklidir. Bu dosyalar Notebook 01 ve 02 çalıştırıldıktan sonra Drive'da oluşur.

---

## Veri Seti

- **Kaynak:** Kaggle — [NASA Nearest Earth Objects](https://www.kaggle.com/datasets/sameepvani/nasa-nearest-earth-objects)
- **Dosya:** `neo_v2.csv`
- **Boyut:** 90,836 satır × 10 sütun
- **PHA oranı:** ~%9.7 (dengesiz)

---

*Bitirme Projesi — 2025/2026*
