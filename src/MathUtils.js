function largestNum(array)
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

function mode(array)
{
    if(array.length == 0)
    {
        return null;
    }

    var arrayIndexCount = {};
    var modeElement = array[0], modeCount = 1;

    for(var i = 0; i < array.length; i++)
    {
        var currentElement = array[i];

        if(arrayIndexCount[currentElement] == null)
        {
            arrayIndexCount[currentElement] = 1;
        }
        else
        {
            arrayIndexCount[currentElement]++;
        }

        if(arrayIndexCount[currentElement] > modeCount)
        {
            modeElement = currentElement;
            modeCount = arrayIndexCount[currentElement];
        }
    }

    var result = {
        count: modeCount,
        element: modeElement
    };

    return result;
}