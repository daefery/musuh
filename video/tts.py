# English narration, one clip per sentence, from video/narration.json ("en" lines; "id" lines are the subtitles).
# Voice: Kokoro TTS (open model, Apache 2.0), runs locally, no internet.
#   pip install kokoro-onnx soundfile
#   model files kokoro-v1.0.onnx + voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx releases,
#   in video/models/ or the folder named by KOKORO_DIR
#   python video/tts.py
# Output: video/out/vo/<scene>-<n>.wav (48 kHz mono) and video/out/vo/index.json { key: { d } }.
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "vo"); os.makedirs(OUT, exist_ok=True)
N = json.load(open(os.path.join(HERE, "narration.json"), encoding="utf-8"))
MD = os.environ.get("KOKORO_DIR", os.path.join(HERE, "models"))
k = Kokoro(os.path.join(MD, "kokoro-v1.0.onnx"), os.path.join(MD, "voices-v1.0.bin"))
voice = os.environ.get("VOICE", N["voice"])

def say(text):
    for a, b in N["lexicon"]:
        text = re.sub(r"(?<![\w-])" + re.escape(a) + r"(?![\w-])", b, text)
    return text

idx = {}
for s in N["scenes"]:
    for i, line in enumerate(s["lines"]):
        key = f"{s['id']}-{i}"
        a, sr = k.create(say(line["en"]), voice=voice, speed=N["speed"], lang="en-us")
        # trim silence at both ends (threshold relative to peak), keep 40 ms / 120 ms margins
        env = np.abs(a) > 0.02 * np.abs(a).max(); nz = np.flatnonzero(env)
        a = a[max(0, nz[0] - int(.04 * sr)): nz[-1] + int(.12 * sr)]
        tmp = os.path.join(OUT, key + ".tmp.wav"); sf.write(tmp, a, sr)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ar", "48000", "-ac", "1", os.path.join(OUT, key + ".wav")], check=True)
        os.remove(tmp)
        idx[key] = {"d": round(len(a) / sr, 3)}
        print(key, idx[key]["d"], file=sys.stderr)
# Word start times (for camera cues pinned to a spoken word): faster-whisper word timestamps, if installed.
try:
    from faster_whisper import WhisperModel
    asr = WhisperModel("small", device="cpu", compute_type="int8")
    for key in idx:
        a, sr = sf.read(os.path.join(OUT, key + ".wav"), dtype="float32")
        a16 = np.interp(np.arange(0, len(a), sr / 16000), np.arange(len(a)), a).astype(np.float32)
        segs, _ = asr.transcribe(a16, language="en", beam_size=1, word_timestamps=True)
        idx[key]["words"] = [[re.sub(r"[^a-z0-9]", "", w.word.lower()), round(w.start, 2)] for sg in segs for w in sg.words]
except ImportError:
    print("faster-whisper not installed: camera cues fall back to fixed offsets", file=sys.stderr)
json.dump(idx, open(os.path.join(OUT, "index.json"), "w"), indent=1)
print(len(idx), "clips,", round(sum(v["d"] for v in idx.values()), 1), "s of speech")
