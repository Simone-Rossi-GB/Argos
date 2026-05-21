# 🤖 Guida Modelli AI per Argos Mobile

Questa guida spiega come scaricare, convertire e allenare i modelli TensorFlow Lite per l'app mobile Argos.

---

## 📂 Struttura File

I modelli vanno posizionati in:

```
mobile/Argos/assets/models/
├── movenet_thunder_fp16.tflite          (Fall Detection)
├── yolov8n_float16.tflite               (Intrusion/Crowd/Vehicle)
└── fire_smoke_mobilenetv2.tflite        (Fire Detection - CUSTOM)
```

**Importante**: La cartella `assets/models/` deve essere creata manualmente!

```bash
mkdir -p mobile/Argos/assets/models
```

---

## 1️⃣ Fall Detection - MoveNet Thunder

### Download Diretto

**Opzione A: Kaggle Models**

1. Vai su: https://www.kaggle.com/models/google/movenet/tfLite/singlepose-thunder-fp16
2. Clicca "Download" → scarica `movenet_thunder_fp16.tflite` (~12 MB)
3. Sposta in `mobile/Argos/assets/models/movenet_thunder_fp16.tflite`

**Opzione B: TensorFlow Hub**

```bash
# Download via wget
wget https://tfhub.dev/google/lite-model/movenet/singlepose/thunder/tflite/float16/4?lite-format=tflite \
  -O mobile/Argos/assets/models/movenet_thunder_fp16.tflite
```

**Opzione C: Lightning (più veloce ma meno accurato)**

Se MoveNet Thunder è troppo pesante, usa Lightning:

```bash
wget https://tfhub.dev/google/lite-model/movenet/singlepose/lightning/tflite/float16/4?lite-format=tflite \
  -O mobile/Argos/assets/models/movenet_lightning_fp16.tflite
```

Poi modifica `fallDetector.ts`:
```typescript
const MODEL_PATH = 'models/movenet_lightning_fp16.tflite';
const TARGET_SIZE = 192; // Lightning usa 192x192 invece di 256x256
```

### Verifica

```bash
ls -lh mobile/Argos/assets/models/movenet_thunder_fp16.tflite
# Output: -rw-r--r-- 1 user staff 12M movenet_thunder_fp16.tflite
```

---

## 2️⃣ Object Detection - YOLOv8n

### Download Diretto (Ultralytics)

**Opzione A: GitHub Releases**

1. Vai su: https://github.com/ultralytics/ultralytics/releases
2. Cerca "YOLOv8n TFLite"
3. Scarica `yolov8n_float16.tflite` o `yolov8n_saved_model.zip`

**Opzione B: Export da PyTorch** (RACCOMANDATO)

```bash
# Installa ultralytics
pip install ultralytics

# Export YOLOv8n in TFLite
yolo export model=yolov8n.pt format=tflite imgsz=320 int8=False

# Il file sarà generato in: yolov8n_saved_model/yolov8n_float16.tflite
cp yolov8n_saved_model/yolov8n_float16.tflite mobile/Argos/assets/models/
```

### Parametri Export

```python
# Export customizzato con Python
from ultralytics import YOLO

model = YOLO('yolov8n.pt')
model.export(
    format='tflite',
    imgsz=320,        # 320x320 (usa meno RAM)
    int8=False,       # Float16 per accuracy
    nms=True,         # Include NMS nel modello
)
```

### Alternative YOLOv8

- **YOLOv8s** (più accurato): `yolo export model=yolov8s.pt format=tflite imgsz=320`
- **YOLOv8m** (ancora più accurato): Solo se hai device potenti

### Verifica

```bash
ls -lh mobile/Argos/assets/models/yolov8n_float16.tflite
# Output: -rw-r--r-- 1 user staff 6.2M yolov8n_float16.tflite
```

---

## 3️⃣ Fire Detection - MobileNetV2 (CUSTOM)

**Questo modello DEVE essere allenato da te!** Non esiste pre-addestrato.

### Step 1: Scarica Dataset

**Dataset consigliati**:

1. **Fire Detection Dataset (Kaggle)**
   - URL: https://www.kaggle.com/datasets/phylake1337/fire-dataset
   - 755 immagini di fuoco
   - 244 immagini di fumo
   - 500 immagini normali

2. **Fire and Smoke Dataset (Roboflow)**
   - URL: https://universe.roboflow.com/smoke-detection
   - ~2000 immagini annotate
   - Export in formato "Folder"

3. **COCO Smoke Detection**
   - Cerca "smoke detection dataset" su Roboflow Universe

### Step 2: Organizza Dataset

```
fire-smoke-dataset/
├── train/
│   ├── fire/       (500+ immagini)
│   ├── smoke/      (500+ immagini)
│   └── normal/     (500+ immagini)
└── val/
    ├── fire/       (100+ immagini)
    ├── smoke/      (100+ immagini)
    └── normal/     (100+ immagini)
```

### Step 3: Script Training (Python)

Salva come `train_fire_detector.py`:

```python
#!/usr/bin/env python3
"""
Fire/Smoke Detector Training con MobileNetV2
Genera: fire_smoke_mobilenetv2.tflite
"""

import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
import os

# ====================
# 1. CONFIG
# ====================
DATASET_PATH = 'fire-smoke-dataset'  # Cambia con il tuo path
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 20
NUM_CLASSES = 3  # fire, smoke, normal

# ====================
# 2. DATA AUGMENTATION
# ====================
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    horizontal_flip=True,
    zoom_range=0.2,
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(rescale=1./255)

# ====================
# 3. LOAD DATASET
# ====================
train_generator = train_datagen.flow_from_directory(
    os.path.join(DATASET_PATH, 'train'),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=['fire', 'smoke', 'normal']
)

val_generator = val_datagen.flow_from_directory(
    os.path.join(DATASET_PATH, 'val'),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=['fire', 'smoke', 'normal']
)

print(f"📊 Training samples: {train_generator.samples}")
print(f"📊 Validation samples: {val_generator.samples}")
print(f"📊 Classes: {train_generator.class_indices}")

# ====================
# 4. BUILD MODEL
# ====================
# Base model: MobileNetV2 pre-trained su ImageNet
base_model = MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights='imagenet'
)

# Freeze base layers (fine-tuning)
base_model.trainable = False

# Custom head
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation='relu')(x)
x = Dropout(0.5)(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.3)(x)
predictions = Dense(NUM_CLASSES, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=predictions)

# ====================
# 5. COMPILE
# ====================
model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# ====================
# 6. CALLBACKS
# ====================
callbacks = [
    EarlyStopping(
        monitor='val_loss',
        patience=5,
        restore_best_weights=True
    ),
    ModelCheckpoint(
        'best_fire_model.h5',
        monitor='val_accuracy',
        save_best_only=True,
        mode='max'
    )
]

# ====================
# 7. TRAIN
# ====================
print("🚀 Starting training...")

history = model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=val_generator,
    callbacks=callbacks
)

print("✅ Training completed!")

# ====================
# 8. FINE-TUNING (opzionale)
# ====================
# Unfreeze top layers per fine-tuning
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=0.0001),  # Learning rate più basso
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print("🔥 Fine-tuning...")
history_ft = model.fit(
    train_generator,
    epochs=10,
    validation_data=val_generator,
    callbacks=callbacks
)

# ====================
# 9. EVALUATE
# ====================
val_loss, val_acc = model.evaluate(val_generator)
print(f"\n📊 Final Validation Accuracy: {val_acc:.2%}")
print(f"📊 Final Validation Loss: {val_loss:.4f}")

# ====================
# 10. CONVERT TO TFLITE
# ====================
print("\n🔄 Converting to TFLite...")

converter = tf.lite.TFLiteConverter.from_keras_model(model)

# Ottimizzazioni
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.float16]

# Convert
tflite_model = converter.convert()

# Save
output_file = 'fire_smoke_mobilenetv2.tflite'
with open(output_file, 'wb') as f:
    f.write(tflite_model)

print(f"✅ Model saved: {output_file}")
print(f"📦 Size: {len(tflite_model) / 1024 / 1024:.2f} MB")

# ====================
# 11. TEST INFERENCE
# ====================
print("\n🧪 Testing inference...")

import numpy as np

interpreter = tf.lite.Interpreter(model_path=output_file)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

print(f"Input shape: {input_details[0]['shape']}")
print(f"Output shape: {output_details[0]['shape']}")

# Test con immagine random
test_input = np.random.rand(1, 224, 224, 3).astype(np.float32)
interpreter.set_tensor(input_details[0]['index'], test_input)
interpreter.invoke()
output = interpreter.get_tensor(output_details[0]['index'])

print(f"Output: {output}")
print(f"Predicted class: {np.argmax(output)}")
print(f"Classes: fire={output[0][0]:.2f}, smoke={output[0][1]:.2f}, normal={output[0][2]:.2f}")

print("\n✅ All done! Copy the .tflite file to mobile/Argos/assets/models/")
```

### Step 4: Train

```bash
# Installa dipendenze
pip install tensorflow pillow numpy

# Train
python train_fire_detector.py

# Output: fire_smoke_mobilenetv2.tflite (~8 MB)
```

### Step 5: Deploy

```bash
# Copia il modello nell'app
cp fire_smoke_mobilenetv2.tflite mobile/Argos/assets/models/
```

### Tips Training

1. **Più dati = migliore accuracy**: Cerca di avere almeno 500 immagini per classe
2. **Bilanciamento**: Le 3 classi devono avere circa lo stesso numero di immagini
3. **Data Augmentation**: Ruota, flipa, zooma le immagini per aumentare varietà
4. **Fine-tuning**: Dopo il training iniziale, fai fine-tuning per 5-10 epoch
5. **Validation**: Testa sempre su immagini MAI viste durante il training

---

## 📱 iOS Setup

### Info.plist

Aggiungi queste chiavi:

```xml
<key>UIFileSharingEnabled</key>
<true/>
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
<key>NSCameraUsageDescription</key>
<string>Argos needs camera access for AI surveillance</string>
```

### Xcode

1. Apri `mobile/Argos/ios/Argos.xcworkspace`
2. Target → Build Phases → Copy Bundle Resources
3. Clicca "+" → Add Files
4. Seleziona `assets/models/*.tflite`

---

## 🤖 Android Setup

### AndroidManifest.xml

Aggiungi permessi:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### build.gradle

Assicurati che i modelli siano inclusi:

```gradle
android {
    ...
    sourceSets {
        main {
            assets.srcDirs = ['src/main/assets', '../../assets']
        }
    }
}
```

---

## ✅ Checklist Finale

Verifica che tutti i modelli siano presenti:

```bash
cd mobile/Argos

# Check modelli
ls -lh assets/models/
# Output atteso:
# movenet_thunder_fp16.tflite         (~12 MB)
# yolov8n_float16.tflite              (~6 MB)
# fire_smoke_mobilenetv2.tflite       (~8 MB)

# Check totale
du -sh assets/models/
# Output: ~26 MB
```

---

## 🧪 Test Modelli

### Test manuale (Python)

```python
import tensorflow as tf
import numpy as np

def test_model(model_path):
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    print(f"Model: {model_path}")
    print(f"Input: {input_details[0]['shape']}")
    print(f"Output: {output_details[0]['shape']}")
    print()

test_model('assets/models/movenet_thunder_fp16.tflite')
test_model('assets/models/yolov8n_float16.tflite')
test_model('assets/models/fire_smoke_mobilenetv2.tflite')
```

### Test nell'app

Avvia l'app e controlla i log:

```bash
# iOS
npx react-native log-ios | grep -E "Loading|initialized"

# Android
npx react-native log-android | grep -E "Loading|initialized"
```

Output atteso:
```
🤖 Loading MoveNet model...
✅ Fall Detector initialized
   Input: 1x256x256x3
   Output: 1x1x17x3
```

---

## 🆘 Troubleshooting

### Errore: "Model file not found"

```bash
# Verifica path
ls mobile/Argos/assets/models/*.tflite

# Se vuoto, i file non sono stati copiati
# Ricostruisci:
cd mobile/Argos/ios && pod install
cd mobile/Argos/android && ./gradlew clean
```

### Errore: "Failed to load model"

- Verifica che il file `.tflite` non sia corrotto
- Riconverti il modello da PyTorch/Keras
- Controlla che la versione TFLite sia compatibile

### Performance basse

- Usa modelli più piccoli (Lightning invece di Thunder, YOLOv8n invece di YOLOv8s)
- Riduci risoluzione input (192x192 invece di 256x256)
- Abilita GPU delegate (già fatto di default)

---

## 📚 Risorse

- **TensorFlow Lite**: https://www.tensorflow.org/lite
- **MoveNet**: https://www.tensorflow.org/hub/tutorials/movenet
- **YOLOv8**: https://docs.ultralytics.com/modes/export/
- **Fire Dataset**: https://www.kaggle.com/datasets/phylake1337/fire-dataset
- **Model Maker**: https://www.tensorflow.org/lite/models/modify/model_maker

---

🎉 **Setup Completo!** Ora puoi testare l'app con AI detection funzionante.
