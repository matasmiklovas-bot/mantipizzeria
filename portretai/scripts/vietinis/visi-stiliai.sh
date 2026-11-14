#!/bin/bash
# One photo -> portraits in all three styles and their posters.
#   scripts/vietinis/visi-stiliai.sh nuotrauka.jpg isnet-general-use.onnx "Vardas" isvestis/ [cx,cy,rx,ry ...]
# The last optional arguments are ellipses to paint over (e.g. a collar).
set -euo pipefail
photo=$1; model=$2; name=$3; out=$4; shift 4
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
mkdir -p "$out"
python3 "$here/iskirpti.py" "$photo" "$model" "$out/kauke.png" > /dev/null
crop=$(python3 "$here/iskarpa.py" "$out/kauke.png")   # stops the script if no animal was found
read -r x0 y0 cw <<< "$crop"
echo "Iškarpa: $x0 $y0 $cw"
python3 "$here/tapyba.py"   "$photo" "$out/kauke.png" "$out/aliejus.png"  "$x0" "$y0" "$cw" "$@" > /dev/null
python3 "$here/akvarele.py" "$photo" "$out/kauke.png" "$out/akvarele.png" "$x0" "$y0" "$cw" "$@"
python3 "$here/grafika.py"  "$photo" "$out/kauke.png" "$out/grafika.png"  "$x0" "$y0" "$cw" "$@"
for s in aliejus akvarele grafika; do
  node "$root/bin/portretas.js" kurti --nuotrauka "$photo" --paruostas-portretas "$out/$s.png" \
    --vardas "$name" --stilius "$s" --dydis 30x40 --isvestis "$out" --ignoruoti-patikra | grep -E "BLOGAI|ĮSPĖJ" || true
done
echo "Paruošta: $out"
