var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var parse = require('csv-parse');
var exec = require('child_process').exec;
var sprintf = require("sprintf-js").sprintf

validateParameters(argv);
run();

function run() {
    // Get card-independent input
    var inputPath = argv.input;
    var outputPath = argv.output;
    var width = argv.width;
    var height = argv.height;
    var padding = argv.padding || 0;
    var bkgColor = argv['bkg-color'] || '#ffffff';
    var bkgImg = argv['bkg-img'] || null;

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
        var numSuccess = 0;
        var numDigits = numTotal.toString().length;
        for (var i = 1; i < output.length; i++) {
            var text = output[i][0];
            var fontSize = output[i][1];
            var filename = createFilename(i, numDigits);

            // Do the actual image generation
            makeImage(text, fontSize, imWidth, imHeight, padding, bkgColor, bkgImg, outputPath, filename, function(err) {
                numComplete++;
                if (err) {
                    console.error(err);
                } else {
                    numSuccess++;
                    console.log(numComplete + '/' + numTotal);
                    if (numComplete == numTotal) {
                        console.log('Done! Completed ' + numSuccess + '/' + numTotal + ' successfully.');
                        console.log('Card images are located in ' + outputPath);
                    }
                }
            });
        }
    });


}

function makeImage(text, fontSize, width, height, padding, bkgColor, bkgImg, outputPath, filename, callback) {
    // Create the proper shell command, depending on whether we're using a background image or background color
    var command = "";
    if (bkgImg != null) {
        command = sprintf('convert -background "#0000" -pointsize %s -gravity Center -size %sx%s caption:"%s" %s +swap -gravity Center -composite %s',
            fontSize,
            width,
            height,
            text,
            bkgImg,
            outputPath + filename
        );
    } else {
        var command = sprintf('convert -background "%s" -pointsize %s -gravity Center -size %sx%s -border %sx%s -bordercolor "%s" caption:"%s" %s',
            bkgColor,
            fontSize,
            width,
            height,
            padding,
            padding,
            bkgColor,
            text,
            outputPath + filename
        );
    }
    exec(command, function(err, stdout, stderr) {
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
    if (args.help || (Object.keys(args).length == 1 && args._.length == 0)) {
        console.log('Required Parameters:');
        console.log('\t--input: The path to your input file.');
        console.log('\t--output: The path of the directory where your cards will be saved.');
        console.log('\t--width: The desired width of your card.');
        console.log('\t--height: The desired height of your card.');
        console.log('');
        console.log('Optional Parameters:');
        console.log('\t--padding: The padding around your card. The width and height will not be affected. Defaults to 0.');
        console.log('\t--bkg-color: The background color of the card as a hex string, wrapped in quotes (e.g. \'#ff0000\'). Defaults to white.');
        console.log('\t--bkg-img: The background image to the text over. If specified, the --bkg-color value will not be used.');
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

    // Make sure the bkg image can be read (if it was set)
    var bkgImg = args['bkg-img'];
    if (bkgImg != null) {
        try {
            fs.accessSync(bkgImg, fs.R_OK);
        } catch(e) {
            console.error('The background image either doesn\'t exist or cannot be read.');
            process.exit();
        }
    }
}
