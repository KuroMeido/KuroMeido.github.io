# encoding: UTF-8
# pyKuro CAD -> SketchUp | nga4_mau.dwg | 2026-11-09 16:02
# SketchUp: Extensions > Developer > Ruby Console, then type:  load 'path/to/this_file.rb'
# Re-running the script adds a new copy of the model (Undo removes it in one step).

module PyKuroCad2Su
  def self.reset
    @errors = 0
    @count = 0
  end

  def self.errors; @errors; end
  def self.count; @count; end

  # flat [x0, y0, x1, y1, ...] in mm -> points at height z (mm)
  def self.pts(a, z)
    list = []
    i = 0
    while i < a.length
      list << Geom::Point3d.new(a[i].mm, a[i + 1].mm, z.mm)
      i += 2
    end
    list
  end

  def self.material(model, name, rgb)
    m = model.materials[name] || model.materials.add(name)
    m.color = Sketchup::Color.new(rgb[0], rgb[1], rgb[2])
    m
  end

  # one closed outline (with holes) pushed from z0 to z1 (mm); z0 == z1 gives a flat face
  def self.solid(ents, outer, holes, z0, z1, tag, mat)
    g = ents.add_group
    ge = g.entities
    face = ge.add_face(pts(outer, z0))
    holes.each do |h|
      begin
        hf = ge.add_face(pts(h, z0))
        hf.erase! if hf && hf.valid? && hf != face
      rescue StandardError
        nil
      end
    end
    face = ge.grep(Sketchup::Face).max_by(&:area)
    raise 'no face' unless face
    face.reverse! if face.normal.z < 0
    face.pushpull((z1 - z0).mm) if z1 - z0 > 0.5
    g.layer = tag
    g.material = mat
    @count += 1
    g
  rescue StandardError
    @errors += 1
    g.erase! if g && g.valid?
    nil
  end

  # shapes: [[outer, [holes], top_or_nil], ...]; top (mm) replaces the top of the last band (houses by floors)
  def self.layer(root, tag_name, rgb, bands, shapes)
    model = Sketchup.active_model
    tag = model.layers.add(tag_name)
    mat = material(model, tag_name, rgb)
    g = root.entities.add_group
    g.name = tag_name
    g.layer = tag
    shapes.each do |outer, holes, top|
      bands.each_with_index do |band, i|
        z0, z1 = band
        z1 = top if top && i == bands.length - 1
        solid(g.entities, outer, holes, z0, z1, tag, mat)
      end
    end
    g
  end

  # simple tree: trunk + round crown, total height h (mm), crown radius r (mm); one definition per size
  def self.tree_def(model, r, h, crown, trunk)
    key = format('pyKuro Tree R%d H%d', r.round, h.round)
    d = model.definitions[key]
    return d if d
    d = model.definitions.add(key)
    e = d.entities
    trunk_h = [h - 1.6 * r, h * 0.3].max
    tg = e.add_group
    f = tg.entities.add_face(tg.entities.add_circle(ORIGIN, Z_AXIS, [r * 0.1, 80.0].max.mm, 8))
    f.reverse! if f.normal.z < 0
    f.pushpull(trunk_h.mm)
    tg.material = trunk
    cg = e.add_group
    c = Geom::Point3d.new(0, 0, (h - r).mm)
    begin
      path = cg.entities.add_circle(c, Z_AXIS, r.mm, 16)
      prof = cg.entities.add_face(cg.entities.add_circle(c, X_AXIS, r.mm, 16))
      prof.followme(path)
      cg.entities.grep(Sketchup::Edge).each do |ed|
        if ed.faces.empty?
          ed.erase!
        elsif ed.faces.length == 2
          ed.soft = true
          ed.smooth = true
        end
      end
    rescue StandardError
      cg.entities.clear!
      f2 = cg.entities.add_face(cg.entities.add_circle(Geom::Point3d.new(0, 0, trunk_h.mm), Z_AXIS, r.mm, 12))
      f2.reverse! if f2.normal.z < 0
      f2.pushpull((h - trunk_h).mm)
    end
    cg.material = crown
    d
  end

  # list: flat [x, y, r, ...] (mm); trees stand at z0, height h
  def self.trees(root, tag_name, rgb, z0, h, list)
    model = Sketchup.active_model
    tag = model.layers.add(tag_name)
    crown = material(model, tag_name, rgb)
    trunk = material(model, 'pyKuro Tree Trunk', [110, 80, 50])
    g = root.entities.add_group
    g.name = tag_name
    g.layer = tag
    i = 0
    while i < list.length
      r = [(list[i + 2] / 250.0).round * 250.0, 250.0].max
      d = tree_def(model, r, [h, 2.2 * r].max, crown, trunk)
      inst = g.entities.add_instance(d, Geom::Transformation.new(Geom::Point3d.new(list[i].mm, list[i + 1].mm, z0.mm)))
      inst.layer = tag
      @count += 1
      i += 3
    end
    g
  end
end

model = Sketchup.active_model
model.start_operation('pyKuro CAD to SketchUp', true)
begin
  PyKuroCad2Su.reset
  root = model.active_entities.add_group
  root.name = 'pyKuro - nga4_mau.dwg'

  # Tim đường (vạch trắng) <- TIM DUONG
  PyKuroCad2Su.layer(root, 'QH_TIMDUONG', [255, 255, 255], [[0, 20]], [
    [[100075,0,100075,200000,99925,200000,99925,0], [], nil],
  ])

  # Đường (lòng đường) <- MEP DUONG
  PyKuroCad2Su.layer(root, 'QH_DUONG', [127, 127, 127], [[0, 0]], [
    [[94750,200000,94750,113250,94596.3,111689.3,94141,110188.5,93401.8,108805.4,92406.9,107593.1,91194.6,106598.2,89811.5,105859,88310.7,105403.7,86750,105250,0,105250,0,94750,86750,94750,88310.7,94596.3,89811.5,94141,91194.6,93401.8,92406.9,92406.9,93401.8,91194.6,94141,89811.5,94596.3,88310.7,94750,86750,94750,0,105250,0,105250,86750,105403.7,88310.7,105859,89811.5,106598.2,91194.6,107593.1,92406.9,108805.4,93401.8,110188.5,94141,111689.3,94596.3,113250,94750,200000,94750,200000,105250,113250,105250,111689.3,105403.7,110188.5,105859,108805.4,106598.2,107593.1,107593.1,106598.2,108805.4,105859,110188.5,105403.7,111689.3,105250,113250,105250,200000], [], nil],
  ])

  # Vỉa hè <- VIA HE
  PyKuroCad2Su.layer(root, 'QH_VIAHE', [217, 217, 217], [[0, 150]], [
    [[89750,200000,89750,113250,86750,110250,0,110250,0,105250,86750,105250,88310.7,105403.7,89811.5,105859,91194.6,106598.2,92406.9,107593.1,93401.8,108805.4,94141,110188.5,94596.3,111689.3,94750,113250,94750,200000], [], nil],
    [[110250,0,110250,86750,113250,89750,200000,89750,200000,94750,113250,94750,111689.3,94596.3,110188.5,94141,108805.4,93401.8,107593.1,92406.9,106598.2,91194.6,105859,89811.5,105403.7,88310.7,105250,86750,105250,0], [], nil],
    [[110250,200000,105250,200000,105250,113250,105403.7,111689.3,105859,110188.5,106598.2,108805.4,107593.1,107593.1,108805.4,106598.2,110188.5,105859,111689.3,105403.7,113250,105250,200000,105250,200000,110250,113250,110250,110250,113250], [], nil],
    [[89750,0,94750,0,94750,86750,94596.3,88310.7,94141,89811.5,93401.8,91194.6,92406.9,92406.9,91194.6,93401.8,89811.5,94141,88310.7,94596.3,86750,94750,0,94750,0,89750,86750,89750,89750,86750], [], nil],
  ])

  model.commit_operation
  model.active_view.zoom_extents
  puts "pyKuro: done (#{PyKuroCad2Su.count} objects, #{PyKuroCad2Su.errors} skipped)"
rescue StandardError => e
  model.abort_operation
  puts "pyKuro: failed - #{e.message}"
  raise
end
