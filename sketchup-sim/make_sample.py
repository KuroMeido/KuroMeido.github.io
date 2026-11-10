# -*- coding: utf-8 -*-
"""
Builds the sample .rb files for the SketchUp preview page, in exactly the format SketchUpRubyWriter.cs writes
(the Ruby helper library is read from that C# file so the samples stay in sync with the exporter).

    python sketchup-sim/make_sample.py <path to pyKuro_CAD_Command>/pyKuro_CAD_Command/Utils/Civil/CadToSketchUp/SketchUpRubyWriter.cs

Writes samples/sample_loi.rb (with deliberate faults the page must report) and samples/samples.js, which also embeds
the samples written by the real exporter from the C# tests: sample_quyhoach.rb (planning blocks, filleted curbs,
chamfered lots, centre lines, crosswalks, park), sample_nga4.rb (4-way intersection), sample_thuc.rb (samples/sample.dxf)
and sample_ranh.rb (a masterplan traced roughly from a site plan: irregular site on a river, diagonal roads). The same texts, so the
sample buttons work when index.html is opened straight from disk.
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
        'sample_loi.rb': write('mau_loi.dwg', faulty()),
    }
    for name, text in files.items():
        with open(os.path.join(HERE, 'samples', name), 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
    # written by the real exporter, from the C# tests (curb fillets, sidewalk / lot chamfers, sample.dxf):
    #   dotnet run --project <pyKuro_CAD_Command>/pyKuro_CAD_Command.Tests -- --write-rb sketchup-sim/samples/sample_nga4.rb
    #       --write-planning-rb sketchup-sim/samples/sample_quyhoach.rb --write-real-rb sketchup-sim/samples/sample_thuc.rb
    #       --write-masterplan-rb sketchup-sim/samples/sample_ranh.rb
    for name in ('sample_quyhoach.rb', 'sample_nga4.rb', 'sample_thuc.rb', 'sample_ranh.rb'):
        path = os.path.join(HERE, 'samples', name)
        if os.path.exists(path):
            files[name] = open(path, encoding='utf-8').read()
    with open(os.path.join(HERE, 'samples', 'samples.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Generated by make_sample.py - the sample .rb files as strings, so they load from file:// too.\n')
        f.write('window.PYKURO_SAMPLES = ' + json.dumps(files, ensure_ascii=False, indent=0) + ';\n')
    print('written:', ', '.join(files))


if __name__ == '__main__':
    main()
