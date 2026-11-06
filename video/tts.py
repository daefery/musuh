# Narration: one audio clip per sentence from video/narration.json (edge-tts, Indonesian neural voice).
# The voice reads the "say" form (lexicon applied); subtitles keep the written form.
# Output: video/out/vo/<scene>-<n>.wav (48 kHz mono) and video/out/vo/index.json with durations.
#   python video/tts.py            (needs: pip install edge-tts; internet for synthesis only)
import asyncio, json, os, re, subprocess, wave
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "vo"); os.makedirs(OUT, exist_ok=True)
N = json.load(open(os.path.join(HERE, "narration.json"), encoding="utf-8"))

def say(text):
    for a, b in N["lexicon"]:
        text = re.sub(r"(?<![\w-])" + re.escape(a) + r"(?![\w-])", b, text)
    return text

async def one(key, text):
    mp3, wav = os.path.join(OUT, key + ".mp3"), os.path.join(OUT, key + ".wav")
    audio, words = b"", []
    async for ch in edge_tts.Communicate(say(text), N["voice"], rate=N["rate"], boundary="WordBoundary").stream():
        if ch["type"] == "audio": audio += ch["data"]
        elif ch["type"] == "WordBoundary": words.append([ch["text"], ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7])
    open(mp3, "wb").write(audio)
    # cut to the spoken part (first word start to last word end, small margins) so timing is exact
    a, z = max(0, words[0][1] - 0.04), words[-1][2] + 0.12
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-af", f"atrim={a}:{z},asetpts=PTS-STARTPTS",
        "-ar", "48000", "-ac", "1", wav], check=True)
    os.remove(mp3)
    with wave.open(wav) as w: d = w.getnframes() / w.getframerate()
    return key, {"d": round(d, 3), "words": [[t, round(s - a, 3), round(e - a, 3)] for t, s, e in words]}

async def main():
    jobs = [one(f"{s['id']}-{i}", t) for s in N["scenes"] for i, t in enumerate(s["lines"])]
    res = []
    for k in range(0, len(jobs), 6): res += await asyncio.gather(*jobs[k:k + 6])
    idx = dict(res)
    json.dump(idx, open(os.path.join(OUT, "index.json"), "w"), indent=1)
    print(len(idx), "clips,", round(sum(v["d"] for v in idx.values()), 1), "s of speech")

asyncio.run(main())
