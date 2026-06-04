# simulator/models/

Bu klasöre Colab Notebook'larından indirdiğiniz `.pkl` dosyalarını koyun.

## Gerekli dosyalar

| Dosya | Kaynak Notebook | Açıklama |
|-------|-----------------|----------|
| `random_forest.pkl` | `02_baseline_models_shap.ipynb` | Eğitilmiş Random Forest modeli |
| `scaler.pkl` | `01_eda_and_cleaning.ipynb` | StandardScaler (eğitim verisiyle fit edilmiş) |

## Google Drive'dan nasıl indirilir?

Drive'da `MyDrive/nasa_asteroid/` klasöründe bulunuyorlar.
İndirmek için Colab'da:

```python
from google.colab import files
files.download('/content/drive/MyDrive/nasa_asteroid/random_forest.pkl')
files.download('/content/drive/MyDrive/nasa_asteroid/scaler.pkl')
```

İndirdikten sonra bu `models/` klasörüne taşıyın.
