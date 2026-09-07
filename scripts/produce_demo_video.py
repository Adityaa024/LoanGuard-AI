import asyncio
import os
import subprocess
import edge_tts
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
OUTPUT_DIR = r"D:\intain"
WEBP_RECORDING = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\15945427-7054-4b85-9e38-a4f4dbf358f3\loanguard_demo_raw_1788276824972.webp"

SCENE_SCRIPTS = [
    ("scene_01.mp3", "Welcome to LoanGuard-AI, an AI-assisted loan data verification platform. We begin with the Data Operator, responsible for bringing loan data into the verification workflow."),
    ("scene_02.mp3", "The operator ingests a deliberately messy loan tape containing records that need validation. The deterministic policy engine evaluates the dataset before records can enter the verified workflow."),
    ("scene_03.mp3", "The validation summary separates clean records from records requiring review, while the reconciliation view keeps the reported counts tied to the processed dataset."),
    ("scene_04.mp3", "At row level, the operator can inspect the exact validation failures. At batch level, the system preserves source lineage and processing history for traceability."),
    ("scene_05.mp3", "The Reviewer workspace is focused on resolving flagged exceptions. The queue and inspector stay synchronized around the selected record."),
    ("scene_06.mp3", "The deterministic validation identifies the failure, while the AI Copilot explains the root cause and proposes a possible resolution. The source value, AI recommendation, and final human decision remain separate."),
    ("scene_07.mp3", "The AI recommendation is first applied as a reviewer-controlled draft. It does not silently modify the verified record. The human reviewer remains responsible for the final decision."),
    ("scene_08.mp3", "Only after explicit human approval does the system create the verified record and its integrity artifact."),
    ("scene_09.mp3", "The Data Consumer receives the trusted output of the workflow: reviewer-approved records, validation status, source lineage, and integrity information."),
    ("scene_10.mp3", "The consumer can verify the integrity of the recorded history. At loan level, the audit trail reconstructs the journey from ingestion through verification."),
    ("scene_11.mp3", "The verified portfolio is also exposed through a REST API for trusted downstream consumption."),
    ("scene_12.mp3", "The AI Development Log documents how AI was used during engineering, how outputs were reviewed, and where human judgment was required."),
    ("scene_13.mp3", "LoanGuard-AI combines deterministic loan-data validation, human-controlled AI review, verified records, and cryptographically traceable audit history in one full-stack workflow.")
]

async def generate_speech():
    temp_dir = os.path.join(OUTPUT_DIR, "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)
    voice = "en-US-GuyNeural"
    
    file_list = []
    print("[1/3] Synthesizing studio neural voiceover with Edge-TTS...")
    for filename, text in SCENE_SCRIPTS:
        filepath = os.path.join(temp_dir, filename)
        communicate = edge_tts.Communicate(text, voice=voice, rate="+0%", volume="+0%")
        await communicate.save(filepath)
        print(f"   Generated: {filename}")
        file_list.append(filepath)
        
    concat_txt = os.path.join(temp_dir, "concat_list.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for p in file_list:
            f.write(f"file '{p.replace('\\', '/')}'\n")
            
    master_audio = os.path.join(temp_dir, "master_voiceover.mp3")
    cmd = [
        FFMPEG_EXE, "-y", "-f", "concat", "-safe", "0",
        "-i", concat_txt, "-c", "copy", master_audio
    ]
    subprocess.run(cmd, check=True)
    print(f"Master voiceover generated: {master_audio}")
    return master_audio

def produce_videos(master_audio):
    raw_mp4 = os.path.join(OUTPUT_DIR, "LoanGuard-AI_Demo_Raw.mp4")
    final_mp4 = os.path.join(OUTPUT_DIR, "LoanGuard-AI_Intain_Demo_Final.mp4")
    
    print("[2/3] Converting recorded browser session to LoanGuard-AI_Demo_Raw.mp4...")
    cmd_raw = [
        FFMPEG_EXE, "-y",
        "-i", WEBP_RECORDING,
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "fast",
        raw_mp4
    ]
    subprocess.run(cmd_raw, check=True)
    print(f"Raw video exported: {raw_mp4}")
    
    print("[3/3] Assembling Final Competition Demo with Synced Voiceover...")
    cmd_final = [
        FFMPEG_EXE, "-y",
        "-i", raw_mp4,
        "-i", master_audio,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        final_mp4
    ]
    subprocess.run(cmd_final, check=True)
    print(f"SUCCESS: Final Competition Demo video successfully produced at: {final_mp4}")

def main():
    master_audio = asyncio.run(generate_speech())
    produce_videos(master_audio)

if __name__ == "__main__":
    main()
