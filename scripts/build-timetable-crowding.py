#!/usr/bin/env python3
"""Convert the published Seoul Metro XLSX to compact timetable-only half-hour levels."""
import argparse
import json
import math
import posixpath
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
RID = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
DAYS = ('평일', '토요일', '일요일')
# Use the same thresholds as the real-time screens; the JSON carries a copy for testing.
policy_source = (Path(__file__).resolve().parents[1] / 'app/lib/congestion-data.js').read_text(encoding='utf-8')
THRESHOLDS = json.loads(re.search(r'export const CONGESTION_THRESHOLDS\s*=\s*(\[[^\]]+\]);', policy_source).group(1))
DIRS = {'상선': 0, '상행': 0, '내선': 0, '내선순환': 0,
        '하선': 1, '하행': 1, '외선': 1, '외선순환': 1}


def sheet_rows(archive, path, strings):
    root = ET.fromstring(archive.read(path))
    for row in root.findall('.//s:sheetData/s:row', NS):
        cells = {}
        for cell in row.findall('s:c', NS):
            address = cell.get('r', '')
            col = 0
            for letter in re.match(r'^[A-Z]+', address).group():
                col = col * 26 + ord(letter) - 64
            typ = cell.get('t')
            value = cell.findtext('s:v', default='', namespaces=NS)
            if typ == 's':
                value = strings[int(value)]
            elif typ == 'inlineStr':
                value = ''.join(x.text or '' for x in cell.findall('.//s:t', NS))
            cells[col] = value
        yield cells


def convert(path, source_date):
    data, seen = {}, set()
    with ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            strings = [''.join(t.text or '' for t in item.findall('.//s:t', NS))
                       for item in root.findall('s:si', NS)]
        sheets = ET.fromstring(archive.read('xl/workbook.xml'))
        rels = {x.get('Id'): x.get('Target') for x in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        paths = {s.get('name'): posixpath.normpath(posixpath.join('xl', rels[s.get(RID)]))
                 if not rels[s.get(RID)].startswith('/') else rels[s.get(RID)].lstrip('/')
                 for s in sheets.findall('s:sheets/s:sheet', NS)}
        for day, name in enumerate(DAYS):
            rows = iter(sheet_rows(archive, paths[name], strings))
            header = next(rows)
            if [header.get(i) for i in range(1, 5)] != ['호선', '역번호', '역명', '상하구분']:
                raise ValueError(f'Unexpected header: {name}')
            slots = {col: tuple(map(int, v.split('~')[0].split(':'))) for col, v in header.items()
                     if re.fullmatch(r'\d\d:\d\d~\d\d:\d\d', str(v))}
            if len(slots) != 39 or set(slots.values()) != {(m//60,m%60) for m in range(330,1500,30)}:
                raise ValueError(f'Unexpected half-hour slots: {name}')
            for cells in rows:
                if not cells.get(1) or not cells.get(2):
                    continue
                line = str(cells[1]).replace('호선', '')
                code = str(int(float(cells[2]))).zfill(4)
                direction = DIRS[cells[4]]
                if line not in '12345678' or len(line) != 1:
                    raise ValueError(f'Unexpected line: {line}')
                key = line + ':' + code
                index = day * 2 + direction
                if (key, index) in seen:
                    raise ValueError(f'Duplicate station/day/direction: {key} {name} {direction}')
                seen.add((key, index))
                values = {}
                for col, (hour, minute) in slots.items():
                    raw = cells.get(col, '')
                    if raw == '':
                        continue
                    value = float(raw)
                    if math.isfinite(value) and value > 0:
                        values[hour, minute] = value
                levels = []
                for hour in range(5, 26):
                    for minute in (0, 30):
                        value = values.get((hour, minute))
                        levels.append(str(4 if value is None else sum(value >= limit for limit in THRESHOLDS)))
                data.setdefault(key, ['4' * 42] * 6)[index] = ''.join(levels)
    if not data:
        raise ValueError('Empty dataset')
    return {'sourceDate': source_date, 'hours': [5, 25], 'slotsPerHour': 2, 'data': {k: ''.join(v) for k, v in sorted(data.items())}, 'thresholds': THRESHOLDS}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('xlsx', type=Path)
    parser.add_argument('--date', required=True, help='Published source date, YYYY-MM-DD')
    parser.add_argument('--out', type=Path, default=Path('app/data/timetable-crowding.json'))
    args = parser.parse_args()
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', args.date):
        parser.error('Use YYYY-MM-DD for --date')
    result = convert(args.xlsx, args.date)
    args.out.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(result["data"])} station/line codes: {args.out}')
