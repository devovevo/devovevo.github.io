class NoteRecognizer
{
    audioAnalyzer = null;
    audioStream = null;

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

    delay = 200;
    timer = 2;
    times = 0;

    bpm = 0;

    constructor()
    {
    }

    async getAudioStream()
    {
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

        async function getMediaStream(constraints) 
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

        audioStream = await getMediaStream(constraints);
    }

    async 
}