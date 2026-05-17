// LibreSprite JS — exports the currently-active sprite as a horizontal
// sprite sheet, then writes it to the given output path.
//
// Invoke via:
//   LibreSprite --batch <input.aseprite> --script libresprite_export.js \
//               --sheet <output.png> --sheet-type horizontal \
//               --data <output.json> --format json-array
//
// This script is mostly a marker — LibreSprite's CLI already does the
// export when you pass --sheet / --data, but the script can run extra
// transforms first (e.g. recolor cels, duplicate frames). Keep this
// file as the hook point for those transforms.

console.log("libresprite_export.js: sprite-sheet export hook");
// Future: per-frame transforms here (e.g. tier-recolor cels before
// the CLI dumps the sheet).
