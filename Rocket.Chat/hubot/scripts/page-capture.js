const puppeteer = require('puppeteer');
const request = require('request');

// TODO 環境によって変わる
// const address = '10.74.85.64';
const address = '192.168.1.5';
const port = '3001';
const baseUrl = 'http://' + address + ':' + port + '/api/v1';
const botusername = 'bot';
const botuserpw = 'bot';
const channel = '#hubot';


/**
 * 指定したURlのページのスクリーンキャプチャーを取得する.
 *
 * @param {String} url
 * @return 指定したページのスクリーンキャプチャーをbase64化したもの
 */
const getCapture = async url => {
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

  const imageBuffer = await page.screenshot({fullPage: true});
  await browser.close();
  const imageBase64 = imageBuffer.toString('base64');
  return imageBase64;
};

/**
 * 指定したBase46形式の画像をチャットに返信する.
 *
 * @param {} msg
 * @param { String } base64Image
 */
function postCapture(msg, base64Image) {
  const loginOptions = {
    url: baseUrl + '/login',
    headers: {
      'Content-type': 'application/json'
    },
    json: true,
    form: {
      username: botusername,
      password: botuserpw
    }
  };


  // ログインしてトークンを取得する
  request.post(loginOptions, (err, response, logindata) => {

    if (err || response.statusCode !== 200) {
      msg.send('err(get token)');
      return;
    }
    const token = logindata.data.authToken
    const userid = logindata.data.userId

    const postMessageOptions = {
      url: baseUrl + '/chat.postMessage',
      headers: {
        'X-Auth-Token': token,
        'X-User-Id': userid,
        'Content-type': 'application/json'
      },
      json: true,
      form: {
        channel: channel,
        attachments: [{
          title: 'キャプチャ画像',
          image_url: 'data:image/png;base64,' + base64Image
        }]
      }
    };

    request.post(postMessageOptions, (err, response, body) => {
      console.log('処理成功');
    });
  });
}

module.exports = (robot) => {
  robot.respond(/page capture(?: (\S+))?/i, msg => {
    const url = msg.match[1];

    getCapture(url).then(imageBase64 => {
      postCapture(msg, imageBase64);
    });
  });
}


