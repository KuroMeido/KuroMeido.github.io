# -*- coding: utf-8 -*-
"""
Builds the sample .rb files for the SketchUp preview page, in exactly the format SketchUpRubyWriter.cs writes
(the Ruby helper library is read from that C# file so the samples stay in sync with the exporter).

    python sketchup-sim/make_sample.py <path to pyKuro_CAD_Command>/pyKuro_CAD_Command/Utils/Civil/CadToSketchUp/SketchUpRubyWriter.cs

Writes samples/sample_quyhoach.rb (a clean planning block), samples/sample_loi.rb (with deliberate faults the page
must report) and samples/samples.js (also embedding samples/sample_nga4.rb, written by the C# tests) (the same texts, so the "Mở file mẫu" buttons work when index.html is opened
straight from disk).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WRITER = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    HERE, '..', '..', 'pyKuro_CAD_Command', 'pyKuro_CAD_Command', 'Utils', 'Civil', 'CadToSketchUp', 'SketchUpRubyWriter.cs')


def library():
    src = open(WRITER, encoding='utf-8-sig').read()
    m = re.search(r'Library = @"(.*?)";\s*\n', src, re.S)
    return m.group(1).replace('""', '"').replace('\r\n', '\n')


def n(v):  # C#: Math.Round(v, 1).ToString("0.#")
    v = round(v, 1)
    s = ('%.1f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def s(t):
    return "'" + t.replace('\\', '\\\\').replace("'", "\\'") + "'"


def ring(pts):
    return '[' + ','.join(n(x) + ',' + n(y) for x, y in pts) + ']'


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def write(name, layers):
    out = ['# encoding: UTF-8',
           '# pyKuro CAD -> SketchUp | %s | 2026-11-09 09:00' % name,
           "# SketchUp: Extensions > Developer > Ruby Console, then type:  load 'path/to/this_file.rb'",
           '# Re-running the script adds a new copy of the model (Undo removes it in one step).',
           '']
    text = '\n'.join(out) + '\n' + library() + '\n'
    out = ['model = Sketchup.active_model',
           "model.start_operation('pyKuro CAD to SketchUp', true)",
           'begin',
           '  PyKuroCad2Su.reset',
           '  root = model.active_entities.add_group',
           '  root.name = %s' % s('pyKuro - ' + name)]
    for L in layers:
        out.append('')
        out.append('  # %s <- %s' % (L['display'], ', '.join(L['src'])))
        r, g, b = L['rgb']
        if 'trees' in L:
            z0, z1 = L['bands'][0]
            out.append('  PyKuroCad2Su.trees(root, %s, [%d, %d, %d], %s, %s, [%s])' % (
                s(L['tag']), r, g, b, n(z0), n(max(z1 - z0, 1000)),
                ','.join('%s,%s,%s' % (n(x), n(y), n(rad)) for x, y, rad in L['trees'])))
            continue
        out.append('  PyKuroCad2Su.layer(root, %s, [%d, %d, %d], [%s], [' % (
            s(L['tag']), r, g, b, ', '.join('[%s, %s]' % (n(a), n(c)) for a, c in L['bands'])))
        for sh in L['shapes']:
            top = 'nil'
            if sh.get('floors'):
                top = n(L['bands'][-1][0] + sh['floors'] * L['floor_h'])
            out.append('    [%s, [%s], %s],' % (ring(sh['outer']), ', '.join(ring(h) for h in sh.get('holes', [])), top))
        out.append('  ])')
    out += ['',
            '  model.commit_operation',
            '  model.active_view.zoom_extents',
            '  puts "pyKuro: done (#{PyKuroCad2Su.count} objects, #{PyKuroCad2Su.errors} skipped)"',
            'rescue StandardError => e',
            '  model.abort_operation',
            '  puts "pyKuro: failed - #{e.message}"',
            '  raise',
            'end']
    return text + '\n'.join(out) + '\n'


def planning_block():
    """2 x 3 blocks of 70 x 45 m, 16 m roads (10 m carriageway + 3 m sidewalks), a lake with an island, trees."""
    BW, BH, ROAD, WALK = 70000, 45000, 10000, 3000
    cols, rows = 3, 2
    pitch_x, pitch_y = BW + ROAD + 2 * WALK, BH + ROAD + 2 * WALK
    W, H = cols * pitch_x + ROAD, rows * pitch_y + ROAD
    blocks, walks, lots, houses, trees = [], [], [], [], []
    uses = [['LOT_RES', 'LOT_GREEN', 'LOT_RES'], ['LOT_EDU', 'LOT_RES', 'LOT_COMMERCIAL']]
    by_use = {}
    for j in range(rows):
        for i in range(cols):
            x0 = ROAD + i * pitch_x
            y0 = ROAD + j * pitch_y
            outer = rect(x0, y0, x0 + BW + 2 * WALK, y0 + BH + 2 * WALK)
            inner = rect(x0 + WALK, y0 + WALK, x0 + WALK + BW, y0 + WALK + BH)
            blocks.append(outer)
            walks.append({'outer': outer, 'holes': [inner]})
            use = uses[j][i]
            lx0, ly0 = x0 + WALK, y0 + WALK
            if use == 'LOT_RES':
                # row houses: 2 rows of 10 lots 7 x 20 m (+ 5 m inner lane), 3..5 floors
                for row in range(2):
                    for k in range(10):
                        a = lx0 + k * 7000
                        b = ly0 + row * 25000
                        by_use.setdefault(use, []).append({'outer': rect(a, b, a + 7000, b + 20000)})
                        fl = 3 + (k + row) % 3
                        houses.append({'outer': rect(a + 500, b + 2000 if row == 0 else b + 4000,
                                                     a + 6500, b + 16000 if row == 0 else b + 18000), 'floors': fl})
            elif use == 'LOT_GREEN':
                by_use.setdefault(use, []).append({'outer': rect(lx0, ly0, lx0 + BW, ly0 + BH)})
            else:
                by_use.setdefault(use, []).append({'outer': rect(lx0, ly0, lx0 + BW, ly0 + BH)})
                houses.append({'outer': [(lx0 + 10000, ly0 + 10000), (lx0 + 45000, ly0 + 10000), (lx0 + 45000, ly0 + 20000),
                                         (lx0 + 25000, ly0 + 20000), (lx0 + 25000, ly0 + 35000), (lx0 + 10000, ly0 + 35000)],
                               'floors': 4 if use == 'LOT_EDU' else 9})
            # street trees every 8 m along the sidewalk
            for t in range(4, BW + 2 * WALK - 2000, 8000):
                trees.append((x0 + t, y0 + 1500, 2000))
                trees.append((x0 + t, y0 + BH + 2 * WALK - 1500, 2000 if t % 16000 else 3000))
    # the park block gets a lake with an island and some trees
    gx0, gy0 = ROAD + pitch_x + WALK, ROAD + WALK
    lake = [(gx0 + 15000, gy0 + 10000), (gx0 + 40000, gy0 + 8000), (gx0 + 55000, gy0 + 18000),
            (gx0 + 48000, gy0 + 34000), (gx0 + 25000, gy0 + 36000), (gx0 + 12000, gy0 + 24000)]
    island = rect(gx0 + 28000, gy0 + 18000, gx0 + 36000, gy0 + 24000)
    for k in range(6):
        trees.append((gx0 + 5000 + k * 11000, gy0 + 41000, 4000))
    road = {'outer': rect(0, 0, W, H), 'holes': blocks}

    def L(code, display, tag, bands, rgb, src, **kw):
        d = {'display': display, 'tag': tag, 'bands': bands, 'rgb': rgb, 'src': src}
        d.update(kw)
        return d

    return [
        L('ROAD', 'Đường (lòng đường)', 'QH_DUONG', [(0, 0)], (127, 127, 127), ['GT_LONG DUONG'], shapes=[road]),
        L('SIDEWALK', 'Vỉa hè', 'QH_VIAHE', [(0, 150)], (217, 217, 217), ['GT_VIA HE'], shapes=walks),
        L('LOT_RES', 'Đất ở', 'QH_DAT_O', [(0, 300)], (255, 217, 102), ['QH-DAT O LIEN KE'], shapes=by_use['LOT_RES']),
        L('LOT_GREEN', 'Đất cây xanh', 'QH_DAT_CAYXANH', [(0, 300)], (146, 208, 80), ['QH-CXCC'],
          shapes=[{'outer': by_use['LOT_GREEN'][0]['outer'], 'holes': [lake]}, {'outer': island}]),
        L('LOT_EDU', 'Đất giáo dục', 'QH_DAT_GIAODUC', [(0, 300)], (255, 153, 204), ['QH-TRUONG MAM NON'], shapes=by_use['LOT_EDU']),
        L('LOT_COMMERCIAL', 'Đất thương mại dịch vụ', 'QH_DAT_TMDV', [(0, 300)], (204, 102, 255), ['QH-TMDV'],
          shapes=by_use['LOT_COMMERCIAL']),
        L('WATER', 'Mặt nước', 'QH_MATNUOC', [(-500, -500)], (157, 195, 230), ['HO DIEU HOA'],
          shapes=[{'outer': lake, 'holes': [island]}]),
        L('BUILDING', 'Nhà điển hình (block)', 'QH_NHA', [(300, 11100)], (242, 242, 242), ['KHOI NHA', 'BLOCK LK'],
          shapes=houses, floor_h=3600),
        L('TREE', 'Cây xanh vỉa hè', 'QH_CAYXANH_VIAHE', [(300, 6000)], (84, 130, 53), ['CAY XANH'], trees=trees),
    ]


def faulty():
    """Small file with the faults the page must catch."""
    return [
        {'display': 'Lô đất (lỗi hình học)', 'tag': 'QH_LODAT', 'bands': [(0, 300)], 'rgb': (255, 242, 204), 'src': ['LO DAT'],
         'shapes': [
             {'outer': rect(0, 0, 20000, 15000)},                                        # ok
             {'outer': [(25000, 0), (45000, 15000), (45000, 0), (25000, 15000)]},       # self-intersecting (bow tie)
             {'outer': [(50000, 0), (60000, 0), (70000, 0)]},                            # collinear: no face
             {'outer': [(0, 20000), (20000, 20000)]},                                    # 2 points
             {'outer': rect(25000, 20000, 45000, 35000), 'holes': [rect(50000, 22000, 55000, 26000)]},  # hole outside
         ]},
        {'display': 'Nhà (top thấp hơn đáy)', 'tag': 'QH_NHA', 'bands': [(300, 11100)], 'rgb': (242, 242, 242), 'src': ['NHA'],
         'floor_h': -100,
         'shapes': [{'outer': rect(2000, 2000, 10000, 10000), 'floors': 3},
                    {'outer': rect(12000, 2000, 12000.04, 10000)}]},                     # 0.04 mm wide sliver
    ]


def main():
    os.makedirs(os.path.join(HERE, 'samples'), exist_ok=True)
    files = {
        'sample_quyhoach.rb': write('mau_quy_hoach.dwg', planning_block()),
        'sample_loi.rb': write('mau_loi.dwg', faulty()),
    }
    for name, text in files.items():
        with open(os.path.join(HERE, 'samples', name), 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
    # sample_nga4.rb (4-way intersection with fillets and chamfers) is written by the real exporter, from the C# tests:
    #   dotnet run --project <pyKuro_CAD_Command>/pyKuro_CAD_Command.Tests -- --write-rb sketchup-sim/samples/sample_nga4.rb
    nga4 = os.path.join(HERE, 'samples', 'sample_nga4.rb')
    if os.path.exists(nga4):
        files['sample_nga4.rb'] = open(nga4, encoding='utf-8').read()
    with open(os.path.join(HERE, 'samples', 'samples.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Generated by make_sample.py - the sample .rb files as strings, so they load from file:// too.\n')
        f.write('window.PYKURO_SAMPLES = ' + json.dumps(files, ensure_ascii=False, indent=0) + ';\n')
    print('written:', ', '.join(files))


if __name__ == '__main__':
    main()
