#!/usr/bin/env python3
"""The joke about the demo.

Entry: a program that writes one text to /output/entry.txt: a one-line
joke about working beside AI coding agents.
"""
import os

JOKE = "My AI pair programmer writes code faster than I can review it - I just nod, merge, and pray the tests pass."

def main():
    os.makedirs("/output", exist_ok=True)
    with open("/output/entry.txt", "w", encoding="utf-8") as f:
        f.write(JOKE + "\n")

if __name__ == "__main__":
    main()
