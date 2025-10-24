import nfc
from nfc.tag import Tag
from nfc.tag.tt3 import BlockCode, ServiceCode
from typing import cast
import requests
from functools import partial
import time


SYSTEM_CODE = 0xFE00  # FeliCaのサービスコード
API_URL = "http://api:3000/log/write"  # HTTP POST先のURL

def update_log(student_ID: str):
    send_data = {
        "type": "log/write",
        "payload": {
            "result": True,
            "content": {"student_ID": student_ID},
            "message": f"ID:{student_ID}のログを更新"
        }
    }
    try:
        response = requests.post(API_URL, json=send_data)
        print(f"Server responded with: {response.status_code}, {response.text}")
    except Exception as e:
        print(f"Error sending log: {e}")

def get_student_ID(tag: Tag):
    sc = ServiceCode(106, 0b001011)
    bc = BlockCode(0)
    student_id_bytearray = cast(bytearray, tag.read_without_encryption([sc], [bc]))
    role_classification = student_id_bytearray.decode("utf-8")[0:2]
    match role_classification:
        case "01" | "02":  # student
            return student_id_bytearray.decode("utf-8")[2:9]
        case "11":  # faculty
            return student_id_bytearray.decode("utf-8")[2:9]
        case _:  # unknown
            raise Exception(f"Unknown role classification: {role_classification}")

def on_connect(tag: Tag):
    print("connected")
    if isinstance(tag, nfc.tag.tt3_sony.FelicaStandard) and SYSTEM_CODE in tag.request_system_code():
        tag.idm, tag.pmm, *_ = tag.polling(SYSTEM_CODE)
        try:
            student_ID = get_student_ID(tag)
            update_log(student_ID)
        except Exception as e:
            print(f"Error: {e}")
    return True

def on_release(tag):
    print("released")
    return True

def main():
    while True:
        try:
            with nfc.ContactlessFrontend("usb") as clf:
                print("NFC reader connected. Waiting for card...")
                after1s = lambda: time.time() - started > 1
                while True:
                    started = time.time()
                    clf.connect(rdwr={
                            "on-connect": on_connect, 
                            "on-release": on_release,
                            "iterations":1},
                            # terminate=after1s
                            )
        except Exception as e:
            print(e)
            time.sleep(2)

if __name__ == "__main__":
    main()
