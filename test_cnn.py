#!/usr/bin/env python3
import sys
import os
import requests
import cv2
import numpy as np

# Add backend to path
sys.path.insert(0, '/Users/krishsati13/Downloads/EmotionMonitoringWeb-main/python_backend')

from facial_detection_deeplearning import DeepLearningFacialEmotionDetector

def test_detector():
    print("Initializing detector...")
    try:
        detector = DeepLearningFacialEmotionDetector()
        print("Detector initialized!")
    except Exception as e:
        print(f"Failed to init detector: {e}")
        return

    # Download a sample face image
    img_url = "https://raw.githubusercontent.com/opencv/opencv/master/samples/data/lena.jpg"
    print(f"Downloading sample image from {img_url}...")
    try:
        resp = requests.get(img_url)
        if resp.status_code != 200:
            print("Failed to download image")
            return
        image_bytes = resp.content
        print(f"Downloaded {len(image_bytes)} bytes")
    except Exception as e:
        print(f"Error downloading: {e}")
        return

    print("Analyzing emotion...")
    try:
        result = detector.analyze_emotion(image_bytes)
        print("\n" + "="*40)
        print("RESULTS:")
        print(f"Emotion: {result.get('emotion')}")
        print(f"Confidence: {result.get('confidence')}")
        print(f"Faces Detected: {result.get('faces_detected')}")
        if 'error' in result:
            print(f"ERROR: {result['error']}")
        print("="*40)
    except Exception as e:
        print(f"Analysis failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_detector()
