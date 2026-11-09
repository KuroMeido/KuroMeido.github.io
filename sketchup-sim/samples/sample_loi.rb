# encoding: UTF-8
# pyKuro CAD -> SketchUp | mau_loi.dwg | 2026-11-09 09:00
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
  root.name = 'pyKuro - mau_loi.dwg'

  # Lô đất (lỗi hình học) <- LO DAT
  PyKuroCad2Su.layer(root, 'QH_LODAT', [255, 242, 204], [[0, 300]], [
    [[0,0,20000,0,20000,15000,0,15000], [], nil],
    [[25000,0,45000,15000,45000,0,25000,15000], [], nil],
    [[50000,0,60000,0,70000,0], [], nil],
    [[0,20000,20000,20000], [], nil],
    [[25000,20000,45000,20000,45000,35000,25000,35000], [[50000,22000,55000,22000,55000,26000,50000,26000]], nil],
  ])

  # Nhà (top thấp hơn đáy) <- NHA
  PyKuroCad2Su.layer(root, 'QH_NHA', [242, 242, 242], [[300, 11100]], [
    [[2000,2000,10000,2000,10000,10000,2000,10000], [], 0],
    [[12000,2000,12000,2000,12000,10000,12000,10000], [], nil],
  ])

  model.commit_operation
  model.active_view.zoom_extents
  puts "pyKuro: done (#{PyKuroCad2Su.count} objects, #{PyKuroCad2Su.errors} skipped)"
rescue StandardError => e
  model.abort_operation
  puts "pyKuro: failed - #{e.message}"
  raise
end
