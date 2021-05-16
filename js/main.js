/*global ABCJS*/
function selectionCallback(abcelem) {
  var note = {};
  for (const key in abcelem) {
    if (abcelem.hasOwnProperty(key) && key !== "abselem")
      note[key] = abcelem[key];
  }
  console.log(abcelem);
  const el = document.getElementById("selection");
  el.innerHTML = "<b>selectionCallback parameter:</b><br>" + JSON.stringify(note);
}

function initEditor() {
  new ABCJS.Editor(
    "abc", {
      paper_id: "paper0",
      synth: {
        el: "#audio",
        options: {
          displayLoop: true,
          displayRestart: true,
          displayPlay: true,
          displayProgress: true,
          displayWarp: true,
        }
      },
      generate_warnings: true,
      warnings_id:"warnings",
      abcjsParams: {
        generateDownload: true,
        clickListener: selectionCallback,
        responsive: "resize",
      }
    });
}

function generateMelodicStructures() {

  const CHORD_PROGRESSIONS = {
    Lady_Duck: [
      'I∆7', ':', 'I∆7', ':', 'IVm7', ':', 'VIIb7', ':',
      'I∆7', ':', 'I∆7', ':', 'VIIbm7', ':', 'IIIb7', ':',
      'VIb∆7', ':', 'VIb∆7', ':', 'VIm7', ':', 'II7', ':',
      'IIm7', ':', 'V7', ':', 'I∆7', 'IIIb∆7', 'VIb∆7', 'IIb∆7',
    ]
  }

  function getAllNotes(key) {
    const sharpNoteKeys = ["G", "D", "A", "E", "B", "^F"]
    const all_notes = [ "C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B", "B", "c", "_d", "d", "_e", "e", "f", "_g", "g", "_a", "a", "_b", "b", "c'", "_d'", "d'", "_e'", "e'", "f'", "_g'", "g'", "_a'", "a'", "_b'", "b'"]
    const all_notes_for_sharp = [ "C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B", "c", "^c", "d", "^d", "e", "f", "^f", "g", "^g", "a", "^a", "b", "c'", "^c'", "d'", "^d'", "e'", "f'", "^f'", "g'", "^g'", "a'", "^a'", "b'"]

    let notes = all_notes
    if (sharpNoteKeys.includes(key) || key.indexOf("^") !== -1) {
      notes = all_notes_for_sharp
    }

    return notes
  }

  function shuffleArray(arr) {
    const array = arr.slice()
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array
  }
  function getChromatic(key) {
    let notes  = getAllNotes(key)
    const index = notes.indexOf(key)
    return notes.slice(index).concat(notes.slice(0, index))
  }

  function splitChord(chord) {
    let matchArr = []

    matchArr = chord.match(/^[IVbm]+/)
    const baseChord = matchArr ? matchArr[0] : ""

    matchArr = baseChord.match(/^[IV]+/)
    const baseNumber = matchArr ? matchArr[0] : ""

    let isMinor = false
    let isFlat = false

    if (baseChord) {
      matchArr = baseChord.match(/b/)
      isFlat = matchArr ? !!matchArr[0] : false

      matchArr = baseChord.match(/m/)
      isMinor = matchArr ? !!matchArr[0] : false
    }

    return [chord, baseNumber, isFlat, isMinor]
  }

  function getNumberToNote(key, number, isFlat) {
    if (isFlat) {
      number = `_${number}`
    }
    const numberArr = ["I", "_II", "II", "_III", "III","IV", "_V", "V", "_VI", "VI", "_VII", "VII"]
    return getChromatic(key)[numberArr.indexOf(number)]
  }

  function getABCString() {
    // Accidental is flat only
    const all_keys = [ "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb"]
    const key = shuffleArray(all_keys)[0]
    // const key = "Db"  // debug
    const title = 'Lady_Duck'
    const chordProgression = CHORD_PROGRESSIONS[title]
    const header = `T: ${title.replace("_", " ")}
M: 4/4
Q:1/4=120
C:Jerry Bergonzi
K: ${key}
`
    let chordData = []
    let _beforeChord = ''
    for (let chord of chordProgression) {
      if (chord === '') {
        chordData.push([])
        continue
      }
      // when repeat
      if (chord === ':') {
        chord = _beforeChord
      }
      chordData.push(splitChord(chord))
      _beforeChord = chord
    }

    let barArr = ['|:']
    let beatCount = 0
    _beforeChord = ''
    for (const [chord, baseNumber, isFlat, isMinor] of chordData) {
      beatCount += 1

      let _key = key
      if (_key.indexOf("b") !== -1) {
        _key = "_" + _key.replace("b", "")
      }
      const note = getNumberToNote(_key, baseNumber, isFlat)

      // add display chord
      if (beatCount % 2 === 1 || (beatCount % 2 === 0 && _beforeChord !== chord)) {
        let _note = note.toUpperCase()
        _note = _note.replace("'", "")
        if (_note.indexOf("_") !== -1) {
          _note = _note.replace("_", "") + "b"
        }
        if (_note.indexOf("^") !== -1) {
          _note = _note.replace("^", "") + "#"
        }
        barArr.push(`"${chord.replace(baseNumber, _note)}"`)
      }

      // add shape
      // TODO: b2, b5
      // TODO: inversion of shape
      let shape = [1, 3, 5, 8]  // 1, 2, 3, 5
      if (isMinor) {
        shape = [1, 4, 6, 8]  // 1, b3, 4, 5
      }

      shape = shuffleArray(shape)

      const scale = getChromatic(note)

      for (const i of shape) {
        barArr.push(scale[i - 1])
      }

      // add separator
      if (beatCount % 2 === 0) {
        barArr.push("|")
      } else {
        barArr.push(" ")
      }

      const every_a_bars_num = 8
      if ((every_a_bars_num - 1) < beatCount) {
        barArr.push("\n")
        beatCount = 0
      }

      _beforeChord = chord
    }

    // delete `|\n` of last
    barArr = barArr.slice(0, -2)
    barArr.push(":|\n")

    const abcStr = header + barArr.join('')
    return abcStr
  }

  return getABCString()
}

function main() {
  const abcEl = document.getElementById("abc");
  abcEl.value = generateMelodicStructures()

  initEditor()
}

window.addEventListener("load", main, false);
