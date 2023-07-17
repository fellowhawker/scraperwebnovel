const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const fspromise = require('fs').promises;

const baseUrl = 'https://freewebnovel.com/extracting-billions-of-toxins-and-tempering-an-unsullied-body';
let limitpage = 24;
const delay = 1000;


const writeToFile = async (dataString) => {
  try {
    await fspromise.appendFile('scraped_data.txt', dataString);
  } catch (error) {
    console.log('Error appending to file:', error);
  }
};

const writeToFileReplace = async (dataString) => {
  try {
    await fspromise.writeFile('scraped_data.txt', dataString);
  } catch (error) {
    console.log('Error writing to file:', error);
  }
};

const parserData = (html) => {
  const $ = cheerio.load(html);
  const novels = $('.m-newest2 .ul-list5 li');
  const results = [];

  novels.each((index, element) => {
    const title = $(element).find('a').text();
    const link = $(element).find('a').attr('href');

    results.push({ title, link });
  });

  return results;
};

const scrapePage = async (pageNumber) => {
  const url = pageNumber === 1 ? baseUrl + ".html" : `${baseUrl}/${pageNumber}.html`;
  console.log(`write page number ${pageNumber}`);

  try {
    const response = await axios.get(url);
    const html = response.data;
    const results = parserData(html);

    const dataString = results
      .map(result => `${result.title};${result.link}\n`)
      .join("");

    if (pageNumber === 1) {
      writeToFileReplace(dataString);
    } else {
      writeToFile(dataString);
    }
  } catch (error) {
    console.log('Error:', error);
  }
};

const getLastPage = async (url) => {
  try {
    const response = await axios.get(url);
    const html = response.data;

    const $ = cheerio.load(html);
    const lastPageHref = $('.page a:last-child').attr('href');
    return lastPageHref.match(/\d+/)[0];
  } catch (error) {
    console.log('Error:', error);
    return null;
  }
};

const executeScraping = async () => {
  const urlpage = baseUrl + ".html";
  const limitpage = await getLastPage(urlpage);

  if (limitpage) {
    console.log(limitpage);
    
    for (let pageNumber = 1; pageNumber <= limitpage; pageNumber++) {
      let numbercont = delay * (pageNumber / 2)
      await new Promise(resolve => setTimeout(resolve, delay));
      await scrapePage(pageNumber);
    }
  }
};


executeScraping();