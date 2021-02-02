class NoteRecognizer
{
    audioAnalyzer = null;
    audioStream = null;
    audioSource = null;
    bufferLength = null;
    sampleRate = null;

    musicNotes = [];
    recognizing = false;

    frequencies = [];

    decibelSum = 0;
    decibelCount = 0;

    letters = [];
    octaves = [];

    timer = 200;
    delay = 50;
    times = 0;

    octaveList = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 ];
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

    minimumDecibels = -50;
    minimumNoteProportion = 0.999;

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

        this.delay = eigthNoteTime;
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

            if (max > this.minimumDecibels)
            {
                recognizer.letters.push(thisLetter);
                recognizer.octaves.push(thisOctave);
            }

            if (recognizer.delay * recognizer.times >= recognizer.timer)
            {
                var meanDecibels = recognizer.decibelSum / recognizer.decibelCount;
                var note = null;

                var modeLetter = recognizer.mode(recognizer.letters);
                var modeOctave = recognizer.mode(recognizer.octaves);

                var minimumNotes = recognizer.minimumNoteProportion * recognizer.letters.length;

                if (meanDecibels > recognizer.minimumDecibels && modeLetter.count > minimumNotes)
                {
                    note = new recognizer.MusicNote(modeLetter.element, modeOctave.element, false);
                    recognizer.musicNotes.push(note);
                }
                else
                {
                    note = new recognizer.MusicNote("", "", true);
                    recognizer.musicNotes.push(note);
                }

                if (this.drawing)
                {
                    recognizer.draw(note);
                }

                recognizer.frequencies = [];
                recognizer.decibelSum = 0;
                recognizer.decibelCount = 0;
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
            return null;
        }
    }

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
            return null;
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

        var result = {
            count: maxCount,
            element: maxEl
        };

        return result;
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

        if (note.blank == true || note.note == null)
        {
            this.canvas2dContext.fillText("--", this.x * this.xSpacing + this.xOffset, this.y * this.ySpacing + this.yOffset);
        }
        else 
        {
            this.canvas2dContext.fillText(note.note + note.octave, this.x * this.xSpacing + this.xOffset, this.y * this.ySpacing + this.yOffset);
        }

        this.x++;
    }
}