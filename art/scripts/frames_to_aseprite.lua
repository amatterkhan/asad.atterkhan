-- Builds an .aseprite animation from numbered PNG frames (00.png, 01.png, ...).
-- aseprite -b --script-param dir=<frames dir> --script-param out=<file.aseprite> \
--          --script-param ms=<frame ms> [--script-param durations=<ms,ms,...>] --script frames_to_aseprite.lua
-- durations, when given, sets each frame's own time (a held pose); otherwise every frame gets ms.
local dir, out, ms = app.params["dir"], app.params["out"], tonumber(app.params["ms"] or "120")
local durations = {}
for d in string.gmatch(app.params["durations"] or "", "[^,]+") do durations[#durations + 1] = tonumber(d) end
local frames = {}
local i = 0
while true do
  local path = string.format("%s/%02d.png", dir, i)
  if not app.fs.isFile(path) then break end
  frames[#frames + 1] = path
  i = i + 1
end
assert(#frames > 0, "no frames in " .. dir)
local first = Image{ fromFile = frames[1] }
local spr = Sprite(first.width, first.height, ColorMode.RGB)
spr.layers[1].name = "frames"
for f = 2, #frames do spr:newEmptyFrame() end
for f, path in ipairs(frames) do
  spr:newCel(spr.layers[1], f, Image{ fromFile = path }, Point(0, 0))
  spr.frames[f].duration = (durations[f] or ms) / 1000
end
spr:saveAs(out)
print("built " .. out .. " with " .. #frames .. " frames")
