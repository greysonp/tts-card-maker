var fs = require('fs');
var im = require('imagemagick');
var argv = require('minimist')(process.argv.slice(2));
var parse = require('csv-parse');

validateParameters(argv);
run();

function run() {
    // Get card-independent input
    var inputPath = argv.input;
    var outputPath = argv.output;
    var width = argv.width;
    var height = argv.height;
    var padding = argv.padding || 0;

    // If the output path doesn't end with a '/', add one
    if (outputPath.charAt(outputPath.length - 1) != '/') {
        outputPath += '/';
    }

    // Calculate new width, taking padding into consideration
    var imWidth = width - (2 * padding);
    var imHeight = height - (2 * padding);

    var inputText = fs.readFileSync(inputPath, 'utf8').toString();
    parse(inputText, {}, function(err, output) {
        // Error handline
        if (err) {
            console.error('Error!');
            console.error(err);
            process.exit();
        }
        if (output.length <= 1) {
            console.error('No data to process.');
            process.exit();
        }
        if (output[0].length > 2 || output[0][0] != 'text' || output[0][1] != 'fontSize') {
            console.error('Your CSV file is not in the correct format. You should have two columns: \'text\' and \'fontSize\', in that order.');
            process.exit();
        }

        var numTotal = output.length - 1;
        var numComplete = 0;
        var numDigits = numTotal.toString().length;
        for (var i = 1; i < output.length; i++) {
            var text = output[i][0];
            var fontSize = output[i][1];
            var filename = createFilename(i, numDigits);

            // Do the actual image generation
            makeImage(text, fontSize, imWidth, imHeight, padding, outputPath, filename, function(err) {
                if (err) {
                    console.error(err);
                } else {
                    numComplete++;
                    console.log(numComplete + '/' + numTotal);
                    if (numComplete == numTotal) {
                        console.log('Done! Completed ' + numComplete + '/' + numTotal + ' successfully.');
                        console.log('Card images are located in ' + outputPath);
                    }
                }
            });
        }
    });


}

function makeImage(text, fontSize, width, height, padding, outputPath, filename, callback) {
    im.convert([
        '-pointsize', fontSize,
        '-gravity', 'Center',
        '-size', width + 'x' + height,
        '-bordercolor', 'white',
        '-border', padding + 'x' + padding,
        'caption:' + text,
        outputPath + filename],
    function(err, stdout){
        callback(err);
    });
}

function createFilename(n, digits) {
    var numCurrentDigits = n.toString().length;
    var numZeroesNeeded = digits - numCurrentDigits;

    var numString = '';
    for (var i = 0; i < numZeroesNeeded; i++) {
        numString += '0';
    }
    return 'card-' + numString + n + '.jpg';
}

function validateParameters(args) {
    if (args.help) {
        console.log('Required Parameters:');
        console.log('\t--input: The path to your input file.');
        console.log('\t--output: The path of the directory where your cards will be saved.');
        console.log('\t--width: The desired width of your card.');
        console.log('\t--height: The desired height of your card.');
        console.log('');
        console.log('Optional Parameters:');
        console.log('\t--padding: The padding around your card. The width and height will not be affected. Defaults to 0.');
        process.exit();
    }

    // Validate input
    if (args.input == null) {
        console.error('You must supply the path to your input file via the --input parameter. Use --help for guidance.');
        process.exit();
    }
    if (args.output == null) {
        console.error('You must supply the path to your output directory via the --output parameter. Use --help for guidance.');
        process.exit();
    }
    if (args.width == null) {
        console.error('You must supply the desired width of your card via the --width parameter. Use --help for guidance.');
        process.exit();
    }
    if (args.width == null) {
        console.error('You must supply the desired height of your card via the --height parameter. Use --help for guidance.');
        process.exit();
    }

    // Make sure input file can be read
    var input = args.input;
    try {
        fs.accessSync(input, fs.R_OK);
    } catch(e) {
        console.error('The input file either doesn\'t exist or cannot be read.');
        process.exit();
    }

    // Make sure the output directory can be written to
    var output = args.output;
    try {
        fs.accessSync(output, fs.W_OK);
    } catch(e) {
        console.error('The output directory either doesn\'t exist or cannot be written to.');
        process.exit();
    }
    if (!fs.lstatSync(output).isDirectory()) {
        console.error('The output path must point to a directory, not a file.');
        process.exit();
    }
}
