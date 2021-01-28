class NoteRecognizer
{
    audioAnalyzer = null;
    audioStream = null;
    audioSource = null;
    bufferLength = null;
    sampleRate = null;

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

    decibelSum = 0;
    decibelCount = 0;

    letters = [];
    octaves = [];

    timer = 200;
    delay = 10;
    times = 0;

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

            var thisFrequency = (frequencyFraction / recognizer.bufferLength) * (recognizer.sampleRate / 2);
            recognizer.frequencies.push(thisFrequency);

            recognizer.decibelSum += max;
            recognizer.decibelCount++;

            var thisLetter = recognizer.noteFromFrequency(thisFrequency);
            var thisOctave = recognizer.octaveFromFrequency(thisFrequency);

            recognizer.letters.push(thisLetter);
            recognizer.octaves.push(thisOctave);

            if (recognizer.delay * recognizer.times >= recognizer.timer)
            {
                var meanDecibels = recognizer.decibelSum / recognizer.decibelCount;

                if (meanDecibels > -55)
                {
                    var modeLetter = recognizer.mode(recognizer.letters);
                    var modeOctave = recognizer.mode(recognizer.octaves);

                    const note = new recognizer.MusicNote(modeLetter, modeOctave, false);
                    recognizer.musicNotes.push(note);
                }
                else
                {
                    const note = new recognizer.MusicNote("", "", true);
                    recognizer.musicNotes.push(note);
                }

                recognizer.frequencies = [];
                recognizer.decibelSum = 0;
                recognizer.decibelCount = 0;
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
            var x = this.colesEquation(frequency);
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
            var x = this.colesEquation(frequency);
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

    mode(array)
    {
        if(array.length == 0)
        {
            return null;
        }

        var modeMap = {};
        var maxEl = array[0], maxCount = 1;

        for(var i = 0; i < array.length; i++)
        {
            var el = array[i];

            if(modeMap[el] == null)
            {
                modeMap[el] = 1;
            }
            else
            {
                modeMap[el]++;
            }

            if(modeMap[el] > maxCount)
            {
                maxEl = el;
                maxCount = modeMap[el];
            }
        }

        return maxEl;
    }

    mean(array)
    {
        var sum = 0;

        for (var index in array)
        {
            sum += array[index];
        }

        return sum / array.length;
    }

    largestNum(array)
    {
        var max = array[0];
        var index = 0;

        for (var i in array)
        {
            if (array[i] > max)
            {
                index = i;
                max = array[i];
            }
        }

        var result = { max: max, index: index };
        return result;
    }
}