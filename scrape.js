const readline = require('readline');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const util = require('util');

const mkdir = util.promisify(fs.mkdir);

const filePath = 'scraped_data.txt'; 

function readLinesFromFile(filePath) {
  return new Promise((resolve, reject) => {
    const splitLines = [];

    const readInterface = readline.createInterface({
      input: fs.createReadStream(filePath),
      console: false
    });

    readInterface.on('line', function(line) {
      const splitLine = line.split(';');
      var url = "https://freewebnovel.com" + splitLine[1];
      splitLines.push(url);
    });

    readInterface.on('close', function() {
      resolve(splitLines);
    });

    readInterface.on('error', function(err) {
      reject(err);
    });
  });
}

const scrapeData = (html) => {
  const $ = cheerio.load(html);
  const titleElement = $('.top .chapter');
  const title = titleElement.text();

  const textElement = $('.txt');
  let text = textElement.text();

  // Clean up window.pubfuturetag code
  const regex = /window\.pubfuturetag\s*=\s*window\.pubfuturetag\s*\|\|\s*\[\];window\.pubfuturetag\.push\(\{[^}]+\}\)/g;
  text = text.replace(regex, '');

  return { title, text };
};


const scrapePage = (url) => {
  return new Promise((resolve, reject) => {
    axios.get(url)
      .then(response => {
        const html = response.data;
        const results = scrapeData(html);
        resolve(results);
      })
      .catch(error => {
        reject(error);
      });
  });
};


async function processArray(lines) {

  const dataFolderPath = './data';

  try {
    // Check if "data" folder exists
    if (!fs.existsSync(dataFolderPath)) {
      // Create "data" folder if it doesn't exist
      await mkdir(dataFolderPath);
      console.log('Created "data" folder');
    }
  } catch (error) {
    console.error('Error occurred while checking/creating "data" folder:', error);
    return; // Stop further processing if there's an error
  }



  let counter = 1;
  const totalRuns = 3;
  const linesPerRun = Math.ceil(lines.length / totalRuns);

  const runPromises = [];
  for (let i = 0; i < totalRuns; i++) {
    const startIdx = i * linesPerRun;
    const endIdx = (i + 1) * linesPerRun;
    const linesSubset = lines.slice(startIdx, endIdx);

    runPromises.push(processLinesSubset(linesSubset, counter));
    counter += linesSubset.length;
  }

  await Promise.all(runPromises);
}

async function processLinesSubset(lines, startingNumber) {

  let dataFolderPath = './data';
  
  let counter = startingNumber;
  for (const line of lines) {
    try {
      const dataString = await scrapePage(line);
      const title = dataString.title;
      const text = dataString.text;

      const paddedNumber = String(counter).padStart(5, '0');
      const safeFilename = `${dataFolderPath}/${paddedNumber}_${sanitizeFilename(title)}.txt`;

      const dataOutput = `${title}\n\n${text}\n`;
      writeToFile(dataOutput, safeFilename);
      console.log(`write ${title} and number ${counter}`)
      counter++;
    } catch (error) {
      console.error('Error occurred while scraping page:', error);
    }

    // Add random delay between 1 and 5 seconds
    const delay = Math.floor(Math.random() * 2000) + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}


const writeToFile = (dataString, filename) => {
  fs.writeFile(filename, dataString, err => {
    if (err) {
      console.log(`Error appending to file: ${err} , ${filename}`);
    }
  });
};

const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

(async function() {
  try {
    const splitLines = await readLinesFromFile(filePath);
    await processArray(splitLines);
    console.log('Finished reading the file.');
  } catch (err) {
    console.error('Error occurred while reading the file:', err);
  }
})();
