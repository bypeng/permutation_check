#!/usr/bin/env python3

import json
import sys
import os

# --- Configuration ---
TEMPLATE_FILE = 'Code.gs.template'
OUTPUT_FILE = 'Code.gs'
POEMS_CORRECT_JSON_FILE = 'poem_correct.json' # 預期 poem_format.py 的產出檔案
POEMS_CONFUSE_JSON_FILE = 'poem_confuse.json' # 預期 poem_format.py 的產出檔案
PLAYERS_JSON_FILE = 'player.json' # 預期 generate_players.py 的產出檔案

# --- Placeholders in template ---
# 這些是將在範本檔案中被取代的字串標記
POEM_CORRECT_PLACEHOLDER = "'__POEM_CORRECT_DATA__'"
POEM_CONFUSE_PLACEHOLDER = "'__POEM_CONFUSE_DATA__'"
PLAYER_PLACEHOLDER = "'__PLAYER_DATA__'"

def main():
    """
    讀取 JSON 檔案中的資料，並將其注入到 Google Apps Script 範本檔案中，
    最終生成可直接使用的 Code.gs。
    """
    print("Starting build process for Code.gs...")

    try:
        # --- 1. 讀取 JSON 資料檔案 ---
        print(f"-> Reading '{POEMS_CORRECT_JSON_FILE}'...")
        with open(POEMS_CORRECT_JSON_FILE, 'r', encoding='utf-8') as f:
            correct_poems_data = json.load(f)
            correct_poems_str = json.dumps(correct_poems_data, indent=2, ensure_ascii=False)

        print(f"-> Reading '{POEMS_CONFUSE_JSON_FILE}'...")
        with open(POEMS_CONFUSE_JSON_FILE, 'r', encoding='utf-8') as f:
            confuse_poems_data = json.load(f)
            confuse_poems_str = json.dumps(confuse_poems_data, indent=2, ensure_ascii=False)

        print(f"-> Reading '{PLAYERS_JSON_FILE}'...")
        with open(PLAYERS_JSON_FILE, 'r', encoding='utf-8') as f:
            players_data = json.load(f)
            players_str = json.dumps(players_data, indent=2, ensure_ascii=False)
        
        # --- 2. 讀取範本檔案 ---
        print(f"-> Reading template file '{TEMPLATE_FILE}'...")
        with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
            template_content = f.read()

        # --- 3. 取代佔位符 ---
        print("-> Injecting data into the template...")
        final_code = template_content.replace(POEM_CORRECT_PLACEHOLDER, correct_poems_str)
        final_code = final_code.replace(POEM_CONFUSE_PLACEHOLDER, confuse_poems_str)
        final_code = final_code.replace(PLAYER_PLACEHOLDER, players_str)

        # --- 4. 寫入最終的 Code.gs 檔案 ---
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(final_code)

        print(f"\n🎉 Success! '{OUTPUT_FILE}' has been generated.")
        print("You can now copy its content to your Google Apps Script project.")

    except FileNotFoundError as e:
        print(f"\n❌ ERROR: Required file not found: {e.filename}")
        print(f"Please make sure '{TEMPLATE_FILE}', '{POEMS_CORRECT_JSON_FILE}', '{POEMS_CONFUSE_JSON_FILE}', and '{PLAYERS_JSON_FILE}' exist in the same directory.")
        sys.exit(1)
    except (json.JSONDecodeError, Exception) as e:
        print(f"\n❌ An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()