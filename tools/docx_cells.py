#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dump each table's cells with text + shading fill, to capture form fidelity."""
import sys, zipfile
import xml.etree.ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
def q(t): return f'{{{W}}}{t}'

def cell_text(tc):
    parts = []
    for node in tc.iter():
        tag = node.tag.split('}')[-1]
        if tag == 't': parts.append(node.text or '')
        elif tag in ('tab',): parts.append(' ')
    return ''.join(parts).strip()

def cell_shade(tc):
    tcPr = tc.find(q('tcPr'))
    if tcPr is None: return ''
    shd = tcPr.find(q('shd'))
    if shd is None: return ''
    return shd.get(q('fill')) or ''

def main(path, table_index=None):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read('word/document.xml'))
    body = root.find(q('body'))
    ti = 0
    for tbl in body.iter(q('tbl')):
        if table_index is not None and ti != table_index:
            ti += 1; continue
        print(f"\n##### TABLE {ti} #####")
        for tr in tbl.findall(q('tr')):
            cells = []
            for tc in tr.findall(q('tc')):
                txt = cell_text(tc)
                shd = cell_shade(tc)
                mark = f"[{shd}]" if shd and shd != 'auto' else ""
                cells.append(f"{txt}{mark}")
            print(' | '.join(cells))
        ti += 1

if __name__ == '__main__':
    idx = int(sys.argv[2]) if len(sys.argv) > 2 else None
    main(sys.argv[1], idx)
