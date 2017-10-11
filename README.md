# musicxml-iterator
This module aims to make melodic, harmonic, and rhythmic analysis easier by abstracting away the necessity of parsing MusicXML in the form of an Iterator. Demo coming soon!

```javascript
const Iterator = require("musicxmliterator");
const i = Iterator(musicXML); //create an Iterator instance from a MusicXML string
i.selectInstrument("Guitar");
i.next();
```

## Installation
```
npm install musicxml-iterator
```

## Supported functions

### selectInstrument(instrumentName)
The iterator is set to the first measure of the instrument part specified by instrumentName (ex: "Violin")
Throws an exception if no instrument of instrumentName is found. Use getInstrumentNames() to be safe.

### getInstrumentNames()
gets the names of the instruments in the score (returns as an array)

### next()
The iterator moves to the next "symbol" (note(s) or rest) and returns an object to represent that symbol, for example:
    
```javascript
{notes: [{duration: 1, noteType: "quarter", pitch: "B3"},
         {duration: 1, noteType: "quarter", pitch: "D4"}],
 beat: 3};
```

So the next thing that the player sees to play in the above example is a B3 and D4, both quarter notes, hit on the downbeat of beat 3.

### nextMeasure()
The iterator moves to the first beat of the next measure, throws an exception if no next measure

### prevMeasure()
The iterator moves to the first beat of the previous measure, throws an exception if no previous measure

### hasNext()
Returns true or false depending on whether or not there is a next symbol. 
***Use this to avoid an exception being thrown by .nextMeasure().***

### prev()
The iterator moves to the previous symbol be it a note or rest and returns an object to represent that symbol

### hasPrev()
Returns true or false depending on whether or not there is a previous symbol.
***Use this to avoid an exception being thrown by .prevMeasure().***

### getMeasureNum()
Returns the measure number currently at

### getNumberOfMeasures()
Returns the number of measures

### setMeasureNum()
Sets the iterator to the measure number specified. An exception will be thrown if attempting to set to an invalid measure number. The first measure is measure #1

