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
      generate_midi: true,
      midi_id:"midi",
      midi_download_id: "midi-download",
      generate_warnings: true,
      warnings_id:"warnings",
      abcjsParams: {
        generateDownload: true,
        clickListener: selectionCallback,
        responsive: "resize",
      },
      midi_options: {
        generateDownload: true
      },
    });
}

function generateMelodicStructures(data) {
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

    matchArr = chord.match(/^[IV_m#]+/)
    const baseChord = matchArr ? matchArr[0] : ""

    matchArr = baseChord.match(/^[_IV]+/)
    const baseNumber = matchArr ? matchArr[0] : ""

    let isMinor = false

    if (baseChord) {
      matchArr = baseChord.match(/m/)
      isMinor = matchArr ? !!matchArr[0] : false
    }

    return [chord, baseNumber, isMinor]
  }

  function getNumberToNote(key, number) {
    const numberArr = ["I", "_II", "II", "_III", "III","IV", "_V", "V", "_VI", "VI", "_VII", "VII"]
    return getChromatic(key)[numberArr.indexOf(number)]
  }

  function checkAltNote(chord) {
    const altNoteList = ['b9', 'b5']
    const arr = chord.match(/[b59]+$/)
    if (!arr) {
      return []
    }

    const altnoteArr = []
    for (const n of altNoteList) {
      if (arr[0].indexOf(n) !== -1) {
        altnoteArr.push(n)
      }
    }
    return altnoteArr
  }

  function convShapeInterval(shape, note) {
    const intervals = {
      b9: [3, 2],
      b5: [8, 7],
    }

    const interval = intervals[note]

    if (!interval) {
      return shape
    }
    const _shape = shape.slice()

    for (let i = 0; i < _shape.length; i++) {
      if (_shape[i] === interval[0]) {
        _shape[i] = interval[1]
      }
    }
    return _shape
  }
  function getABCString(data) {
    // Accidental is flat only
    const all_keys = [ "C", "_D", "D", "_E", "E", "F", "_G", "G", "_A", "A", "_B"]
    let key = shuffleArray(all_keys)[0]
    if (key.startsWith("_")) {
      key = key.replace("_", "") + "b"
    }
    // const key = "Db"  // debug
    const header = `T: ${data.title}
M:4/4
Q:${data.tempo}
C:${data.composer}
K:${key}
`
    let chordData = []
    let _beforeChord = ''
    for (let chord of data.progression) {
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
    for (const [chord, baseNumber, isMinor] of chordData) {
      beatCount += 1

      let _key = key
      if (_key.indexOf("b") !== -1) {
        _key = "_" + _key.replace("b", "")
      }
      const note = getNumberToNote(_key, baseNumber)

      // add display chord
      if (beatCount % 2 === 1 || (beatCount % 2 === 0 && _beforeChord !== chord)) {
        console.assert(note !== undefined, `note is undefined:${_key},${baseNumber}`)

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
      let shape = [1, 3, 5, 8]  // 1, 2, 3, 5
      if (isMinor) {
        shape = [1, 4, 6, 8]  // 1, b3, 4, 5
      }

      for (const n of checkAltNote(chord)) {
        shape = convShapeInterval(shape, n)
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

  return getABCString(data)
}

function setMelodicStructure(chordProgressions) {
  const initSong = document.getElementById("songs").value
  const abcEl = document.getElementById("abc");
  abcEl.value = generateMelodicStructures(chordProgressions[initSong])
}

function main() {
  const chordProgressions = {
    lady_duck:{
      title: "Lady Duck",
      tempo: "1/4=120",
      composer: "Jerry Bergonzi",
      progression: [
        'I∆7', ':', 'I∆7', ':', 'IVm7', ':', '_VII7', ':',
        'I∆7', ':', 'I∆7', ':', '_VIIm7', ':', '_III7', ':',
        '_VI∆7', ':', '_VI∆7', ':', 'VIm7', ':', 'II7', ':',
        'IIm7', ':', 'V7', ':', 'I∆7', '_III∆7', '_VI∆7', 'IIb∆7',
      ]
    },
    on_the_brink:{
      title: "On the Brink",
      tempo: "1/4=120",
      composer: "Jerry Bergonzi",
      progression: [
        'I∆7', ':', 'VIIm7b5', 'III7b9', 'VIm7', 'II7', 'Vm7', 'I7',
        'IV7', ':', 'IIIm7b5', 'VI7b9', 'II7', ':', 'IIm7', 'V7',
        'I∆7', ':', 'VIIm7b5', 'III7b9', 'VIm7', 'II7', 'Vm7', 'I7',
        'IV7', ':', 'IIIm7b5', 'VI7b9', 'II7', 'V7', 'I∆7', ':',
        'Vm7', ':', 'I7', ':', 'IV∆7', ':', 'IV∆7', ':',
        '_VIIm7', ':', '_III7', ':', '_VI∆7', ':', 'IIm7', 'V7',
        'I∆7', ':', 'VIIm7b5', 'III7b9', 'VIm7', 'II7', 'Vm7', 'I7',
        'IV7', ':', 'IIIm7b5', 'VI7b9', 'II7', 'V7', 'I∆7', ':',
      ]
    },
    example4:{
      title: "example4",
      tempo: "1/4=120",
      composer: "Jerry Bergonzi",
      progression: [
        'I∆7', ':', 'VIIm7b5', 'III7b9', 'VIm7', 'II7', 'Vm7', 'I7',
        'IV7', ':', 'IIIm7b5', 'VI7b9', 'II7', ':', 'IIm7', 'V7',
      ]
    },
  }

  let cpArr = []
  for (const k of Object.keys(chordProgressions)) {
    cpArr.push(`<option value="${k}">${chordProgressions[k].title}</option>`)
  }
  document.getElementById('songs').innerHTML = cpArr.join('\n')

  setMelodicStructure(chordProgressions)

  document.getElementById('generate').addEventListener('click', function(){
    setMelodicStructure(chordProgressions)
    const abcEl = document.getElementById("abc");
    abcEl.onchange()
  }, false);


  const abcEl = document.getElementById("abc");
  const songsEl = document.getElementById('songs')
  songsEl.addEventListener('change', (e) => {
    abcEl.value = generateMelodicStructures(chordProgressions[e.target.value])
    abcEl.onchange()
  });

  initEditor()
}

window.addEventListener("load", main, false);
