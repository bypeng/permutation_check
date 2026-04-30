#!/usr/bin/env python3

import argparse
import json
import os

def parse_arguments():
    parser = argparse.ArgumentParser(description="將參賽者純文字檔轉換為符合格式的 JSON 檔案。")
    parser.add_argument("--input_txt", default="player.txt", help="輸入的參賽者純文字檔名 (預設: player.txt)")
    parser.add_argument("--out_json", default="player.json", help="輸出的參賽者 JSON 檔名 (預設: player.json)")
    parser.add_argument("--export_gs", default=None, help="輸出供 Code.gs 使用的陣列宣告變數至指定檔案")
    return parser.parse_args()

def main():
    args = parse_arguments()
    data = []

    if not os.path.exists(args.input_txt):
        print(f"提醒：找不到檔案 {args.input_txt}，請確認檔案是否存在。")
        return

    # 1. 讀取並解析純文字檔
    with open(args.input_txt, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # 以 '/' 切割，預期會有三個部分
        parts = line.split('/')
        if len(parts) != 3:
            print(f"警告：此行格式不符，已跳過 -> {line}")
            continue

        data.append({
            "id": i + 1,
            "p1name": parts[0].strip(),
            "p2name": parts[1].strip(),
            "relationship": parts[2].strip()
        })

    # 2. 輸出至 JSON 檔案
    with open(args.out_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"已成功產出 {args.out_json}")

    # 3. 若有指定 export_gs，則輸出 JavaScript 陣列格式
    if args.export_gs:
        with open(args.export_gs, 'w', encoding='utf-8') as f:
            f.write("const PLAYER_DATA = [\n")
            f.write(",\n".join([f"  {json.dumps(item, ensure_ascii=False)}" for item in data]))
            f.write("\n];\n")
        print(f"已成功產出 {args.export_gs}")

if __name__ == "__main__":
    main()