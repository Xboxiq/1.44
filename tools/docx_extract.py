#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract text + table structure from a .docx file (no external deps)."""
import sys, zipfile, re
import xml.etree.ElementTree as ET

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def text_of(el):
    parts = []
    for t in el.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
        parts.append(t.text or '')
    # handle breaks/tabs
    return ''.join(parts)

def para_text(p):
    runs = []
    for node in p.iter():
        tag = node.tag.split('}')[-1]
        if tag == 't':
            runs.append(node.text or '')
        elif tag == 'tab':
            runs.append('\t')
        elif tag == 'br':
            runs.append('\n')
        elif tag == 'cr':
            runs.append('\n')
    return ''.join(runs).strip()

def walk(parent, depth=0):
    out = []
    for child in parent:
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            txt = para_text(child)
            if txt:
                out.append(txt)
        elif tag == 'tbl':
            out.append('\n=== TABLE START ===')
            for row in child.findall('w:tr', NS):
                cells = []
                for tc in row.findall('w:tc', NS):
                    ctext = []
                    for p in tc.findall('w:p', NS):
                        t = para_text(p)
                        if t:
                            ctext.append(t)
                    cells.append(' '.join(ctext))
                out.append(' | '.join(cells))
            out.append('=== TABLE END ===\n')
    return out

def extract(path):
    with zipfile.ZipFile(path) as z:
        with z.open('word/document.xml') as f:
            data = f.read()
    root = ET.fromstring(data)
    body = root.find('w:body', NS)
    lines = walk(body)
    return '\n'.join(lines)

if __name__ == '__main__':
    print(extract(sys.argv[1]))
