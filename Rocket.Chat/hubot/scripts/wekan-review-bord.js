// Description:
//   GitBucketでレビュー関連のコメントをした時にBotに呟く、またWekanにタスクを登録する。
//
// Dependencies:
//   "request-promise"
//
// Configuration:
//   1. GitBucketでWebhookをJSON形式のissue commentとして設定
//   2. Wekanにボードを作成しレビュアーとレビュイーのリストとCloseリストを作成
//
// Commands:
//   None
//
// URLs:
//   POST /hubot/gitbucket/manage-review-task
const rp = require('request-promise');
const Log = require('log');
const logger = new Log(process.env.HUBOT_LOG_LEVEL || 'info');


/** Botで呟く時のチャンネルの名前 */
const BOT_ROOM_NAME = 'hubot';

/** Wekanの情報 */
const WEKAN = {
  protocol: 'http',
  host: '192.168.1.5',
  port: '10085',
  get rootUrl() {
    return `${WEKAN.protocol}://${WEKAN.host}:${WEKAN.port}`;
  }
};


/** GitBucketの情報 */
const GITBUCKET = {
  protocol: 'http',
  commentUserName: 'jenkins',
  commentUserPassword: 'jenkins',
  host: '192.168.1.5',
  port: '8080',
  prefix: 'gitbucket',

  get rootUrl() {
    return `${GITBUCKET.protocol}://${GITBUCKET.commentUserName}:${GITBUCKET.commentUserPassword}@${GITBUCKET.host}:${GITBUCKET.port}/${GITBUCKET.prefix}`;
  }
};


// GitBucketのリポジトリ名とWekanのボード名
const WEKAN_INFO = {
  'SampleGroup/SampleProject': {
    boardName: 'レビューステータス_sample-project',
    admin: {
      id: 'inoue',
      pass: 'password'
    },
    member: [
      {
        gitbucketUserName: 'inoue',
        gitbucketNickName: '井上',
        wekanListName: '井上',
        wekanUserName: 'inoue',
      },
      {
        gitbucketUserName: 'suzuki',
        gitbucketNickName: '鈴木',
        wekanListName: '鈴木',
        wekanUserName: 'suzuki',
      },
      {
        gitbucketUserName: 'saito',
        gitbucketNickName: '斎藤',
        wekanListName: '斎藤',
        wekanUserName: 'saito',
      }
    ]
  }
};




/** コメントパターン：新規レビュー依頼 */
const REVIEW_REQUEST_COMMENT_PATTERN = /^(.+)さんレビューお願いします/;

// コメントパターン：レビュー修正依頼
// チケット移動（コメントした人からXXXさん）
// ラベル変更（（「レビュー）」→「（レビュー修正）」）
// コメント追加（GitBucketのコメントそのまま,コメント起票者 コメントした人）

/** コメントパターン：レビュー修正依頼 */
const REVISION_REQIEST_COMMENT_PATTERN = /^(.+)さんレビューしました/;

// 再レビュー依頼
// チケット移動（コメントした人から、XXXさん）
// ラベル変更（「（レビュー修正）」→「（レビュー）」）
// コメント追加（GitBucketのコメントそのままコメント起票者コメントした人）

/** コメントパターン：再レビュー依頼 */
const RE_REVIEW_RREQUEST_COMMENT_PATTERN = /^(.+)さん再度レビューお願いします/;

// レビュー完了（指摘なし）
// チケット移動（コメントした人からCLOSEリスト）
// コメント追加（GitBucketのコメントそのままコメント起票者 コメントした人）

/** コメントパターン：レビュー完了 */
const REVIEW_COMPLETION_COMMENT_PATTERN = /^(.+)さんレビュー完了です/;


/**
 * 指定したプルリクのブランチを取得する
 *
 * @param {string} owner リポジトリの所有者または所有グループ
 * @param {string} repository リポジトリ名
 * @param {string} pullRequestNumber プルリク番号
 */
function getPullRequestBranch(owner, repository, pullRequestNumber) {
  const url = `${GITBUCKET.rootUrl}/api/v3/repos/${owner}/${repository}/pulls/${pullRequestNumber}`;

  return rp({
    method: 'GET',
    uri: url,
    json: true
  })
  .then( res => res.head.ref);
}


/**
 * 指定された引数をもとにレビュー依頼文を作成する
 *
 * @param {Object} param
 * @param {string} param.repositoryFullName リポジトリのOwner/repository形式の名前
 * @param {string} param.repositoryLink リポジトリへのリング
 * @param {string} param.reviewerNickName レビュー依頼した人の通称
 * @param {string} param.revieweeNickName レビューする人の通称
 * @param {string} param.pullRequestNumber プルリク番号
 * @param {string} param.pullRequestLink プルリクへのリンク
 * @param {string} param.comment コメント
 */
function createBotComment({
  repositoryFullName,
  repositoryLink,
  reviewerNickName,
  revieweeNickName,
  pullRequestNumber,
  pullRequestLink,
  comment}) {

  let formatted = [];
  formatted.push(`#### レビュー依頼`);
  formatted.push(`リポジトリ: [${repositoryFullName}](${repositoryLink})`);
  formatted.push(`プルリク: [${pullRequestNumber}](${pullRequestLink})`);
  formatted.push(`\`${revieweeNickName}\`が\`${reviewerNickName}\`にレビュー依頼`);
  formatted.push(`##### コメント`);
  formatted.push(`${comment}`);

  return formatted.join('\n');
}



/**
 * wekanにログインしてトークンを取得する.
 *
 * @param {*} username wekanのユーザ名
 * @param {*} password wekanのパスワード
 */
function loginToWekanAndGetToken(username, password) {
  const loginUrl = `${WEKAN.rootUrl}/users/login`;

  return rp({
    uri: loginUrl,
    method: 'POST',
    body: { username, password },
    json: true
  });
}

/**
 * wekanのユーザ一覧を取得する.
 *
 * @param {string} token wekanのトークン
 */
function getUsers(token) {
  const url = `${WEKAN.rootUrl}/api/users`;

  return rp({
    uri: url,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  });
}

/**
 * 指定したユーザに紐づくボードを取得する.
 *
 * @param {string} token wekanのトークン
 * @param {string} userId ユーザID
 */
function getBoards(token, userId) {
  const url = `${WEKAN.rootUrl}/api/users/${userId}/boards`;

  return rp({
    uri: url,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  });
}

/**
 * 指定したボードに紐づくリストを取得する.
 *
 * @param {string} token トークン
 * @param {string} boardId ボードID
 */
function getLists(token, boardId) {
  const url = `${WEKAN.rootUrl}/api/boards/${boardId}/lists`;

  return rp({
    uri: url,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  });
}


/**
 * カードを登録する.
 *
 * @param {Object} param
 * @param {string} param.token wekanのトークン
 * @param {string} param.boardId ボードID
 * @param {string} param.listId リストID
 * @param {string} param.authorId カードを登録する人のID
 * @param {string} param.title カードタイトル
 */
function registerCard({token, boardId, listId, authorId, title}) {
  const loginUrl = `${WEKAN.rootUrl}/api/boards/${boardId}/lists/${listId}/cards`;

  const options = {
    uri: loginUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type' : 'application/json'
    },
    body: { title, authorId },
    json: true
  };

  return rp(options);
}



const createCardComment = (wekanInfo, token, boardId, listId, cardId, authorId, comment) => {
  const loginUrl = `${WEKAN.rootUrl}/api/boards/${boardId}/cards/${cardId}/comments`;

  const options = {
    uri: loginUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type' : 'application/json'
    },
    body: { comment, authorId },
    json: true
  };

  logger.debug(options);
  return rp(options);
};

/**
 * Wekanでレビュー依頼チケットを作成する.
 *
 * @param {Object} param
 * @param {string} param.repositoryFullName
 * @param {tring} param.reviewerNickName
 * @param {tring} param.revieweeNickName
 * @param {tring} param.pullRequestTitle
 * @param {tring} param.botComment
 */
async function createCard({
  repositoryFullName,
  reviewerNickName,
  revieweeNickName,
  pullRequestTitle,
  botComment}) {

  const wekanInfo = WEKAN_INFO[repositoryFullName];
  const boardName = wekanInfo.boardName;

  try {

    // ログイン
    const {id: userId, token} = await loginToWekanAndGetToken(wekanInfo.admin.id, wekanInfo.admin.pass);

    // ユーザ取得
    const users = await getUsers(token);

    // ボード取得
    const boards = await getBoards(token, userId);

    // ボードの存在チェック
    if (boards.length === 0
      || boards.filter(b => b.title === boardName).length === 0) {
      logger.error(`ボード[${boardName}]が存在しません。`);
      return;
    }
    const boardId = boards.filter(b => b.title === boardName)[0]._id;

    // リスト取得
    const lists = await getLists(token, boardId);

    // リストの存在チェック
    const listTitle = wekanInfo.member.filter(m => m.gitbucketNickName === reviewerNickName)[0].wekanListName;
    if (lists.length === 0
      || lists.filter(b => b.title === listTitle).length === 0) {
      logger.error(`ボード[${boardName}]にリスト[${listTitle}]が存在しません。`);
      return;
    }
    const listId = lists.filter(b => b.title === listTitle)[0]._id;

    // レビュー依頼した人の情報を取得
    const revieweeName = wekanInfo.member.filter(m => m.gitbucketNickName === revieweeNickName)[0].wekanUserName;
    const revieweeId = users.filter(u => u.username === revieweeName)[0]._id;

    // カード登録
    const {_id: cardId} = await registerCard({
      token,
      boardId,
      listId,
      authorId: revieweeId,
      title: `レビュー:\`${pullRequestTitle}\``
    });

    // カードにコメント追加
    await createCardComment(wekanInfo, token, boardId, listId, cardId, revieweeId, botComment)
    logger.debug('コメント登録成功');

  } catch (err) {
    logger.error('コメント登録失敗');
    logger.error(err);
  }
}

/**
 * 指定したコメントをBotに呟く.
 *
 * @param {Robot} robot Botオブジェクト.
 * @param {string} comment コメント文.
 */
function addCommentToChat(robot, comment) {
  const envelope = {};
  envelope.user = {};
  envelope.user.room = envelope.room = BOT_ROOM_NAME;
  envelope.user.type = 'groupchat';

  robot.send(envelope, comment);
}


module.exports = (robot) => {
  robot.router.post('/hubot/gitbucket/manage-review-task', (req, response) => {
    logger.info('処理開始');

    if (!req.body.comment
      || !req.body.comment.body
      || !req.body.issue
      || !req.body.issue.number) {

      logger.info('処理対象外コメントです。');
      response.end('Out of target.');
      return;
    }

    const comment = req.body.comment.body;
    const commenter = req.body.comment.user.login;
    const pullRequestLink = req.body.comment.html_url;
    const repositoryFullName = req.body.repository.full_name;
    const repositoryLink = req.body.repository.html_url;
    const pullRequestNumber = req.body.issue.number;
    const pullRequestTitle = req.body.issue.title;

    const wekanInfo = WEKAN_INFO[repositoryFullName];

    if(REVIEW_REQUEST_COMMENT_PATTERN.test(comment)) {
      logger.info('処理対象のコメント：レビュー依頼');

      // コメントに正しくレビュアーの通称を指定しているかチェック
      const reviewerNickName = comment.match(REVIEW_REQUEST_COMMENT_PATTERN)[1];
      if (wekanInfo.member.filter(m => m.gitbucketNickName === reviewerNickName).length === 0) {
        logger.error('レビュアーの指定(' + reviewerNickName + ')が正しくありません。レビュアーには' + wekanInfo.member.map(m => m.gitbucketNickName) + 'のいずれかを指定してください');
        response.end('NG');
        return;
      }

      const revieweeNickName = wekanInfo.member.filter(m => m.gitbucketUserName === commenter)[0].gitbucketNickName;

      const botComment = createBotComment({
        repositoryFullName,
        repositoryLink,
        reviewerNickName,
        revieweeNickName,
        pullRequestNumber,
        pullRequestLink,
        comment
      });
      addCommentToChat(robot, botComment);

      createCard({
        repositoryFullName,
        reviewerNickName,
        revieweeNickName,
        pullRequestTitle,
        botComment
      });
      response.end('OK');
    } else {
      logger.info('処理対象外コメントです。');
      response.end('Out of target.');
      return;
    }
  });
};