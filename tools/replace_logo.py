#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""استبدال شعار الشركة المضمَّن داخل قوالب الوورد بالشعار الرسمي الجديد.

كل قالب في data/templates/<CODE>.docx يضمّن شعار الشركة في ترويسة الصفحة
عبر الملف word/media/image1.jpeg. هذا السكربت يستبدل ذلك الملف ببايتات
الشعار الرسمي (assets/img/logo.jpeg) في كل القوالب، مع الحفاظ التام على
بقية محتوى المستند (النصوص/الجداول/العلامات {{...}}/الترويسة/التذييل).

التشغيل:
    python3 tools/replace_logo.py            # يطبّق على كل القوالب
    python3 tools/replace_logo.py CS0001     # قالب واحد

ملاحظة: الشعار يُضمَّن بنفس اسم/مسار الجزء (image1.jpeg) فيحافظ على نفس
أبعاد ومكان الإطار في الترويسة — يتغيّر «الشكل» فقط لا «التخطيط».
"""
import sys, os, glob, shutil, zipfile, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, 'assets', 'img', 'logo.jpeg')
TEMPLATES_DIR = os.path.join(ROOT, 'data', 'templates')
MEDIA_NAME = 'word/media/image1.jpeg'


def replace_in_docx(path, logo_bytes):
    """يعيد كتابة ملف docx مع استبدال جزء الشعار فقط، محافظاً على البقية."""
    tmp = path + '.tmp'
    with zipfile.ZipFile(path, 'r') as zin:
        names = zin.namelist()
        if MEDIA_NAME not in names:
            print(f'  ! تجاهل (لا يوجد {MEDIA_NAME}): {os.path.basename(path)}')
            return False
        with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == MEDIA_NAME:
                    data = logo_bytes
                # احفظ نفس نوع الضغط لكل جزء
                zi = zipfile.ZipInfo(item.filename, date_time=item.date_time)
                zi.compress_type = item.compress_type
                zi.external_attr = item.external_attr
                zi.internal_attr = item.internal_attr
                zi.create_system = item.create_system
                zout.writestr(zi, data)
    shutil.move(tmp, path)
    return True


def main():
    if not os.path.exists(LOGO):
        sys.exit(f'الشعار غير موجود: {LOGO}')
    logo_bytes = open(LOGO, 'rb').read()

    if len(sys.argv) > 1:
        targets = [os.path.join(TEMPLATES_DIR, a if a.endswith('.docx') else a + '.docx') for a in sys.argv[1:]]
    else:
        targets = sorted(glob.glob(os.path.join(TEMPLATES_DIR, '*.docx')))

    done = 0
    for t in targets:
        if not os.path.exists(t):
            print(f'  ! غير موجود: {t}')
            continue
        if replace_in_docx(t, logo_bytes):
            print(f'  ✓ {os.path.basename(t)}')
            done += 1
    print(f'\nتم تحديث الشعار في {done} قالباً.')


if __name__ == '__main__':
    main()
