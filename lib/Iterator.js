"use strict";
const et = require("elementtree");
const Concertmaster = require("./Concertmaster.js");

const createIterator = (partsBeatMap, keyMap) =>
{
  //private--------------------------------
  const errors =  
  {
    "noInstrument": "this instrument is not in the score: ",
    "noNext": "no next exists!",
    "noPrev": "no prev exists!",
    "measureNumber": "measure does not exist: "
  };
  
  const activeListeners = {}; 
  
  let measures = [];
  let measureNum = 0;
  let beatMap;
  let beatIndex = -1;

  const checkEventChange = () =>
  {
    Object.keys(activeListeners).forEach((instrumentName) => 
    {
      activeListeners[instrumentName].forEach((obj) =>
      {
        //user wants to know of key changes
        if (obj.musicalChange === "key")
        {
          const newKeyChange = keyMap[instrumentName].find((keyChange) =>
          {
            //jackpot
            return keyChange.measureNum === measureNum; 
          });

          if (newKeyChange !== undefined)
          {
            obj.response.call({}, newKeyChange.key);
          }
        }
      });
    });
  };
  //public:--------------------------------
  const iterator = {};
  
  iterator.setMusicalChangeListener = 
  (instrumentName, musicalChange, response) =>
  {
    if (instrumentName in activeListeners)
    {
      activeListeners[instrumentName]
        .push({"musicalChange": musicalChange, "response": response});
    }
    else
    {
      activeListeners[instrumentName] = []; 
      activeListeners[instrumentName]
        .push({"musicalChange": musicalChange, "response": response});
    }
  };

  iterator.getInstrumentNames = () =>
  {
    return Object.keys(partsBeatMap);
  };

  iterator.selectInstrument = (instrumentName) =>
  {
    if (instrumentName in partsBeatMap)
    {
      measures = partsBeatMap[instrumentName];
      beatMap = measures[0];
      beatIndex = -1;
      return true;
    }
    else
    {
     throw new Error(errors.noInstrument + instrumentName);
    }
  };

  iterator.setMeasureNum = (newMeasureNum) =>
  {
    if (newMeasureNum <= 0 || newMeasureNum >= measures.length)
    {
      throw new Error(errors.measureNum + newMeasureNum);
    }
    measureNum = newMeasureNum;
    beatMap = measures[measureNum];
    beatIndex = -1;
  };

  iterator.getMeasureNum = () =>
  {
   return (measureNum + 1);
  };

  iterator.getNumberOfMeasures = () =>
  {
    return measures.length;
  };

  iterator.nextMeasure = () =>
  { 
    if (measureNum === measures.length - 1)
    {
      throw new Error(errors.noNext);
    }
    beatMap = measures[++measureNum];
    beatIndex = 0;

    checkEventChange(); 
    return beatMap[0];
  };

  iterator.prevMeasure = () =>
  {
    if (measureNum === 0)
    {
      throw new Error(errors.noPrev);
    }
    beatMap = measures[--measureNum];
    beatIndex = 0;
    return beatMap[0];
  };

  iterator.next = () =>
  {
   if (beatIndex === beatMap.length - 1)
   {
    iterator.nextMeasure();
    return beatMap[beatIndex];
   }
   return beatMap[++beatIndex];
  };

  iterator.hasNext = () =>
  {
    return (beatIndex < beatMap.length - 1 
            ||  measureNum < measures.length - 1);
  };

  iterator.prev = () =>
  {
    if (beatIndex === 0)
    {
      iterator.prevMeasure();
      beatIndex = beatMap.length - 1;
      return beatMap[beatIndex];
    }
    return beatMap[--beatIndex];
  };

  iterator.hasPrev = () =>
  {
    return (beatIndex > 0 ||  measureNum > 0);
  };

  return Object.freeze(iterator);
};


//takes MusicXML string and creates objects for an Iterator instance
const constructor = (musicxml) =>
{
  const etree = et.parse(musicxml);
  const partNames = etree.findall(".//part-name")
                    .map((partName) => partName.text); 
  let partIndex = -1;

  //allPartsBeatMap--------------------------------------------------
  //{"Piano":[
  //[{"notes":[{"duration":2,"noteType":"half","pitch":"B4"}],"beat":1}
  const allPartsBeatMap = {};
 
  etree.findall(".//part").forEach((part) =>
  {
    partIndex++;
    let divisions;

    allPartsBeatMap[partNames[partIndex]] = 
    part.findall(".//measure").map((measure) => 
    {
      const beatMap = [];
      let currentBeat = 1;
        
      measure._children.forEach((child) => 
      {
        if (child.tag === "attributes")
        {
          //"For example, if duration = 1 and divisions = 2, 
          //this is an eighth note duration"
          let newDivisions = parseInt(child.findtext(".//divisions"));
          
          if (newDivisions > 0)
          {
            divisions = newDivisions;
          }
        }
        else if (child.tag === "note")
        {
          //single note stuff
          const symbol = {notes:[]}; //a note or a rest
          const currentNote = {};

          symbol.beat = Math.ceil((currentBeat / divisions));

          if (!(currentBeat % divisions) === 1) //not on downbeat
          {
            symbol.beat += (currentBeat % divisions) / divisions;
          }

          //***DURATION IN TERMS OF QUARTERS!*** 
          // ^ Makes rhythmic pattern matching simpler
          /// divisions;
          currentNote.duration = 
            parseInt(child.findtext(".//duration")) / divisions;

          currentNote.noteType = "";
          child.findall(".//dot").forEach(() => currentNote.noteType += "dot ");
          currentNote.noteType += child.findtext(".//type");
         
          //***the note is constructed:
          symbol.notes.push(currentNote);

          if (child.findtext("[rest]"))
          {
            symbol.rest = true; 
          }
          else if (child.findtext("[pitch]"))
          { 
            const step = child.findtext(".//step");
            const accidentals = child.findall(".//accidental");
            const octave = child.findtext(".//octave");
            let noteString = step;
            
            accidentals.forEach((accidental) => 
            {
              if (accidental.text === "flat")
              {
                noteString += "b";
              }
              else if (accidental.text === "sharp")
              {
                noteString += "#";
              }
            });

            noteString += octave;
            currentNote.pitch = noteString;
          }

          //chord stuff------------------------------------------         
          //if it's a chord we don't want to double count duration
          //single voice chord case:
          if (child.findtext("[chord]")) 
          {
            const lastIndex = beatMap.length - 1;
            beatMap[lastIndex].notes.push(symbol.notes[0]);             
          } 
          //two voice chord case:
          else
          {
            const indexOfExistingBeat = beatMap.findIndex((oldSymbol) =>
                                        oldSymbol.beat === currentBeat);
            if (indexOfExistingBeat !== -1)
            {
              beatMap[indexOfExistingBeat].notes.push(symbol.notes[0]);
            }
            else //new beat 
            {
              beatMap.push(symbol);
            }

            currentBeat += parseInt(child.findtext(".//duration"));
          }
        }
        else if (child.tag === "backup")
        {
          currentBeat -= parseInt(child.findtext(".//duration"));
        }
        else if (child.tag === "forward")
        {
          currentBeat += parseInt(child.findtext(".//duration"));
        } 
      });

      return beatMap;
    });
  });
  //-------------------------------------------allPartsBeatMap

  //keyMap
  //{"Flute": [{"measureNum": 23, "key": "Bb"}],...}
  partIndex = -1;
  const keyMap = {};

  etree.findall(".//part").forEach((part) =>
  {
    partIndex++;
    const partName = partNames[partIndex];
    keyMap[partName] = [];

    let measureNum = 0;
    part.findall(".//measure").forEach((measure) =>
    {
      measureNum++;
      const fifths = measure.findtext(".//fifths");

      if (fifths !== undefined)
      {
        const obj = {};
        obj.key = Concertmaster.fifthsToKey(fifths);
        obj.measureNum = measureNum;
        keyMap[partName].push(obj);
      }
    });
  });
  
  return createIterator(allPartsBeatMap, keyMap);
};

module.exports = constructor;

