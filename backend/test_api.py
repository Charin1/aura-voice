import requests
import os
import time

API_BASE = "http://localhost:8000"

def test_synthesis():
    print("🚀 Testing Aura Voice API...")
    
    # 1. Check if backend is alive
    try:
        res = requests.get(f"{API_BASE}/stats")
        print(f"✅ Backend Stats: {res.json()}")
    except:
        print("❌ Backend is not running. Start it with: python main.py")
        return

    # 2. Upload Reference (Requires a sample .wav)
    # For testing, we look for any .wav in the current dir
    wav_files = [f for f in os.listdir(".") if f.endswith(".wav")]
    if not wav_files:
        print("⚠️ No .wav file found for testing. Please place a 10s sample.wav in this directory.")
        return
    
    sample_wav = wav_files[0]
    print(f"📤 Uploading {sample_wav} as reference...")
    with open(sample_wav, "rb") as f:
        res = requests.post(f"{API_BASE}/upload-reference", files={"file": f})
    
    ref_data = res.json()
    ref_id = ref_data["id"]
    print(f"✅ Reference uploaded! ID: {ref_id}")
    print(f"📖 Transcript: {ref_data['transcript']}")

    # 3. Synthesize
    print("🧬 Synthesizing cloned voice (XTTS)...")
    payload = {
        "text": "Hello, I am your cloned voice. Built by Antigravity and Aura Voice Studio.",
        "model_type": "xtts",
        "reference_id": ref_id
    }
    res = requests.post(f"{API_BASE}/synthesize", data=payload)
    
    if res.status_code == 200:
        output_name = "test_output.wav"
        with open(output_name, "wb") as f:
            f.write(res.content)
        print(f"🎉 Success! Generated: {output_name}")
    else:
        print(f"❌ Synthesis failed: {res.text}")

if __name__ == "__main__":
    test_synthesis()
