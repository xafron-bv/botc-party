#!/usr/bin/env python3
import json
import os
import shutil
import sys
from typing import Dict, Any, List

WORKSPACE = "/workspace"
TOKENS_JSON = os.path.join(WORKSPACE, "tokens.json")
CHARACTERS_JSON = os.path.join(WORKSPACE, "characters.json")
PLACEHOLDER = os.path.join(WORKSPACE, "assets", "img", "token-BqDQdWeO.webp")


def load_tokens_mapping() -> Dict[str, str]:
    with open(TOKENS_JSON, "r", encoding="utf-8") as f:
        data: Dict[str, Any] = json.load(f)
    mapping: Dict[str, str] = {}
    for team_name, items in data.items():
        if not isinstance(items, list):
            continue
        for role in items:
            if isinstance(role, dict) and role.get("id") and role.get("image"):
                mapping[str(role["id"]).strip()] = str(role["image"]).strip()
    return mapping


def load_characters_mapping() -> Dict[str, str]:
    with open(CHARACTERS_JSON, "r", encoding="utf-8") as f:
        chars: List[Dict[str, Any]] = json.load(f)
    mapping: Dict[str, str] = {}
    for role in chars:
        if isinstance(role, dict) and role.get("id") and role.get("image"):
            mapping[str(role["id"]).strip()] = str(role["image"]).strip()
    return mapping


def copy_image(src_rel: str, dst_rel: str) -> str:
    # Normalize leading slash to workspace absolute path
    src_abs = os.path.join(WORKSPACE, src_rel.lstrip("/"))
    dst_abs = os.path.join(WORKSPACE, dst_rel.lstrip("/"))
    os.makedirs(os.path.dirname(dst_abs), exist_ok=True)
    if os.path.exists(src_abs):
        shutil.copy2(src_abs, dst_abs)
        return f"COPIED {src_rel} -> {dst_rel}"
    else:
        # Try fallback placeholder if available
        if os.path.exists(PLACEHOLDER):
            shutil.copy2(PLACEHOLDER, dst_abs)
            return f"MISSING {src_rel}; USED PLACEHOLDER -> {dst_rel}"
        return f"MISSING {src_rel}; SKIPPED -> {dst_rel}"


def main() -> int:
    if not os.path.exists(TOKENS_JSON):
        print(f"ERROR: tokens.json not found at {TOKENS_JSON}")
        return 1
    if not os.path.exists(CHARACTERS_JSON):
        print(f"ERROR: characters.json not found at {CHARACTERS_JSON}")
        return 1
    tokens_map = load_tokens_mapping()
    chars_map = load_characters_mapping()

    copied = 0
    missing = 0
    used_placeholder = 0
    actions: List[str] = []

    ids = sorted(chars_map.keys())
    for char_id in ids:
        dst_rel = chars_map[char_id]
        src_rel = tokens_map.get(char_id)
        if not dst_rel:
            continue
        if not src_rel:
            # No source in tokens.json; create destination dir for completeness and attempt placeholder
            dst_abs = os.path.join(WORKSPACE, dst_rel.lstrip("/"))
            os.makedirs(os.path.dirname(dst_abs), exist_ok=True)
            if os.path.exists(PLACEHOLDER):
                shutil.copy2(PLACEHOLDER, dst_abs)
                used_placeholder += 1
                actions.append(f"NO SRC for id={char_id}; USED PLACEHOLDER -> {dst_rel}")
            else:
                # Touch nothing but record
                actions.append(f"NO SRC for id={char_id}; SKIPPED -> {dst_rel}")
            continue
        msg = copy_image(src_rel, dst_rel)
        actions.append(msg)
        if msg.startswith("COPIED"):
            copied += 1
        elif "PLACEHOLDER" in msg:
            used_placeholder += 1
        else:
            missing += 1

    print(f"Total target images: {len(ids)}")
    print(f"Copied: {copied}")
    print(f"Used placeholder: {used_placeholder}")
    print(f"Missing: {missing}")
    # Print a small tail of actions for visibility
    tail = 20
    for line in actions[-tail:]:
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())