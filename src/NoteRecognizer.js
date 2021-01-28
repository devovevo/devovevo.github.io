class NoteRecognizer
{
    audioAnalyzer = null;
    audioStream = null;
    audioSource = null;
    bufferLength = null;
    sampleRate = null;

    MusicNote = class
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

    musicNotes = [];
    recognizing = false;

    bpm = 0;

    constructor()
    {
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
        }
    }

    async getAudioStream()
    {
        var recognizer = this;
        var constraints = 
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

        recognizer.audioStream = await recognizer.getMediaStream(constraints);
        
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

    frequencies = [];
    timer = 200;
    delay = 2;
    times = 0;

    async recognizeNotes()
    {
        var recognizer = this;
        var dataArray = new Float32Array(this.bufferLength);

        if (recognizer.recognizing == true)
        {
            recognizer.times++;

            recognizer.audioAnalyzer.getFloatFrequencyData(dataArray);
            var max = dataArray[0];
            var frequencyFraction = 0;

            for (var i = 0; i < dataArray.length; i++)
            {
                if (dataArray[i] > max)
                {
                    max = dataArray[i];
                    frequencyFraction = i;
                }
            }

            var thisFrequency = (frequencyFraction / recognizer.bufferLength) * (recognizer.sampleRate / 2);
            recognizer.frequencies.push(thisFrequency);

            if (recognizer.delay * recognizer.times >= recognizer.timer)
            {
                if (max > -55)
                {
                    var letters = [];
                    var octaves = [];

                    for (var i = 0; i < recognizer.frequencies.length; i++)
                    {
                        var thisLetter = recognizer.noteFromFrequency(recognizer.frequencies[i]);
                        letters.push(thisLetter);

                        var thisOctave = recognizer.octaveFromFrequency(recognizer.frequencies[i]);
                        octaves.push(thisOctave);
                    }

                    var letter = recognizer.findMode(letters);
                    var octave = recognizer.findMode(octaves);

                    const note = new recognizer.MusicNote(letter, octave, true);
                    recognizer.musicNotes.push(note);
                }
                else
                {
                    const note = new recognizer.MusicNote("", "", false);
                    recognizer.musicNotes.push(note);
                }

                recognizer.frequencies = [];
                recognizer.times = 0;
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

    listNote = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];

    noteFromFrequency(frequency)
    {
        try
        {
            var x = colesEquation(frequency);
            var rounded = Math.round(x);

            var note = rounded % 12;
            return this.listNote[note];
        }
        catch (err)
        {
        }
    }

    
    octaveList = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

    octaveFromFrequency(frequency)
    {
        try
        {
            var x = colesEquation(frequency);
            var rounded = Math.round(x);

            var inter = rounded / 12;
            var octave = Math.floor(inter);

            return this.octaveList[octave];
        }
        catch (err)
        {
        }
    }

    colesEquation(frequency)
    {
        return 17.31301939 * Math.log(0.06116207 * frequency);
    }

    findMode(arr) 
    {
        return arr.reduce(function(current, item) {
            var val = current.numMapping[item] = (current.numMapping[item] || 0) + 1;
            if (val > current.greatestFreq) {
                current.greatestFreq = val;
                current.mode = item;
            }
            return current;
        }, {mode: null, greatestFreq: -Infinity, numMapping: {}}).mode;
    }
}