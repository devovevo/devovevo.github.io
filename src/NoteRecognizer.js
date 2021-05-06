class NoteRecognizer
{
    audioAnalyzer = null;
    audioStream = null;
    audioSource = null;
    bufferLength = null;
    sampleRate = null;

    musicNotes = [];
    recognizing = false;

    letters = [];
    octaves = [];

    timer = 200;
    delay = 50;
    times = 0;

    octaveList = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];
    listNote = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];

    canvas = null;
    canvas2dContext = null;

    drawing = false;

    x = 0;
    y = 0;

    xOffset = 20;
    yOffset = 20;

    xSpacing = 50;
    ySpacing = 30;

    width = 20;
    height = 20;

    count = 0;

    minimumDecibels = -48;
    minimumNoteProportion = 0.9;

    colesRelationFactor = 17.31301939;
    colesLogarithmicFactor = 0.06116207;

    audioInputConstraints = 
    {
        audio: {
            "mandatory": {
                "googEchoCancellation": "true",
                "googAutoGainControl": "true",
                "googNoiseSuppression": "true",
                "googHighpassFilter": "true"
            }
        }
    };

    MusicNote = class MusicNote
    {
        note = "";
        octave = "";
        blank = true;

        constructor(n, o, b)
        {
            this.note = n;
            this.octave = o;
            this.blank = b;
        }
    }

    constructor(canv)
    {
        this.canvas = canv;

        if (this.canvas != null)
        {
            this.canvas2dContext = this.canvas.getContext("2d");
            this.drawing = true;
        }
    }

    async getMediaStream(constraints) 
    {
        let stream = null;
    
        try 
        {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            return stream;
        } 
        catch(err) 
        {
            console.log("Error getting media stream");
            return null;
        }
    }

    setDelay(bpm)
    {
        var millisecondsPerBeat =  (1 / bpm) * 60 * 1000;
        var eigthNoteTime = millisecondsPerBeat / 2;
        //var halfNoteTime = millisecondsPerBeat;

        this.delay = eigthNoteTime * 2;
        //this.delay = halfNoteTime;
    }

    async getAudioStream()
    {
        var recognizer = this;
        recognizer.audioStream = await recognizer.getMediaStream(recognizer.audioInputConstraints);
        
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        recognizer.audioAnalyzer = audioContext.createAnalyser();

        recognizer.audioSource = audioContext.createMediaStreamSource(recognizer.audioStream);
        recognizer.audioSource.connect(recognizer.audioAnalyzer);

        recognizer.audioAnalyzer.fftSize = 32768;
        recognizer.bufferLength = recognizer.audioAnalyzer.frequencyBinCount;

        recognizer.sampleRate = audioContext.sampleRate;
    }

    async startRecognizingNotes()
    {
        this.recognizing = true;

        await this.recognizeNotes();
    }

    async recognizeNotes()
    {
        var recognizer = this;
        var dataArray = new Float32Array(this.bufferLength);

        if (recognizer.recognizing == true)
        {
            recognizer.times++;

            recognizer.audioAnalyzer.getFloatFrequencyData(dataArray);

            var largest = recognizer.largestNum(dataArray);
            var max = largest.max;
            var frequencyFraction = largest.index;

            if (max > this.minimumDecibels)
            {
                var thisFrequency = (frequencyFraction / recognizer.bufferLength) * (recognizer.sampleRate / 2);
                var thisNoteAndOctave = recognizer.noteAndOctaveFromFrequency(thisFrequency);
                      
                var thisLetter = thisNoteAndOctave.note;
                var thisOctave = thisNoteAndOctave.octave;

                recognizer.letters.push(thisLetter);
                recognizer.octaves.push(thisOctave);
            }

            if (recognizer.delay * recognizer.times >= recognizer.timer)
            {
                var note = null;

                try
                {
                    var modeLetter = mode(recognizer.letters);
                    var modeOctave = mode(recognizer.octaves);

                    var minimumNotes = recognizer.minimumNoteProportion * recognizer.letters.length;

                    if (modeLetter.count > minimumNotes)
                    {
                        note = new recognizer.MusicNote(modeLetter.element, modeOctave.element, false);
                    }
                    else
                    {
                        note = new recognizer.MusicNote("", "", true);
                    }
                }
                catch(err)
                {
                    note = new recognizer.MusicNote("", "", true);
                }

                recognizer.musicNotes.push(note);

                if (this.drawing)
                {
                    recognizer.draw(note);
                }

                recognizer.times = 0;

                recognizer.letters = [];
                recognizer.octaves = [];
            }

            window.setTimeout(function() {
                recognizer.recognizeNotes();
            }, recognizer.delay);
        }
    }


    stopRecognizingNotes()
    {
        this.recognizing = false;
    }

    noteAndOctaveFromFrequency(frequency)
    {
        try
        {
            var x = this.colesEquation(frequency);
            var rounded = Math.round(x);

            var returnedNote = rounded % 12;

            var inter = rounded / 12;
            var returnedOctave = Math.floor(inter);

            var returnedData = {
              note: this.noteList[returnedNote],
              octave: this.octaveList[returnedOctave],
            }
            
            return returnedData;
        }
        catch (err)
        {
            return null;
        }
    }

    colesEquation(frequency)
    {
        return colesRelationFactor * Math.log(colesLogarithmicFactor * frequency);
    }

    draw(note)
    {
        if (this.x * this.xSpacing + this.xOffset > this.canvas.width)
        {
            this.x = 0;
            this.y++;
        }

        if (this.y * this.ySpacing + this.yOffset > this.canvas.height)
        {
            this.x = 0;
            this.y = 0;

            this.canvas2dContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        if (note.blank == true || note.note == null || note.octave == null)
        {
            this.canvas2dContext.fillText("--", this.x * this.xSpacing + this.xOffset, this.y * this.ySpacing + this.yOffset);
        }
        else 
        {
            this.canvas2dContext.fillText(note.note + note.octave, this.x * this.xSpacing + this.xOffset, this.y * this.ySpacing + this.yOffset);
        }

        this.x++;
    }

    sheetMusicString()
    {
        var result = "";

        for (var i = 0; i < this.musicNotes.length; i++)
        {
            var note = this.musicNotes[i];

            if (note.blank == true || note.note == null || note.octave == null)
            {
                result += "-- ";
            }
            else
            {
                result += note.note + note.octave + " ";
            }
        }

        return result;
    }
}