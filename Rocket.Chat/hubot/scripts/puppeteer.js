puppeteer = require('puppeteer');

/**
 * 指定したURlのページのタイトルを取得する.
 *
 * @param {String} url
 * @return 指定したページのタイトル
 */
const getTitle = async url => {
  console.log('処理開始');

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const pages = await browser.pages();
  const page = pages[0];
  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 100000 // = 100sec
  });

  const title = await page.title();
  await browser.close();
  console.log('ページのタイトル = ' + title);
  return title;
};

module.exports = (robot) => {
  robot.respond(/puppeteer(?: (\S+))?/i, msg => {
    const url = msg.match[1];

    getTitle(url).then(title => {
      msg.send('[' + url + '] のタイトルは、「' + title + '」です！');
    });
  });
}


