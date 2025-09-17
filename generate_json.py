# generate_json.py (Final version for simplified folder structure)
import os
import json
from moviepy.editor import VideoFileClip
import re

LECTURES_DIR = "lectures"
RESOURCES_DIR = "resources"
OUTPUT_FILE = "data.json"

def natural_sort_key(s):
    """Sort strings with numbers in a natural way (e.g., 'Lecture 10' comes after 'Lecture 2')."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', str(s))]

def safe_duration(video_path):
    """Safely get video duration, return 0 if there's an error."""
    try:
        if os.path.exists(video_path) and os.path.getsize(video_path) > 0:
            with VideoFileClip(video_path) as clip:
                return int(clip.duration)
        return 0
    except Exception as e:
        print(f"  -> Warning: Could not read duration for '{video_path}'. Error: {e}")
        return 0

def build_lecture_id(subject, chapter, lecture):
    """Create a unique, lowercase ID for a lecture."""
    # Use lecture's base filename for the ID to ensure uniqueness
    lecture_base = os.path.splitext(lecture)[0]
    return f"{subject.lower()}-{chapter.lower()}-{lecture_base.lower()}".replace(" ", "-")

def generate_json_from_new_structure():
    all_lectures_data = []
    print(f"STEP 1: Scanning for videos in '{LECTURES_DIR}/' folder...")

    if not os.path.exists(LECTURES_DIR):
        print(f"Error: '{LECTURES_DIR}' folder not found!")
        return

    # Walk through the lectures directory to find videos
    for root, _, files in os.walk(LECTURES_DIR):
        for video_file in files:
            if video_file.lower().endswith('.mp4'):
                video_path = os.path.normpath(os.path.join(root, video_file))
                parts = video_path.split(os.sep)
                
                # NEW LOGIC: Expects structure: lectures/Subject/Chapter/video.mp4
                if len(parts) >= 4:
                    subject, chapter = parts[1], parts[2]
                    # The lecture's name is now derived directly from the video filename
                    lecture = os.path.splitext(video_file)[0]
                    
                    print(f"-> Found video for: {subject} > {chapter} > {lecture}")

                    # Resource matching logic remains the same (filename-based)
                    video_base_name = lecture
                    resource_scan_path = os.path.join(RESOURCES_DIR, subject, chapter)
                    
                    related_files = []
                    if os.path.exists(resource_scan_path):
                        for resource_file in os.listdir(resource_scan_path):
                            if resource_file.startswith(video_base_name):
                                related_files.append({
                                    "title": resource_file,
                                    "path": os.path.join(resource_scan_path, resource_file).replace(os.sep, '/')
                                })

                    duration = safe_duration(video_path)
                    
                    thumb = f"assets/{chapter.lower().replace(' ', '-')}.jpg"
                    if not os.path.exists(thumb):
                        thumb = "assets/default.png"

                    lecture_data = {
                        "id": build_lecture_id(subject, chapter, video_file),
                        "subject": subject,
                        "chapter": chapter,
                        "lecture": lecture,
                        "path": video_path.replace(os.sep, '/'),
                        "duration": duration,
                        "thumbnail": thumb,
                        "relatedFiles": related_files
                    }
                    all_lectures_data.append(lecture_data)

    all_lectures_data.sort(key=lambda x: (x['subject'], x['chapter'], natural_sort_key(x['lecture'])))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_lectures_data, f, indent=2)

    print(f"\n✅ Success! Generated '{OUTPUT_FILE}' with {len(all_lectures_data)} lectures.")


if __name__ == "__main__":
    generate_json_from_new_structure()