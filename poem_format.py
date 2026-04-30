#!/usr/bin/env python3

import argparse
import json
import os

def parse_arguments():
    parser = argparse.ArgumentParser(description="將詩句純文字檔轉換為符合格式的 JSON 檔案，並計算筆劃排序。")
    parser.add_argument("--correct_txt", default="poem_correct.txt", help="輸入的正確詩句純文字檔名")
    parser.add_argument("--confuse_txt", default="poem_confuse.txt", help="輸入的混淆詩句純文字檔名")
    parser.add_argument("--correct_json", default="poem_correct.json", help="輸出的正確詩句 JSON 檔名")
    parser.add_argument("--confuse_json", default="poem_confuse.json", help="輸出的混淆詩句 JSON 檔名")
    parser.add_argument("--correct_out_txt", default="poem_correct_withsn.txt", help="輸出的正確詩句純文字檔名 (附加編號)")
    parser.add_argument("--confuse_out_txt", default="poem_confuse_withsn.txt", help="輸出的混淆詩句純文字檔名 (附加編號)")
    parser.add_argument("--export_gs", default=None, help="輸出供 Code.gs 使用的陣列宣告變數至指定檔案")
    return parser.parse_args()

def process_file(filename, is_confuse=False):
    data = []
    if not os.path.exists(filename):
        print(f"提醒：找不到檔案 {filename}，將跳過該檔案的處理。")
        return data

    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # 以 '/' 切割，確保恰有一個
        parts = line.split('/')
        if len(parts) != 2:
            print(f"警告：此行格式不符，已跳過 -> {line}")
            continue

        # 去除 '/' 前後的空白
        first_text = parts[0].strip()
        second_text = parts[1].strip()
        
        # 重新組合全句，中間以單一空白隔開
        full_text = f"{first_text} {second_text}"

        # 混淆選項的 ID 與 Weight 從 10001 開始起跳，避免干擾 LIS 演算法
        base_id = 10000 if is_confuse else 0
        item_id = base_id + i + 1

        data.append({
            "id": item_id,
            "weight": item_id,
            "showid": 0,  # 稍後統一排序計算
            "firstText": first_text,
            "secondText": second_text,
            "fullText": full_text
        })
        
    return data

def main():
    args = parse_arguments()

    # 1. 讀取並解析純文字檔
    correct_data = process_file(args.correct_txt, is_confuse=False)
    confuse_data = process_file(args.confuse_txt, is_confuse=True)

    # 2. 合併所有資料，依照 Big5 編碼排序（Big5 內建依筆劃由少至多排序）
    all_data = correct_data + confuse_data
    
    def stroke_sort_key(item):
        try:
            # 將 firstText 轉為 big5 bytes 做為排序鍵值
            return item['firstText'].encode('big5', errors='ignore')
        except Exception:
            return item['firstText'].encode('utf-8')

    all_data_sorted = sorted(all_data, key=stroke_sort_key)

    # 3. 根據排序結果賦予 showid (1 起始)
    for index, item in enumerate(all_data_sorted):
        item['showid'] = index + 1

    # 4. 輸出至 JSON 檔案
    with open(args.correct_json, 'w', encoding='utf-8') as f:
        json.dump(correct_data, f, ensure_ascii=False, indent=2)
    with open(args.confuse_json, 'w', encoding='utf-8') as f:
        json.dump(confuse_data, f, ensure_ascii=False, indent=2)

    # 5. 輸出附加編號的純文字檔
    with open(args.correct_out_txt, 'w', encoding='utf-8') as f:
        for item in correct_data:
            f.write(f"[{item['showid']}] / {item['firstText']} / {item['secondText']}\n")
            
    with open(args.confuse_out_txt, 'w', encoding='utf-8') as f:
        for item in confuse_data:
            f.write(f"[{item['showid']}] / {item['firstText']} / {item['secondText']}\n")

    # 6. 若有指定 export_gs，則輸出 JavaScript 陣列格式
    if args.export_gs:
        with open(args.export_gs, 'w', encoding='utf-8') as f:
            f.write("const POEM_CORRECT_DATA = [\n")
            f.write(",\n".join([f"  {json.dumps(item, ensure_ascii=False)}" for item in correct_data]))
            f.write("\n];\n\nconst POEM_CONFUSE_DATA = [\n")
            f.write(",\n".join([f"  {json.dumps(item, ensure_ascii=False)}" for item in confuse_data]))
            f.write("\n];\n")

if __name__ == "__main__":
    main()
