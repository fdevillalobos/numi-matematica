# /// script
# requires-python = ">=3.10,<3.12"
# dependencies = ["chatterbox-tts", "soundfile"]
# ///
"""Graba los clips de la voz de Numi en audio/voz/ (ver tools/voz/README.md).

  uv run tools/voz/generar.py --referencia mi_voz.wav     # voz clonada con Chatterbox
  uv run tools/voz/generar.py --motor say --voz Paulina   # prueba rápida con una voz de macOS

Se puede cortar y volver a correr: sigue desde donde quedó.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
FRASES = ROOT / 'tools' / 'voz' / 'frases.json'
OUT = ROOT / 'audio' / 'voz'
EXT = 'm4a'


def trim(wav, sr, db=-40, pad=0.02):
    """Saca el silencio de las puntas para que los clips se peguen bien."""
    win = int(sr * 0.01)
    n = len(wav) // win
    if n == 0:
        return wav
    energy = np.sqrt((wav[:n * win].reshape(n, win) ** 2).mean(1))
    loud = np.where(energy > energy.max() * 10 ** (db / 20))[0]
    if not len(loud):
        return wav
    a = max(0, loud[0] * win - int(pad * sr))
    b = min(len(wav), (loud[-1] + 1) * win + int(pad * sr))
    w = wav[a:b].copy()
    f = min(int(0.006 * sr), len(w) // 2)
    ramp = np.linspace(0, 1, f)
    w[:f] *= ramp
    w[len(w) - f:] *= ramp[::-1]
    return w


def normalize(wav, rms_db=-19, peak_db=-1):
    """Mismo volumen en todos los clips."""
    rms = np.sqrt((wav ** 2).mean()) or 1e-9
    gain = min(10 ** (rms_db / 20) / rms, 10 ** (peak_db / 20) / (np.abs(wav).max() or 1e-9))
    return wav * gain


class Chatterbox:
    def __init__(self, ref, exaggeration, cfg):
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        dev = 'mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f'Cargando Chatterbox en {dev}…')
        self.model = ChatterboxMultilingualTTS.from_pretrained(device=dev)
        self.model.prepare_conditionals(str(ref), exaggeration=exaggeration)
        self.ex, self.cfg = exaggeration, cfg
        self.origin = f'chatterbox:{hashlib.sha1(Path(ref).read_bytes()).hexdigest()[:10]}:{exaggeration}:{cfg}'

    def __call__(self, text):
        # Con textos muy cortos a veces "inventa" sonido de más: probamos hasta 4 veces
        # y nos quedamos con la toma más corta que tenga una duración razonable.
        limit = 0.9 + 0.11 * len(text)
        best = None
        for _ in range(4):
            wav = self.model.generate(text, language_id='es', exaggeration=self.ex, cfg_weight=self.cfg)
            w = trim(wav.squeeze(0).numpy().astype(np.float32), self.model.sr)
            if best is None or len(w) < len(best):
                best = w
            if 0.15 < len(w) / self.model.sr < limit:
                break
        return best, self.model.sr


class Say:
    def __init__(self, voice, rate):
        self.voice, self.rate = voice, rate
        self.origin = f'say:{voice}:{rate}'

    def __call__(self, text):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / 'a.wav'
            subprocess.run(['say', '-v', self.voice, '-r', str(self.rate), '-o', str(f),
                            '--file-format=WAVE', '--data-format=LEI16@24000', text], check=True)
            w, sr = sf.read(f, dtype='float32')
        return trim(w, sr), sr


def encode(wav, sr, dest):
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d) / 'a.wav'
        sf.write(tmp, normalize(wav), sr, subtype='PCM_16')
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '32000', str(tmp), str(dest)], check=True)


def write_manifest(name, origin, version, clips):
    keys = [c['key'] for c in clips if (OUT / f"{c['key']}.{EXT}").exists()]
    manifest = {'name': name, 'origin': origin, 'version': version, 'ext': EXT, 'keys': keys}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False) + '\n')
    return len(keys)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--motor', choices=['chatterbox', 'say'], default='chatterbox')
    ap.add_argument('--referencia', help='WAV de 10 a 30 s con la voz a clonar (Chatterbox)')
    ap.add_argument('--exageracion', type=float, default=0.5, help='expresividad de Chatterbox (0.25 a 1)')
    ap.add_argument('--cfg', type=float, default=0.5, help='qué tanto sigue el ritmo de la referencia (Chatterbox)')
    ap.add_argument('--voz', default='Paulina', help='voz de macOS (motor say)')
    ap.add_argument('--velocidad', type=int, default=175, help='palabras por minuto (motor say)')
    ap.add_argument('--nombre', default='Voz de Numi', help='cómo aparece en Ajustes de la app')
    ap.add_argument('--solo-partes', action='store_true', help='sólo los pedacitos, sin las frases enteras')
    ap.add_argument('--limite', type=int, help='grabar como mucho N clips (para probar)')
    ap.add_argument('--rehacer', action='store_true', help='borrar lo grabado y empezar de cero')
    a = ap.parse_args()

    if a.motor == 'chatterbox' and not a.referencia:
        sys.exit('Falta --referencia mi_voz.wav (o usá --motor say para probar).')
    clips = json.loads(FRASES.read_text())
    if a.solo_partes:
        clips = [c for c in clips if not c['key'].startswith('f-')]

    tts = Chatterbox(a.referencia, a.exageracion, a.cfg) if a.motor == 'chatterbox' else Say(a.voz, a.velocidad)
    OUT.mkdir(parents=True, exist_ok=True)
    old = OUT / 'manifest.json'
    if old.exists():
        prev = json.loads(old.read_text()).get('origin')
        if prev != tts.origin and not a.rehacer:
            sys.exit(f'audio/voz ya tiene clips de otra voz ({prev}). Corré con --rehacer para reemplazarlos.')
    if a.rehacer:
        for f in OUT.glob(f'*.{EXT}'):
            f.unlink()

    version = time.strftime('%Y%m%d%H%M%S')
    pending = [c for c in clips if not (OUT / f"{c['key']}.{EXT}").exists()]
    print(f'{len(clips) - len(pending)} clips ya grabados, faltan {len(pending)}.')
    todo = pending[:a.limite]
    t0 = time.time()
    for i, c in enumerate(todo, 1):
        wav, sr = tts(c['text'])
        encode(wav, sr, OUT / f"{c['key']}.{EXT}")
        if i % 20 == 0 or i == len(todo):
            write_manifest(a.nombre, tts.origin, version, clips)
            eta = (time.time() - t0) / i * (len(todo) - i)
            print(f'{i}/{len(todo)}  «{c["text"][:40]}»  faltan ~{eta / 60:.0f} min', flush=True)
    n = write_manifest(a.nombre, tts.origin, version, clips)
    print(f'Listo: {n} clips en audio/voz/.')


if __name__ == '__main__':
    main()
