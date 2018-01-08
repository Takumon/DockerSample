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

const rocketChatUrl = 'http://' + address + ':' + port;

/**
 * 指定したアカウントでRocket.Chatにログインしアカウント画面のクリーンキャプチャーを取得する.
 *
 * @param {String} userId Rocket.ChatのユーザID
 * @param {String} password Rocket.Chatのパスワード
 * @return 指定したアカウントのRocket.Chatアカウント画面スクリーンキャプチャー
 */
const getNekoProfileOfRocketChat = async (userId, password) => {
  console.log('処理開始');

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const pages = await browser.pages();
  const page = pages[0];
  await page.goto(rocketChatUrl, {
    waitUntil: 'networkidle0',
    timeout: 100000 // = 100sec
  });

  // ユーザ名とパスワードを入力
  const $userName = await page.$('#emailOrUsername');
  const $password = await page.$('#pass');
  await $userName.type(userId);
  await $password.type(password);

  // ログイン
  const $loginBtn = await page.$('button.login');
  await $loginBtn.click();

  // 画面遷移待ち
  await page.waitFor('.sidebar__account-label');

  // アカウント画面に遷移
  const $accountLabel = await page.$('.sidebar__account-label');
  await $accountLabel.click();
  const $accountPopoverItem = await page.$('.rc-popover__item[data-id="account"]');
  await $accountPopoverItem.click()

  // 画面遷移待ち
  await page.waitFor(1000);

  // スクリーンキャプチャ取得
  const imageBuffer = await page.screenshot({
    fullPage: true
  });

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
  robot.respond(/page sample/i, msg => {

    getNekoProfileOfRocketChat('neko', 'neko').then(imageBase64 => {
      postCapture(msg, imageBase64);
    });
  });
}


