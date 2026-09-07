import os
import shutil
import subprocess
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
OUTPUT_DIR = r"D:\intain"
TEMP_DIR = os.path.join(OUTPUT_DIR, "live_5min_temp")

# Target durations for exact 4:48 total (288 seconds)
SCENE_DURATIONS = [
    ("step_01_operator_login", 22.0),
    ("step_02_upload_messy_tape", 26.0),
    ("step_03_validation_summary", 20.0),
    ("step_04_failed_records", 20.0),
    ("step_05_reviewer_login", 15.0),
    ("step_06_ai_explanation", 26.0),
    ("step_07_ai_recommendation_human_control", 26.0),
    ("step_08_approve_or_reject", 18.0),
    ("step_09_create_verified_record", 18.0),
    ("step_10_consumer_login", 18.0),
    ("step_11_verified_dashboard", 18.0),
    ("step_12_audit_trail_and_ledger", 20.0),
    ("step_13_verified_api", 15.0),
    ("step_14_ai_development_log", 15.0),
    ("step_15_closing", 11.0),
]

def trim_and_concat():
    trimmed_clips = []
    trimmed_raw_clips = []

    for name, dur in SCENE_DURATIONS:
        in_mp4 = os.path.join(TEMP_DIR, f"{name}.mp4")
        in_raw = os.path.join(TEMP_DIR, f"{name}_raw.mp4")
        
        out_mp4 = os.path.join(TEMP_DIR, f"{name}_trim.mp4")
        out_raw = os.path.join(TEMP_DIR, f"{name}_raw_trim.mp4")

        # Trim audio clip
        cmd1 = [
            FFMPEG_EXE, "-y", "-i", in_mp4,
            "-t", str(dur),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "ultrafast",
            "-c:a", "aac", "-b:a", "192k",
            out_mp4
        ]
        subprocess.run(cmd1, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        trimmed_clips.append(out_mp4)

        # Trim raw clip
        cmd2 = [
            FFMPEG_EXE, "-y", "-i", in_raw,
            "-t", str(dur),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "ultrafast",
            out_raw
        ]
        subprocess.run(cmd2, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        trimmed_raw_clips.append(out_raw)

    # Concat Final Audio Master
    concat_txt = os.path.join(TEMP_DIR, "concat_calibrated.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for p in trimmed_clips:
            f.write(f"file '{p.replace('\\', '/')}'\n")

    final_mp4 = os.path.join(OUTPUT_DIR, "LoanGuard-AI_Intain_Final_5_Minute.mp4")
    subprocess.run([
        FFMPEG_EXE, "-y", "-f", "concat", "-safe", "0",
        "-i", concat_txt, "-c", "copy", final_mp4
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Concat Raw Master
    concat_raw_txt = os.path.join(TEMP_DIR, "concat_raw_calibrated.txt")
    with open(concat_raw_txt, "w", encoding="utf-8") as f:
        for p in trimmed_raw_clips:
            f.write(f"file '{p.replace('\\', '/')}'\n")

    raw_mp4 = os.path.join(OUTPUT_DIR, "LoanGuard-AI_Intain_Raw.mp4")
    subprocess.run([
        FFMPEG_EXE, "-y", "-f", "concat", "-safe", "0",
        "-i", concat_raw_txt, "-c", "copy", raw_mp4
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    shutil.copyfile(final_mp4, os.path.join(OUTPUT_DIR, "LoanGuard-AI_Intain_5Min_Final.mp4"))

    # Check duration
    cmd = [FFMPEG_EXE, "-i", final_mp4]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
    for line in res.stderr.split("\n"):
        if "Duration" in line:
            print("CALIBRATED FINAL DURATION:", line.strip())

if __name__ == "__main__":
    trim_and_concat()
